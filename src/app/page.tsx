"use client";

import { useState } from "react";
import { SourceInput, PipelineConfig } from "@/components/SourceInput";
import { GenerationResult, GenerationOutput } from "@/components/GenerationResult";
import { PlanningDashboard } from "@/components/PlanningDashboard";
import { Network, FileText, CheckCircle2, Archive } from "lucide-react";

export default function Home() {
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [triageTopics, setTriageTopics] = useState<{ title: string; searchQuery: string }[] | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sourceContent, setSourceContent] = useState<string>("");
  const [sourceConfig, setSourceConfig] = useState<PipelineConfig | undefined>();

  const handleGenerate = async (content: string, config?: PipelineConfig) => {
    try {
      setSourceContent(content);
      setSourceConfig(config);
      setResults(null); 
      setTriageTopics(null);
      setErrorMsg(null);
      setIsTriaging(true);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, config }),
      });
      
      const data = await response.json();
      setIsTriaging(false);

      if (!response.ok) {
        setErrorMsg(data.error || "Failed to analyze topics");
        return;
      }
      
      if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
        setTriageTopics(data.topics);
      } else {
        throw new Error("Invalid format returned by Triage Agent");
      }
    } catch (err: unknown) {
      setIsTriaging(false);
      setErrorMsg(err instanceof Error ? err.message : "An unexpected network error occurred.");
    }
  };

  const handleProceedMaster = async (plan: { topic: string; targetArticleIds: string[] }[]) => {
    try {
      setTriageTopics(null); // hide dashboard
      setErrorMsg(null);
      setResults(null);
      setIsTriaging(true); // reuse loader

      const response = await fetch('/api/generate/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sourceContent, plan, config: sourceConfig }),
      });
      
      const data = await response.json();
      setIsTriaging(false);

      if (!response.ok) {
        setErrorMsg(data.error || "Failed to execute master plan");
        return;
      }
      
      setResults(data);
    } catch (err: unknown) {
      setIsTriaging(false);
      setErrorMsg(err instanceof Error ? err.message : "An unexpected network error occurred.");
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <section className="text-center space-y-4 max-w-2xl mx-auto mt-6 md:mt-12">
        <h2 className="text-4xl md:text-5xl font-outfit font-bold tracking-tight text-white mb-4">
          Transform raw notes into <br/><span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">structured knowledge</span>.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Instantly generate ready-to-publish KCS articles, detect duplicates against the Knowledge Base, and segregate complex topics.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 h-[750px] min-h-[600px]">
        {/* Left Side: Input Panel */}
        <div className="p-6 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10 shrink-0">
            <h3 className="font-outfit font-semibold text-xl tracking-wide">Source Material</h3>
            <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 py-1 px-3 rounded-full shadow-inner">
              Input
            </span>
          </div>
          
          <div className="flex-1 relative z-10 min-h-0">
            <SourceInput onSubmit={handleGenerate} />
          </div>
        </div>

        {/* Right Side: Output Panel */}
        <div className="p-6 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10 shrink-0 bg-black/50 border border-white/5 p-3 rounded-xl backdrop-blur-md">
            <h3 className="font-outfit font-semibold text-lg tracking-wide flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              AI Output
            </h3>
            <span className="text-[10px] uppercase tracking-widest font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 py-1 px-3 rounded-full shadow-inner">
              {results && results.length > 1 ? `${results.length} Results` : 'Result'}
            </span>
          </div>
          
          <div className="flex-1 min-h-0 relative z-10">
             {errorMsg ? (
               <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                 <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                   <h4 className="font-semibold mb-2">Generation Failed</h4>
                   <p className="text-sm">{errorMsg}</p>
                 </div>
               </div>
             ) : isTriaging ? (
               <div className="flex-1 flex flex-col items-center justify-center text-indigo-300 h-full animate-pulse gap-4">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="font-medium tracking-wide">Processing Pipeline...</p>
               </div>
             ) : triageTopics ? (
               <PlanningDashboard topics={triageTopics} onGenerate={handleProceedMaster} />
             ) : results && results.length > 0 ? (
               <div className="h-full overflow-y-auto pr-2 pb-4 flex flex-col gap-6 custom-scrollbar">
                 <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-inner">
                    <h4 className="text-xs uppercase tracking-wider text-indigo-300 font-semibold mb-6 flex items-center gap-2">
                      <Network size={14} /> Global N:N Architecture Flow
                    </h4>

                    <div className="flex items-stretch justify-between relative">
                       {/* Background Connecting Lines Map */}
                       <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                         <svg className="w-full h-full text-indigo-400" preserveAspectRatio="none">
                            {results.map((r, i) => (
                               <path key={i} d={`M 20,50 Q ${50 + (i*5)},${30 + (i*10)} 80,${20 + (i * ((80/(results.length || 1))))}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                            ))}
                         </svg>
                       </div>
                       
                       {/* Column 1: Inputs */}
                       <div className="flex flex-col gap-3 w-[45%] relative z-10">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Source Nodes</div>
                          
                          {/* Raw Source Node */}
                          <div className="bg-indigo-500/10 border border-indigo-500/30 p-2.5 rounded-lg flex items-center gap-2 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                              <FileText size={12} className="text-indigo-300"/>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-indigo-300/80 uppercase font-mono tracking-wider">Raw Material</div>
                              <div className="text-xs text-indigo-200 font-medium truncate">Provided Note/Chat</div>
                            </div>
                          </div>

                          {/* Merged Deprecated Nodes from ALL results */}
                          {results.flatMap(r => (r.consolidationPlan as Record<string, string[]>)?.articlesToArchive || []).map((archivedId, i) => (
                            <div key={`arch-${i}`} className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg flex items-center gap-2 shadow-sm">
                              <div className="w-6 h-6 rounded-full bg-rose-500/30 flex items-center justify-center shrink-0">
                                <Archive size={12} className="text-rose-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] text-rose-300/80 uppercase tracking-wider">Merged & Deprecated</div>
                                <div className="text-[10px] font-mono text-rose-200 truncate">{archivedId}</div>
                              </div>
                            </div>
                          ))}
                       </div>

                       {/* Spacer for lines */}
                       <div className="w-[10%]"></div>

                       {/* Column 2: Outputs */}
                       <div className="flex flex-col justify-center w-[45%] gap-3 pl-4 border-l border-white/5 relative z-10">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Resulting Master Nodes</div>
                          {results.map((res: Record<string, unknown>, i: number) => {
                             const merged = res.mergedDraft as Record<string, unknown>;
                             const title = (merged?.title || res.title || "Output") as string;
                             return (
                               <div key={`out-${i}`} className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg flex items-center gap-3 shadow-sm">
                                  <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={12} className="text-emerald-300"/>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Master Article</div>
                                    <div className="text-xs text-emerald-200 font-medium truncate break-words" title={title}>{title}</div>
                                  </div>
                               </div>
                             );
                          })}
                       </div>

                    </div>
                 </div>
                 
                 {/* Render Drafts */}
                 {results.map((result: Record<string, unknown>, idx: number) => {
                   const isMerged = !!result.mergedDraft;
                   // If it's a raw draft unmerged
                   const displayData = (isMerged ? result.mergedDraft : result) as Record<string, unknown>;
                   return (
                     <div key={idx} className="relative">
                       {results.length > 1 && (
                         <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/50 to-transparent rounded-full" />
                       )}
                       {/* We inject the consolidated wrapper back to GenerationResult if it exists, otherwise pass normal output */}
                       {isMerged ? (
                          // Workaround: GenerationResult doesn't directly accept `consolidatedData` prop out of the box natively, 
                          // but it builds it internally normally. We can just render the raw mergedDraft and attach its consolidationPlan.
                          // However, GenerationResult displays 'duplicateWarning' heavily. We'll strip that flag from finalized Master Drafts.
                          <GenerationResult result={{...displayData, duplicateWarning: false, searchContext: [], isMultiTopic: false} as unknown as GenerationOutput} sourceContent={sourceContent} />
                       ) : (
                          <GenerationResult result={{...displayData, duplicateWarning: false, searchContext: [], isMultiTopic: false} as unknown as GenerationOutput} sourceContent={sourceContent} />
                       )}
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 text-sm">
                 <div className="text-center max-w-[200px]">
                   Awaiting input to generate KCS structured intelligence.
                 </div>
               </div>
             )}
          </div>
        </div>
      </section>

    </div>
  );
}

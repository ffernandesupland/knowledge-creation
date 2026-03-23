"use client";

import { CheckCircle2, Copy, AlertTriangle, ExternalLink, GitBranch, Layers, Archive, FilePlus } from "lucide-react";
import { useState } from "react";

export type SearchContextArticle = {
  id: string;
  title: string;
  problem: string;
  resolution: string;
};

export type GenerationOutput = {
  title: string;
  problem: string;
  cause: string;
  resolution: string;
  confidence: number;
  duplicateWarning?: boolean;
  duplicateArticleId?: string | null;
  isMultiTopic?: boolean;
  suggestedTopics?: string[];
  searchContext?: { article: SearchContextArticle; similarity: number }[];
};

export function GenerationResult({ result, sourceContent, onSplit }: { result: GenerationOutput | null, sourceContent?: string, onSplit?: (topics: string[]) => void }) {
  const [isConsolidating, setIsConsolidating] = useState<boolean>(false);
  const [selectedForConsolidation, setSelectedForConsolidation] = useState<string[]>([]);
  
  const [consolidatedData, setConsolidatedData] = useState<{
    mergedDraft: GenerationOutput;
    needsSplit: boolean;
    splitReason?: string;
    consolidationPlan?: { 
      articlesToArchive: string[]; 
      articlesToCreate: string[]; 
      summarySteps: string[] 
    };
  } | null>(null);

  const displayResult = consolidatedData?.mergedDraft || result;

  const toggleSelection = (id: string) => {
    if (consolidatedData) setConsolidatedData(null);
    setSelectedForConsolidation(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConsolidate = async () => {
    if (selectedForConsolidation.length === 0) return;
    setIsConsolidating(true);
    try {
      const res = await fetch("/api/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceContent, draftResult: result, targetArticleIds: selectedForConsolidation })
      });
      if (res.ok) {
        const data = await res.json();
        setConsolidatedData(data);
        setSelectedForConsolidation([]); // clear selection
      }
    } catch(e) { console.error(e); }
    setIsConsolidating(false);
  };

  if (!displayResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 text-sm h-full">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-inner">
          <CheckCircle2 size={24} className="opacity-20" />
        </div>
        <p>Waiting for source material...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-2 custom-scrollbar">
      
      {consolidatedData && consolidatedData.needsSplit && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg text-sm flex flex-col gap-2 mb-2">
          <div className="flex items-center gap-2 font-bold text-red-400">
            <AlertTriangle size={18} /> Merge Rejected by AI
          </div>
          <p>{consolidatedData.splitReason}</p>
        </div>
      )}

      {consolidatedData && consolidatedData.consolidationPlan && !consolidatedData.needsSplit && (
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-xl p-5 mb-2 shadow-inner">
           <h4 className="text-xs uppercase tracking-wider text-indigo-300 font-semibold mb-4 flex items-center gap-2">
             <Layers size={14} /> Consolidation Plan
           </h4>
           
           <div className="bg-black/40 rounded-lg p-4 border border-white/5 space-y-4">
             <ul className="space-y-3">
               {consolidatedData.consolidationPlan.summarySteps?.map((step: string, i: number) => (
                 <li key={i} className="flex items-start gap-3 text-sm">
                   <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">{i+1}</div>
                   <span className="text-slate-200 pt-0.5">{step}</span>
                 </li>
               ))}
             </ul>
             
             <div className="flex items-stretch justify-between pt-6 border-t border-white/10 mt-4 relative">
                {/* SVG CONNECTORS (Background) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg className="w-full h-full text-indigo-500/20" preserveAspectRatio="none">
                     <path d="M 40,50 L 60,50" stroke="currentColor" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" className="animate-pulse" />
                  </svg>
                </div>

                {/* LEFT: SOURCES */}
                <div className="flex flex-col gap-3 w-5/12 relative z-10">
                   <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Inputs</div>
                   {consolidatedData.consolidationPlan.articlesToArchive?.map((id: string, i: number) => (
                     <div key={i} className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-rose-500/30 flex items-center justify-center shrink-0">
                          <Archive size={10} className="text-rose-300"/>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-rose-300/80 uppercase font-mono tracking-wider">Deprecate</div>
                          <div className="text-xs text-rose-200 font-medium truncate">ID: {id}</div>
                        </div>
                     </div>
                   ))}
                   <div className="bg-indigo-500/10 border border-indigo-500/30 p-2.5 rounded-lg flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                          <FilePlus size={10} className="text-indigo-300"/>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-indigo-300/80 uppercase font-mono tracking-wider">Source Material</div>
                          <div className="text-xs text-indigo-200 font-medium truncate">New Findings</div>
                        </div>
                   </div>
                </div>

                {/* MIDDLE: MERGE ICON */}
                <div className="flex flex-col items-center justify-center relative z-10 px-2">
                   <div className="w-8 h-8 rounded-full bg-slate-900 border border-indigo-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                      <GitBranch size={14} className="text-indigo-400 rotate-90" />
                   </div>
                   <div className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider mt-1.5 bg-slate-900 px-1">Merge</div>
                </div>

                {/* RIGHT: TARGET */}
                <div className="flex flex-col justify-center w-5/12 relative z-10">
                   <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Output</div>
                   {consolidatedData.consolidationPlan.articlesToCreate?.map((title: string, i: number) => (
                     <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={12} className="text-emerald-300"/>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-emerald-300/80 uppercase tracking-wider mb-0.5">Master Node</div>
                          <div className="text-xs text-emerald-200 font-medium leading-tight line-clamp-2">{title}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           </div>
        </div>
      )}

      {displayResult.searchContext && displayResult.searchContext.length > 0 && (!consolidatedData || consolidatedData.needsSplit) && (
        <div className={`p-4 rounded-lg text-sm flex flex-col gap-3 ${displayResult.duplicateWarning ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200'}`}>
          <div className="flex items-start gap-3">
            {displayResult.duplicateWarning ? (
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <ExternalLink size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className={`font-semibold block mb-0.5 ${displayResult.duplicateWarning ? 'text-amber-500' : 'text-indigo-300'}`}>
                {displayResult.duplicateWarning ? 'Duplicate Article Candidates Detected' : 'Related Articles Found in KB'}
              </span>
              <span className="opacity-80">
                {displayResult.duplicateWarning 
                  ? 'Select the articles below that you wish to merge and consolidate with this draft.' 
                  : 'You may select related articles to merge your new findings into.'}
              </span>
            </div>
          </div>
          
          <div className="mt-2 space-y-2">
            {displayResult.searchContext.slice(0, 3).map((ctx: { article: SearchContextArticle; similarity: number }, idx: number) => {
              const checked = selectedForConsolidation.includes(ctx.article.id);
              return (
                <div 
                  key={idx} 
                  onClick={() => toggleSelection(ctx.article.id)}
                  className={`p-3 rounded-lg border flex flex-col gap-2 cursor-pointer transition-colors ${checked ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-black/30 border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      <input 
                        type="checkbox" 
                        checked={checked}
                        onChange={() => {}} // dummy onChange since parent handles click
                        className="w-4 h-4 rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${checked ? 'text-indigo-200' : 'text-white'}`}>{ctx.article.title}</span>
                        <span className={`${checked ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/5 text-slate-400'} text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}>
                          {(ctx.similarity * 100).toFixed(0)}% Match <ExternalLink size={12}/>
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 mt-1 ${checked ? 'opacity-80' : 'opacity-60'}`}>{ctx.article.resolution}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedForConsolidation.length > 0 && (
            <div className="mt-2 flex justify-end">
              <button 
                onClick={handleConsolidate}
                disabled={isConsolidating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isConsolidating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <GitBranch size={16}/>}
                Consolidate {selectedForConsolidation.length} Selected Article{selectedForConsolidation.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {displayResult.isMultiTopic && displayResult.suggestedTopics && displayResult.suggestedTopics.length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-4 rounded-lg text-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
             <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
               <span className="text-[10px] text-white font-bold block pb-px">!</span>
             </div>
             <div>
               <span className="font-semibold block mb-0.5">Multiple Topics Detected</span>
               <span className="text-indigo-200/80">This source material addresses independent issues. We recommend splitting them into focused articles:</span>
             </div>
          </div>
          <ul className="list-disc pl-11 text-indigo-300">
            {displayResult.suggestedTopics.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
          <div className="pl-7 mt-2">
            <button 
              onClick={() => {
                if (onSplit && displayResult.suggestedTopics) {
                  onSplit(displayResult.suggestedTopics);
                }
              }}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              Split into {displayResult.suggestedTopics.length} Articles
            </button>
          </div>
        </div>
      )}

      <div className="group relative bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors mt-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Title</h4>
        <p className="text-foreground font-medium">{displayResult.title}</p>
        <button className="absolute top-4 right-4 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Copy size={16} />
        </button>
      </div>

      <div className="group relative bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
        <h4 className="text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-2">Environment / Problem</h4>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{displayResult.problem}</p>
      </div>

      <div className="group relative bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
        <h4 className="text-xs uppercase tracking-wider text-orange-400 font-semibold mb-2">Cause</h4>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{displayResult.cause}</p>
      </div>

      <div className="group relative bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
        <h4 className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-2">Resolution</h4>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{displayResult.resolution}</p>
      </div>

      <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-4 pb-2">
        <div className="text-xs flex items-center gap-2">
           <span className="text-muted-foreground">Confidence Score:</span>
           <span className={`font-mono font-medium ${displayResult.confidence > 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
             {(displayResult.confidence * 100).toFixed(0)}%
           </span>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
             Discard
           </button>
           <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 rounded-lg text-sm font-medium transition-all text-white">
             Approve & Publish
           </button>
        </div>
      </div>
    </div>
  );
}

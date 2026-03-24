"use client";

import { useState, useEffect } from "react";
import { GitBranch, Sparkles, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

export type SearchContextArticle = {
  id: string;
  title: string;
  problem: string;
  resolution: string;
};

export type TopicPlan = {
  topic: { title: string; searchQuery: string };
  included: boolean;
  duplicateCandidates: { article: SearchContextArticle; similarity: number }[];
  selectedDuplicates: string[];
  loadingCandidates: boolean;
};

export function PlanningDashboard({
  topics,
  onGenerate
}: {
  topics: { title: string; searchQuery: string }[];
  onGenerate: (plan: { topic: string; targetArticleIds: string[] }[]) => void;
}) {
  const [plans, setPlans] = useState<TopicPlan[]>(() => 
    topics.map(t => ({
      topic: t,
      included: true,
      duplicateCandidates: [],
      selectedDuplicates: [],
      loadingCandidates: true,
    }))
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Fetch duplicate candidates for each topic
    const fetchCandidates = async () => {
      await Promise.all(plans.map(async (p, idx) => {
        try {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              topic: p.topic.title,
              searchQuery: p.topic.searchQuery
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (mounted) {
              setPlans(prev => {
                const next = [...prev];
                const currentTopic = { ...next[idx] };
                currentTopic.duplicateCandidates = data.slice(0, 3);
                currentTopic.loadingCandidates = false;
                next[idx] = currentTopic;
                return next;
              });
            }
          } else {
            throw new Error(`API returned ${res.status}`);
          }
        } catch(e) {
          console.error("Failed to load generic candidates:", e);
          if (mounted) {
            setPlans(prev => {
              const next = [...prev];
              const currentTopic = { ...next[idx] };
              currentTopic.loadingCandidates = false;
              next[idx] = currentTopic;
              return next;
            });
          }
        }
      }));
      if (mounted) setIsReady(true);
    };

    fetchCandidates();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTopic = (index: number) => {
    setPlans(prev => {
      const next = [...prev];
      // Create a fresh object to force React's shallow comparison to detect the change
      next[index] = { ...next[index], included: !next[index].included };
      return next;
    });
  };

  const toggleDuplicate = (topicIndex: number, articleId: string) => {
    setPlans(prev => {
      const next = [...prev];
      const currentTopic = { ...next[topicIndex] };
      const selected = currentTopic.selectedDuplicates;
      
      if (selected.includes(articleId)) {
        currentTopic.selectedDuplicates = selected.filter(id => id !== articleId);
      } else {
        currentTopic.selectedDuplicates = [...selected, articleId];
      }
      
      next[topicIndex] = currentTopic;
      return next;
    });
  };

  const handleProceed = () => {
    const finalPlan = plans
      .filter(p => p.included)
      .map(p => ({
        topic: p.topic.title,
        targetArticleIds: p.selectedDuplicates
      }));
    onGenerate(finalPlan);
  };

  const activeCount = plans.filter(p => p.included).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
        
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
             <GitBranch className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-outfit font-bold text-slate-800 tracking-wide">Knowledge Master Plan</h2>
            <p className="text-slate-500 text-sm mt-1">
              Select which inferred topics you want to generate KCS articles for, and check any existing Knowledge Base articles you wish to consolidate.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {plans.map((plan, tIdx) => (
            <div key={tIdx} className={`rounded-xl border transition-all ${plan.included ? 'bg-slate-50 border-indigo-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
              
              {/* Topic Header row */}
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleTopic(tIdx)}>
                 <div className="flex items-center gap-3">
                   <input type="checkbox" checked={plan.included} readOnly className="w-5 h-5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-0" />
                    <div>
                      <div className="text-[10px] text-indigo-600 tracking-widest font-bold uppercase mb-1">Draft Target</div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover/header:text-indigo-600 transition-colors">
                        {plan.topic.title}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1 font-mono">
                        Query used: {plan.topic.searchQuery}
                      </div>
                    </div>
                 </div>
                 {!plan.loadingCandidates && plan.duplicateCandidates.length > 0 && plan.included && (
                    <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                      {plan.duplicateCandidates.length} Duplicate{plan.duplicateCandidates.length > 1 ? 's' : ''} Found
                    </span>
                 )}
              </div>

              {/* Duplicates block */}
              {plan.included && (
                <div className="border-t border-slate-200 p-4 bg-indigo-50/30 rounded-b-xl space-y-3">
                  {plan.loadingCandidates ? (
                    <div className="flex items-center gap-2 text-indigo-600 text-sm py-2 font-medium">
                       <Loader2 size={16} className="animate-spin" /> Analyzing Knowledge Base for duplicates...
                    </div>
                  ) : plan.duplicateCandidates.length === 0 ? (
                    <div className="text-sm text-emerald-600 font-medium flex items-center gap-2">
                       <CheckCircle2 size={16} /> No existing KB conflicts found. Safe to generate.
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-slate-500 mb-2 font-semibold">Select existing articles below to merge their history into this new draft:</div>
                      {plan.duplicateCandidates.map((ctx, dIdx) => {
                         const checked = plan.selectedDuplicates.includes(ctx.article.id);
                         return (
                           <div 
                             key={dIdx} 
                             onClick={(e) => { e.stopPropagation(); toggleDuplicate(tIdx, ctx.article.id); }}
                             className={`p-3 rounded-lg border flex flex-col gap-2 cursor-pointer transition-colors shadow-sm ${checked ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                           >
                             <div className="flex items-start gap-3">
                               <div className="shrink-0 mt-1">
                                 <input type="checkbox" checked={checked} readOnly className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                               </div>
                               <div className="flex-1">
                                 <div className="flex items-center justify-between">
                                   <span className={`font-semibold ${checked ? 'text-indigo-900' : 'text-slate-800'}`}>{ctx.article.title}</span>
                                   <span className={`${checked ? 'bg-indigo-100/50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-500 border border-slate-200'} text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1`}>
                                     {(ctx.similarity * 100).toFixed(0)}% Match <ExternalLink size={12}/>
                                   </span>
                                 </div>
                                 <p className={`text-xs line-clamp-1 mt-1 ${checked ? 'text-indigo-700/80' : 'text-slate-500'}`}>{ctx.article.resolution}</p>
                               </div>
                             </div>
                           </div>
                         );
                      })}
                    </>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>

        <div className="mt-2 pt-4 flex justify-end">
          <button
            onClick={handleProceed}
            disabled={activeCount === 0 || !isReady}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 shadow-md text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <Sparkles size={16} /> Consolidate & Generate {activeCount} Draft{activeCount !== 1 ? 's' : ''}
          </button>
        </div>

      </div>
    </div>
  );
}

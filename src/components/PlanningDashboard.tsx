"use client";

import { useState, useEffect } from "react";
import { GitBranch, Sparkles, CheckCircle2, Loader2, ExternalLink, LayoutTemplate, ChevronDown } from "lucide-react";

export type SearchContextArticle = {
  id: string;
  title: string;
  problem: string;
  resolution: string;
};

export type TemplateField = {
  fieldName: string;
  description: string;
  required: boolean;
  searchable: boolean;
};

export type KBTemplate = {
  templateName: string;
  templateType: string;
  kbPrefix: string;
  fields: TemplateField[];
};

export type TopicPlan = {
  topic: { title: string; searchQuery: string };
  included: boolean;
  duplicateCandidates: { article: SearchContextArticle; similarity: number }[];
  selectedDuplicates: string[];
  loadingCandidates: boolean;
  templateOverride: KBTemplate | null; // null = inherit global
};

export function PlanningDashboard({
  topics,
  onGenerate
}: {
  topics: { title: string; searchQuery: string }[];
  onGenerate: (plan: { topic: string; targetArticleIds: string[]; template?: { templateName: string; kbPrefix: string; fields: TemplateField[] } }[]) => void;
}) {
  const [plans, setPlans] = useState<TopicPlan[]>(() => 
    topics.map(t => ({
      topic: t,
      included: true,
      duplicateCandidates: [],
      selectedDuplicates: [],
      loadingCandidates: true,
      templateOverride: null,
    }))
  );
  const [isReady, setIsReady] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<KBTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [globalTemplate, setGlobalTemplate] = useState<KBTemplate | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (e) {
        console.error("Failed to fetch templates:", e);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

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

  const setTopicTemplate = (topicIndex: number, templateName: string) => {
    setPlans(prev => {
      const next = [...prev];
      const currentTopic = { ...next[topicIndex] };
      if (templateName === "__inherit__") {
        currentTopic.templateOverride = null;
      } else {
        currentTopic.templateOverride = templates.find(t => t.templateName === templateName) || null;
      }
      next[topicIndex] = currentTopic;
      return next;
    });
  };

  const handleProceed = () => {
    const finalPlan = plans
      .filter(p => p.included)
      .map(p => {
        // Resolve which template to use: draft override > global
        const resolvedTemplate = p.templateOverride || globalTemplate;
        return {
          topic: p.topic.title,
          targetArticleIds: p.selectedDuplicates,
          ...(resolvedTemplate ? {
            template: {
              templateName: resolvedTemplate.templateName,
              kbPrefix: resolvedTemplate.kbPrefix,
              fields: resolvedTemplate.fields
            }
          } : {})
        };
      });
    onGenerate(finalPlan);
  };

  const activeCount = plans.filter(p => p.included).length;

  // Helper to get the effective template for a draft
  const getEffectiveTemplate = (plan: TopicPlan) => plan.templateOverride || globalTemplate;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
        
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
             <GitBranch className="text-indigo-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-outfit font-bold text-slate-800 tracking-wide">Knowledge Master Plan</h2>
            <p className="text-slate-500 text-sm mt-1">
              Select your template, choose which topics to generate, and check any existing KB articles to consolidate.
            </p>
          </div>
        </div>

        {/* ───── GLOBAL TEMPLATE SELECTOR ───── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <LayoutTemplate size={20} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Global Template</div>
            <p className="text-xs text-slate-500">Applied to all drafts unless overridden individually.</p>
          </div>
          <div className="relative min-w-[220px]">
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : (
              <div className="relative">
                <select
                  value={globalTemplate?.templateName || "__none__"}
                  onChange={(e) => {
                    if (e.target.value === "__none__") {
                      setGlobalTemplate(null);
                    } else {
                      setGlobalTemplate(templates.find(t => t.templateName === e.target.value) || null);
                    }
                  }}
                  className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none cursor-pointer"
                >
                  <option value="__none__">Standard KCS (Default)</option>
                  {templates.map(t => (
                    <option key={t.templateName} value={t.templateName}>
                      {t.templateName} ({t.kbPrefix})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Show active global template fields preview */}
        {globalTemplate && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 mb-2">
              Template Fields — {globalTemplate.templateName}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {globalTemplate.fields.map((f, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    f.required
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {f.fieldName}
                  {f.required && <span className="ml-1 text-red-400">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ───── TOPIC ROWS ───── */}
        <div className="space-y-4">
          {plans.map((plan, tIdx) => {
            const effectiveTemplate = getEffectiveTemplate(plan);
            return (
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
                 <div className="flex items-center gap-3">
                   {/* Template badge */}
                   {plan.included && effectiveTemplate && (
                     <span className="text-[10px] font-bold tracking-wider bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200 flex items-center gap-1">
                       <LayoutTemplate size={10} />
                       {plan.templateOverride ? effectiveTemplate.templateName : 'Inherited'}
                     </span>
                   )}
                   {!plan.loadingCandidates && plan.duplicateCandidates.length > 0 && plan.included && (
                      <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                        {plan.duplicateCandidates.length} Duplicate{plan.duplicateCandidates.length > 1 ? 's' : ''} Found
                      </span>
                   )}
                 </div>
              </div>

              {/* Template Override + Duplicates block */}
              {plan.included && (
                <div className="border-t border-slate-200 p-4 bg-indigo-50/30 rounded-b-xl space-y-3">
                  {/* Per-draft Template Override */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60">
                    <LayoutTemplate size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500 font-medium shrink-0">Template:</span>
                    <div className="relative flex-1 max-w-[260px]">
                      <select
                        value={plan.templateOverride?.templateName || "__inherit__"}
                        onChange={(e) => { e.stopPropagation(); setTopicTemplate(tIdx, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none cursor-pointer"
                      >
                        <option value="__inherit__">
                          {globalTemplate ? `↳ Inherit: ${globalTemplate.templateName}` : '↳ Standard KCS (Default)'}
                        </option>
                        {templates.map(t => (
                          <option key={t.templateName} value={t.templateName}>
                            {t.templateName} ({t.kbPrefix})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Duplicate Candidates */}
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
          );})}
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

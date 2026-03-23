"use client";

import { useState } from "react";
import { GitBranch, Sparkles } from "lucide-react";
import { GenerationOutput } from "@/components/GenerationResult";

export function TopicSplitter({
  result,
  onGenerateBulk
}: {
  result: GenerationOutput;
  onGenerateBulk: (topics: string[]) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAll = () => {
    setIsGenerating(true);
    if (result.suggestedTopics) {
      onGenerateBulk(result.suggestedTopics);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 rounded-2xl p-6 text-indigo-100 flex flex-col gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center border border-indigo-400/50 shadow-inner">
             <GitBranch className="text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-outfit font-bold text-white tracking-wide">Topic Segregation Detected</h2>
            <p className="text-indigo-200/80 text-sm mt-1">
              Your source material covers multiple distinct issues. To adhere to KCS best practices, we recommend segregating these into focused articles.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {result.suggestedTopics?.map((topic, idx) => (
            <div key={idx} className="bg-black/40 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between group">
              <span className="font-medium text-sm w-full">{topic}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-4 border-t border-indigo-500/20 flex justify-end">
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {isGenerating ? (
               <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Batch Processing...</>
            ) : (
               <><Sparkles size={16} /> Generate {result.suggestedTopics?.length || 0} Articles in Parallel</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

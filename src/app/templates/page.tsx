"use client";

import { RA_SNIPPETS } from "@/lib/snippets";
import { Copy, Check, FileCode, Info } from "lucide-react";
import { useState } from "react";

// Helper to rewrite relative RA URLs for local display
const rewriteRAUrls = (html: string) => {
  if (!html) return html;
  if (html.includes('src="http')) return html;
  return html.replace(/src="\/solutionmanager\//g, 'src="https://qa-develop.rightanswers.com/solutionmanager/');
};

export default function TemplatesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <h1 className="text-3xl font-outfit font-bold text-slate-800">RightAnswers Snippets Library</h1>
        <p className="text-slate-500 max-w-2xl">
          These standardized HTML snippets are injected into the AI Master Architect's context to ensure consistent formatting 
          and integration with the RA Solution Manager's native styles.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {RA_SNIPPETS.map((snippet) => (
          <div key={snippet.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileCode size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{snippet.name}</h3>
                  <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">{snippet.id}</p>
                </div>
              </div>
              <button 
                onClick={() => copyToClipboard(snippet.html, snippet.id)}
                className={`p-2 rounded-lg transition-colors ${copiedId === snippet.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                {copiedId === snippet.id ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <div className="py-2">
              <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-indigo-100 pl-3">
                "{snippet.description}"
              </p>
            </div>

            <div className="mt-auto">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                 <Info size={10} /> Preview HTML Output
               </div>
               <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                 <code className="text-[11px] text-indigo-300 font-mono whitespace-pre break-all">
                   {snippet.html}
                 </code>
               </div>
            </div>

            <div className="mt-2 pt-4 border-t border-slate-100">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Live Result</div>
               <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden" dangerouslySetInnerHTML={{ __html: rewriteRAUrls(snippet.html) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

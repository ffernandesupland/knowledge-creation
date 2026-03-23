"use client";

import { useState, useRef } from "react";
import { FileText, Link as LinkIcon, UploadCloud, Sparkles, CheckSquare, Square, Settings2, Loader2 } from "lucide-react";

export type PipelineConfig = {
  enableKbSearch: boolean;
  optSplitTopics: boolean;
  optNeural: boolean;
  optKcs: boolean;
  optCustom: boolean;
};

const RenderCheckbox = ({ label, desc, configKey, config, toggleConfig }: { label: string, desc: string, configKey: keyof PipelineConfig, config: PipelineConfig, toggleConfig: (k: keyof PipelineConfig) => void }) => (
  <div 
    className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-black/20 hover:bg-black/40 cursor-pointer transition-colors"
    onClick={() => toggleConfig(configKey)}
  >
    <div className="mt-0.5 text-indigo-400">
      {config[configKey] ? <CheckSquare size={18} /> : <Square size={18} className="text-white/30" />}
    </div>
    <div>
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

export function SourceInput({ onSubmit }: { onSubmit: (text: string, config: PipelineConfig) => void }) {
  const [activeTab, setActiveTab] = useState<"text" | "url" | "file">("text");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Spec configurations
  const [config, setConfig] = useState<PipelineConfig>({
    enableKbSearch: true,
    optSplitTopics: true,
    optNeural: false,
    optKcs: true,
    optCustom: false,
  });

  const toggleConfig = (key: keyof PipelineConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsLoading(true);
    // Simulate slight delay then submit
    setTimeout(() => {
      onSubmit(content, config);
      setIsLoading(false);
    }, 500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch('/api/extract', {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) throw new Error("File reading failed on the server.");
      const data = await res.json();
      
      const newText = `[EXTRACTED FROM ${file.name}]\n${data.text}\n\n`;
      setContent(prev => prev ? prev + "\n" + newText : newText);
      setActiveTab("text"); // Switch back to text to let user verify/edit
    } catch (err) {
      alert("Failed to extract text from document.");
      console.error(err);
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex space-x-2 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab("text")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "text" ? "bg-indigo-500 text-white shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2"><FileText size={16}/> Text</div>
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "url" ? "bg-indigo-500 text-white shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2"><LinkIcon size={16}/> URL/RAKE</div>
        </button>
        <button
          onClick={() => setActiveTab("file")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "file" ? "bg-indigo-500 text-white shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
           <div className="flex items-center gap-2"><UploadCloud size={16}/> Documents</div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-2">
        {activeTab === "text" && (
          <textarea
            className="w-full h-40 shrink-0 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
            placeholder="Paste your raw support notes, chat logs, or rough draft here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}
        
        {activeTab === "url" && (
          <div className="h-40 shrink-0 flex items-center justify-center p-8 bg-black/40 border border-white/10 rounded-xl border-dashed">
            <input
              type="url"
              className="w-full max-w-md bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="https://example.com/docs"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}

        {activeTab === "file" && (
          <div 
             className={`h-40 shrink-0 flex flex-col items-center justify-center p-8 bg-black/40 border-2 rounded-xl border-dashed transition-all ${isExtracting ? 'border-indigo-500 bg-indigo-500/10 cursor-wait' : 'border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'}`}
             onClick={() => !isExtracting && fileInputRef.current?.click()}
          >
            <input 
               type="file" 
               className="hidden" 
               ref={fileInputRef} 
               accept=".txt,.md,.pdf,.docx,.csv" 
               onChange={handleFileUpload}
            />
            {isExtracting ? (
               <>
                 <Loader2 className="w-10 h-10 text-indigo-400 mb-4 animate-spin" />
                 <p className="text-sm font-medium text-indigo-300">Extracting content via OCR/Parsers...</p>
                 <p className="text-xs text-indigo-200/50 mt-1">Please wait</p>
               </>
            ) : (
               <>
                 <UploadCloud className="w-10 h-10 text-muted-foreground mb-4 group-hover:text-indigo-400 transition-colors" />
                 <p className="text-sm font-medium">Click to upload or drag and drop</p>
                 <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT (Max 5MB)</p>
               </>
            )}
          </div>
        )}

        <div className="bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col gap-3">
           <div className="flex items-center gap-2 mb-1">
             <Settings2 size={16} className="text-indigo-400"/>
             <span className="text-sm font-semibold tracking-wide text-white">Pipeline Configuration</span>
           </div>
           
           <RenderCheckbox label="Search KB for related articles" desc="Triggers hybrid search before generation and injects top results for deduplication context." configKey="enableKbSearch" config={config} toggleConfig={toggleConfig} />

           <div className="grid grid-cols-2 gap-2 mt-2">
             <RenderCheckbox label="Split Topics" desc="Detects multi-topics" configKey="optSplitTopics" config={config} toggleConfig={toggleConfig} />
             <RenderCheckbox label="KCS Structure" desc="Format to Problem/Resolution" configKey="optKcs" config={config} toggleConfig={toggleConfig} />
             <RenderCheckbox label="Neural Optimization" desc="Density & intent-alignment" configKey="optNeural" config={config} toggleConfig={toggleConfig} />
             <RenderCheckbox label="Custom Rules" desc="Org-specific guidelines" configKey="optCustom" config={config} toggleConfig={toggleConfig} />
           </div>
        </div>

        <button
          disabled={isLoading || !content.trim()}
          type="button"
          onClick={handleSubmit}
          className="w-full shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group mt-auto"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles size={18} className="group-hover:text-indigo-200 transition-colors" />
              Generate Knowledge
            </>
          )}
        </button>
      </form>
    </div>
  );
}

"use client";

import { AGENTS, Agent } from "@/lib/agents";
import { Cpu, Edit3, Save, RotateCcw, ShieldCheck, Terminal, Eye, Code } from "lucide-react";
import { useState } from "react";

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<string>(AGENTS[0].id);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>(
    AGENTS.reduce((acc, agent) => ({ ...acc, [agent.id]: agent.systemPrompt }), {})
  );
  const [isSaving, setIsSaving] = useState(false);

  const activeAgent = AGENTS.find(a => a.id === activeTab)!;

  const handleSave = async () => {
    setIsSaving(true);
    // In a real app, we'd call an API to save this to a file or DB.
    // For now, we simulate persistence via state.
    setTimeout(() => {
      setIsSaving(false);
      alert("Prompt updated successfully! (Simulation)");
    }, 1000);
  };

  const handleReset = () => {
    if (confirm("Reset to default system prompt?")) {
      setEditedPrompts({
        ...editedPrompts,
        [activeTab]: activeAgent.systemPrompt
      });
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-outfit font-bold text-slate-800">Agent Visualizer</h1>
          <p className="text-slate-500 max-w-2xl">
            Monitor and tune the neural personality of each agent in the transformation pipeline. 
            Directly modify system prompts to adapt logic and styles.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleReset}
             className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
           >
             <RotateCcw size={16} /> Reset
           </button>
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
           >
             {isSaving ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />} 
             Save Changes
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setActiveTab(agent.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all border ${
                activeTab === agent.id 
                ? "bg-white border-indigo-200 shadow-md ring-1 ring-indigo-100" 
                : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200 text-slate-500"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg ${activeTab === agent.id ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {agent.id.charAt(0).toUpperCase() === 'T' ? <Terminal size={16}/> : agent.id.charAt(0).toUpperCase() === 'M' ? <Cpu size={16}/> : <ShieldCheck size={16}/>}
                </div>
                <span className={`font-semibold ${activeTab === agent.id ? "text-slate-800" : ""}`}>{agent.name}</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-10 truncate">{agent.role}</p>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-indigo-600 shadow-sm">
                <Code size={24} />
              </div>
              <div>
                <h2 className="font-outfit font-bold text-xl text-slate-800">System Prompt Configuration</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active Model: {process.env.NEXT_PUBLIC_AI_MODEL || 'GPT-4o'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
              <Eye size={12} /> Debug Mode
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Edit3 size={12} /> Core Logic (Instructional Set)
               </label>
               <textarea 
                 value={editedPrompts[activeTab]}
                 onChange={(e) => setEditedPrompts({ ...editedPrompts, [activeTab]: e.target.value })}
                 className="w-full h-[540px] p-5 rounded-2xl bg-slate-950 text-indigo-100 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 selection:bg-indigo-500/30 custom-scrollbar resize-none border border-slate-800"
                 spellCheck={false}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

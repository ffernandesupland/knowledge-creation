"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, HelpCircle, Search, Bell, Cpu } from "lucide-react";

export function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isSelected = (path: string) => pathname === path;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Left Sidebar (Classic Dark) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-800 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-outfit font-bold shadow-sm mr-3">
              AI
            </div>
            <span className="font-outfit font-semibold text-white tracking-wide">Knowledge Creator</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1 custom-scrollbar">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">Workspace</div>
          
          <Link 
            href="/" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              isSelected("/") ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard size={18} />
            Master Generator
          </Link>
          
          <Link 
            href="/templates" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isSelected("/templates") ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-white/5 hover:text-white"
            }`}
          >
            <FileText size={18} />
            Template Library
          </Link>

          <Link 
            href="/agents" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isSelected("/agents") ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-white/5 hover:text-white"
            }`}
          >
            <Cpu size={18} />
            Agent Visualizer
          </Link>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mt-6 mb-2">Administration</div>
          
          <Link 
            href="/team" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isSelected("/team") ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-white/5 hover:text-white"
            }`}
          >
            <Users size={18} />
            Team Access
          </Link>
          
          <Link 
            href="/settings" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isSelected("/settings") ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={18} />
            Global Settings
          </Link>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 border-2 border-slate-800"></div>
              <div className="min-w-0 flex-1">
                 <div className="text-sm font-semibold text-white truncate">Administrator</div>
                 <div className="text-xs text-slate-500 truncate">Enterprise Plan</div>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
           <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full max-w-md hidden lg:block">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   type="text" 
                   placeholder="Search workspace..." 
                   className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                 />
              </div>
           </div>
           <div className="flex items-center gap-4 shrink-0">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <HelpCircle size={20} />
              </button>
           </div>
        </header>

        {/* Fluid Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
           {children}
        </main>
      </div>
    </div>
  );
}

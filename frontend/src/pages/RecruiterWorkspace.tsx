import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Sliders, 
  History, 
  Sparkles, 
  Calendar, 
  Database, 
  Activity, 
  Cpu, 
  ChevronRight,
  Zap,
  Shield
} from 'lucide-react';

import Footer from '../components/layout/Footer';
import AddCandidateForm from '../components/AddCandidateForm';
import RecruiterConsole from './RecruiterConsole';
import HistoricalAudit from './HistoricalAudit';
import MigrationSimulator from './MigrationSimulator';
import ChaosSimulator from './ChaosSimulator';



type TabType = 'dashboard' | 'add-candidate' | 'console' | 'logs' | 'migration-simulator' | 'chaos-sandbox';



export default function RecruiterWorkspace() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tickerTime, setTickerTime] = useState<string>('');
  const [blindModeState, setBlindModeState] = useState<boolean>(false);


  useEffect(() => {
    const updateTickerTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setTickerTime(now.toLocaleString(undefined, options));
    };

    updateTickerTime();
    const interval = setInterval(updateTickerTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', name: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'add-candidate', name: 'Add Candidate', icon: UserPlus },
    { id: 'console', name: 'Recruiter Console', icon: Sliders },
    { id: 'migration-simulator', name: 'Migration Simulator', icon: Cpu },
    { id: 'chaos-sandbox', name: 'Chaos Simulator', icon: Zap },
    { id: 'logs', name: 'System Audit Logs', icon: History }
  ] as const;



  return (
    <div className="flex min-h-screen bg-slate-955 text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* 1. Left Sidebar Pane Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0 select-none">
        
        {/* Brand Banner */}
        <div className="px-6 py-6 border-b border-slate-900/60 flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base tracking-tight bg-gradient-to-r from-slate-100 to-emerald-450 bg-clip-text text-transparent">
              WeHire Admin
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-0.5">
              Workspace Shell
            </span>
          </div>
        </div>

        {/* Sidebar Nav List Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                    : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`} />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Anti-Bias Compliance Toggle */}
        <div className="p-4 border-t border-slate-900/60 flex flex-col gap-3">
          <button
            onClick={() => setBlindModeState(!blindModeState)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer ${
              blindModeState
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.05)]'
                : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{blindModeState ? 'Anti-Bias Masking ON' : 'Anti-Bias Masking OFF'}</span>
          </button>
          
          <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-900/50 border border-slate-850 rounded-lg">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
              Gateway Operational
            </span>
          </div>
        </div>

      </aside>

      {/* 2. Main Page View Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Main Work Pane Content Area */}
        <main className={`flex-1 flex flex-col ${
          activeTab === 'console' || activeTab === 'logs' ? '' : 'p-6 md:p-8'
        }`}>
          
          {/* Active Tab Sub-module Routing Router */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col gap-8 animate-fadeIn">
              
              {/* Header Welcome Banner */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-900 pb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold font-display bg-gradient-to-r from-slate-50 via-slate-200 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                    Recruiter Workspace
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center justify-center p-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[10px] font-black uppercase select-none tracking-wide">
                      Active Node
                    </span>
                    <p className="text-slate-400 text-sm">
                      Welcome back, administrator. WeHire Intelligent processing gateway is ready.
                    </p>
                  </div>
                </div>

                {/* Live Ticker Clock */}
                <div className="flex items-center gap-2.5 px-4.5 py-2.5 bg-slate-900/40 border border-slate-900 rounded-xl shadow-lg backdrop-blur-md">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-350 font-mono font-bold leading-none">
                    {tickerTime || 'Loading workspace clock...'}
                  </span>
                </div>
              </div>

              {/* 4-Card Operational Status Matrix Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Card 1: Total Profiles Indexed */}
                <div className="bg-slate-900/50 border border-slate-900/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Profiles Indexed</span>
                    <span className="text-2xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-200">
                      14,820
                    </span>
                    <span className="text-[10px] text-slate-450 font-medium">
                      Multi-vector resume database
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950 text-emerald-400 border border-slate-900 rounded-xl group-hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] transition duration-200">
                    <Database className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 2: Active Requirements Searches */}
                <div className="bg-slate-900/50 border border-slate-900/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Active Searches</span>
                    <span className="text-2xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-200">
                      34
                    </span>
                    <span className="text-[10px] text-slate-455 font-medium">
                      Recruiter weighting configs
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950 text-emerald-400 border border-slate-900 rounded-xl group-hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] transition duration-200">
                    <Sliders className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 3: Database Infrastructure Status */}
                <div className="bg-slate-900/50 border border-slate-900/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Infrastructure Status</span>
                    <span className="text-2xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1.5">
                      Connected
                    </span>
                    <span className="text-[10px] text-slate-450 font-medium">
                      Seeded vector + fallback database
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950 text-emerald-400 border border-slate-900 rounded-xl group-hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] transition duration-200">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 4: Average Processing Speed */}
                <div className="bg-slate-900/50 border border-slate-900/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Average Match Latency</span>
                    <span className="text-2xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-200">
                      &lt;200ms
                    </span>
                    <span className="text-[10px] text-slate-450 font-medium">
                      Multi-vector distance scoring
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950 text-emerald-400 border border-slate-900 rounded-xl group-hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] transition duration-200">
                    <Cpu className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Call-to-action Section Container */}
              <div className="mt-4 bg-slate-900/40 border border-slate-900 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shadow-md hidden sm:block">
                    <Zap className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex flex-col text-center md:text-left">
                    <h3 className="text-lg font-bold text-slate-200">Ready to Analyze Candidate Vectors?</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-lg">
                      Open our interactive ranking dashboard to score talent pools against custom descriptions with semantic NLP and behavioral analysis filters.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('console')}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 hover:shadow-emerald-500/10 rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-lg group select-none transition-all duration-200 shrink-0"
                >
                  <span>Launch Search Engine Matrix</span>
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

            </div>
          )}

          {/* Placeholder containers for remaining inactive tabs */}
          {activeTab === 'add-candidate' && (
            <div className="flex-1 flex flex-col animate-fadeIn">
              <div className="border-b border-slate-900 pb-4 mb-6">
                <h2 className="text-lg font-bold font-display text-slate-205">
                  Profile Ingestion Wizard
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ingest new candidate metadata and unstructured resume profiles into the cluster.
                </p>
              </div>
              <div className="flex-1 py-4">
                <AddCandidateForm />
              </div>
            </div>
          )}

          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col animate-fadeIn">
              <RecruiterConsole />
            </div>
          )}

          {activeTab === 'migration-simulator' && (
            <div className="flex-1 flex flex-col animate-fadeIn">
              <MigrationSimulator />
            </div>
          )}

          {activeTab === 'chaos-sandbox' && (
            <div className="flex-1 flex flex-col animate-fadeIn">
              <ChaosSimulator blindMode={blindModeState} />
            </div>
          )}
          
          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col animate-fadeIn">
              <HistoricalAudit />
            </div>
          )}


        </main>

        {/* Corporate Base Footer */}
        <Footer />

      </div>

    </div>
  );
}

import { Shield, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950/40 border-t border-slate-900 px-6 py-4 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2 select-none">
          <Shield className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>Security Boundary: <strong className="text-slate-400 font-semibold uppercase">Secure PII Encryption Active</strong></span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-650" />
            <span>Antigravity Engine <span className="text-emerald-450 font-bold">v1.2.0</span></span>
          </div>
          <span className="h-3 w-px bg-slate-800 hidden md:inline"></span>
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cluster Status: <strong className="text-emerald-450 font-bold">Operational</strong></span>
          </div>
        </div>

        <div className="select-none text-slate-500 font-mono text-[10px]">
          © {new Date().getFullYear()} WeHire. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

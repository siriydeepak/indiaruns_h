import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Code, 
  Terminal, 
  Cpu, 
  Database, 
  Sparkles, 
  AlertTriangle, 
  Zap, 
  CheckCircle,
  Loader2
} from 'lucide-react';


interface SimulatedCandidate {
  id: string;
  name: string;
  current_title: string;
  global_match_rank: number;
  verified_historical_proof: string;
}

interface SimulationResponse {
  results: SimulatedCandidate[];
}

const DEFAULT_MANIFEST = JSON.stringify({
  "python": "3.10",
  "fastapi": "0.95",
  "pydantic": "v1"
}, null, 2);

export default function MigrationSimulator() {
  const [manifestText, setManifestText] = useState<string>(DEFAULT_MANIFEST);
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const [selectedOperation, setSelectedOperation] = useState<string>("pydantic_v1_v2");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SimulatedCandidate[]>([]);
  const [simulated, setSimulated] = useState<boolean>(false);

  // Validate JSON live
  useEffect(() => {
    if (!manifestText.trim()) {
      setIsValidJson(false);
      setJsonError("Manifest cannot be empty.");
      return;
    }
    try {
      JSON.parse(manifestText);
      setIsValidJson(true);
      setJsonError(null);
    } catch (e: any) {
      setIsValidJson(false);
      setJsonError(e.message || "Invalid JSON syntax.");
    }
  }, [manifestText]);

  const handleRunSimulation = async () => {
    if (!isValidJson) return;
    setLoading(true);
    setError(null);
    setSimulated(true);

    try {
      const response = await axios.post<SimulationResponse>('/api/migrate/simulate', {
        manifest: manifestText,
        upgrade_operation: selectedOperation
      });
      setResults(response.data.results);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Failed to run simulation backend calculations.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 md:p-8 animate-fadeIn max-w-[1400px] mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col border-b border-slate-900 pb-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Cpu className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold font-display bg-gradient-to-r from-slate-50 via-slate-200 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            "What-If" Infrastructure Playground
          </h1>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          Simulate codebase migrations by evaluating candidate suitability against legacy refactoring roadmaps and verify live historical alignment proofs.
        </p>
      </div>

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Codebase Manifest (JSON Ingestion) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              Current Codebase Manifest (JSON Ingestion)
            </label>
            {isValidJson ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Valid JSON
              </span>
            ) : (
              <span className="text-[10px] font-bold text-rose-450 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 animate-pulse" /> Parsing Error
              </span>
            )}
          </div>
          
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            <textarea
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              className="w-full min-h-[180px] p-4 bg-transparent border-0 font-mono text-sm text-slate-200 focus:outline-none focus:ring-0 resize-y leading-relaxed"
              placeholder="Enter codebase dependencies as JSON..."
              spellCheck={false}
            />
          </div>
          
          {jsonError && (
            <p className="text-xs font-medium text-rose-400 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {jsonError}
            </p>
          )}
        </div>

        {/* Right Column: Dropdown & Run button */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Choose Operation Roadmap Upgrade
            </label>
            
            <div className="relative">
              <select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition duration-200 appearance-none cursor-pointer"
              >
                <option value="pydantic_v1_v2">
                  Migrate Pydantic v1 data layer to Pydantic v2 Type Compilation Core
                </option>
                <option value="wsgi_asgi">
                  Upgrade legacy Synchronous WSGI endpoints to Asynchronous ASGI Event Engines
                </option>
                <option value="in_memory_distributed">
                  Transition Local In-Memory Storage Arrays to Scalable Distributed Caching Pipelines
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
              Selecting an upgrade option targets profiles with specific matching repository histories and parses candidate proofs demonstrating real-world expertise.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={!isValidJson || loading}
            className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 ${
              !isValidJson 
                ? 'bg-slate-800 border border-slate-750 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-450 text-slate-950 hover:shadow-emerald-500/10 active:scale-[0.99] cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling Vector Alignment Proofs...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Simulate Structural Candidate Alignment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results / Inactive state section */}
      <div className="flex flex-col gap-6 mt-4">
        
        {/* Error message */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-rose-955/25 border border-rose-500/20 text-rose-450 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Inactive State */}
        {!simulated && !loading && !error && (
          <div className="flex flex-col items-center justify-center text-center p-16 bg-slate-900/10 border border-slate-900/80 border-dashed rounded-2xl gap-4">
            <Database className="w-12 h-12 text-slate-650" />
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-slate-350">Simulator Engine Idle</h3>
              <p className="text-slate-500 text-xs max-w-md">
                Configure codebase JSON dependencies, choose a target operational roadmap, and run simulation to inspect alignment proofs.
              </p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col gap-5">
            <div className="h-6 w-48 bg-slate-900 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-slate-900 bg-slate-900/20 p-5 rounded-2xl flex flex-col gap-4 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-850" />
                      <div className="flex flex-col gap-2">
                        <div className="h-3.5 w-24 bg-slate-800 rounded" />
                        <div className="h-3 w-32 bg-slate-850 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-slate-800 rounded-lg" />
                  </div>
                  <div className="h-28 w-full bg-slate-950 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Matrix List */}
        {simulated && !loading && !error && (
          <div className="flex flex-col gap-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Simulated Alignment Results ({results.length} Candidates Matched)
            </h2>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/10 border border-slate-900/80 rounded-2xl gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-400">Zero Suitable Candidates</h3>
                <p className="text-slate-500 text-xs max-w-sm">
                  No engineers in registry possess relevant history for the operation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((cand) => (
                  <div 
                    key={cand.id} 
                    className="bg-slate-950 border border-slate-900 hover:border-emerald-500/25 p-5 rounded-2xl flex flex-col justify-between gap-5 transition-all duration-300 hover:-translate-y-0.5 shadow-xl group"
                  >
                    {/* Header profile details */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold uppercase flex items-center justify-center shrink-0">
                          {cand.name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-200 truncate group-hover:text-emerald-400 transition-colors duration-250">
                            {cand.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                            {cand.current_title}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10px] font-bold rounded text-slate-400 shrink-0">
                        Rank #{cand.global_match_rank}
                      </span>
                    </div>

                    {/* Proof Box */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 leading-none">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400/80" /> Verified Historical Alignment Proof
                      </span>
                      <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl font-mono text-[11px] leading-relaxed text-emerald-400/85 whitespace-pre-wrap select-text overflow-x-auto max-h-[140px] shadow-inner">
                        {cand.verified_historical_proof}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

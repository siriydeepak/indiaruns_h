import { useState } from 'react';
import axios from 'axios';
import { 
  Terminal, 
  Cpu, 
  Sparkles, 
  AlertTriangle, 
  Zap, 
  CheckCircle,
  Loader2,
  Lock,
  Shield
} from 'lucide-react';

interface SimulatedCandidate {
  id: string;
  name: string;
  current_title: string;
  global_match_rank: number;
  composite_match_percentage: number;
  location: string;
  verified_historical_proof: string;
}

interface SimulationResponse {
  results: SimulatedCandidate[];
}

interface ChaosSimulatorProps {
  blindMode?: boolean;
}

export default function ChaosSimulator({ blindMode = false }: ChaosSimulatorProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>("redis_stampede");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SimulatedCandidate[]>([]);
  const [simulated, setSimulated] = useState<boolean>(false);

  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    setSimulated(true);

    try {
      const response = await axios.post<SimulationResponse>('/api/chaos/simulate', {
        scenario_id: selectedScenario,
        blind_mode: blindMode
      });
      setResults(response.data.results);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Failed to run chaos simulation calculations.");
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
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold font-display bg-gradient-to-r from-slate-50 via-slate-200 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Chaos Engineering Outage Simulator
          </h1>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          Trigger real-world outage scenarios and semantically match top incident responders capable of mitigating the systems failure.
        </p>
      </div>

      {/* Ingestion & Selection Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/10 border border-slate-900 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        
        {/* Left Column: Outage dropdown */}
        <div className="lg:col-span-8 flex flex-col gap-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            CHOOSE OUTAGE SCENARIO
          </label>
          
          <div className="relative">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full px-4 py-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition duration-200 appearance-none cursor-pointer"
            >
              <option value="redis_stampede">
                Redis Cache Stampede & Thundering Herd (Outage Scenario #1)
              </option>
              <option value="postgres_exhaustion">
                PostgreSQL Connection Pool Exhaustion (Outage Scenario #2)
              </option>
              <option value="kafka_lag">
                Kafka Consumer Lag & Rebalance Anomalies (Outage Scenario #3)
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Running this simulation queries the talent store with dense, non-keyword conceptual profile metrics to retrieve verified incident responders.
          </p>
        </div>

        {/* Right Column: Trigger Button */}
        <div className="lg:col-span-4 flex flex-col justify-end">
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={loading}
            className="w-full py-4.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 hover:shadow-emerald-500/10 rounded-xl text-sm font-black flex items-center justify-center gap-2 active:scale-[0.99] transition-all duration-300 cursor-pointer shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Simulating Incident Response...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Trigger Simulated System Outage</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Outage Results section */}
      <div className="flex flex-col gap-6 mt-2">
        
        {/* Error message */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-rose-955/25 border border-rose-500/20 text-rose-450 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Idle Sandbox State */}
        {!simulated && !loading && !error && (
          <div className="flex flex-col items-center justify-center text-center p-16 bg-slate-900/10 border border-slate-900/80 border-dashed rounded-2xl gap-4">
            <Terminal className="w-12 h-12 text-slate-600" />
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-slate-350">Outage Simulation Pipeline Idle</h3>
              <p className="text-slate-500 text-xs max-w-md">
                Select an outage scenario from the dashboard control panel and trigger a simulated outage to calculate response alignment.
              </p>
            </div>
          </div>
        )}

        {/* Loading Shimmer skeleton */}
        {loading && (
          <div className="flex flex-col gap-5">
            <div className="h-6 w-52 bg-slate-900 rounded animate-pulse" />
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

        {/* Results layout */}
        {simulated && !loading && !error && (
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Chaos Outage Response Results ({results.length} Candidates Scored)
              </h2>
              {blindMode && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase rounded-lg tracking-wider animate-pulse-subtle">
                  <Shield className="w-3.5 h-3.5" /> Anti-Bias Active
                </span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/10 border border-slate-900/80 rounded-2xl gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-400">Zero Incident Responders</h3>
                <p className="text-slate-500 text-xs max-w-sm">
                  No engineers matching these chaos mitigation specs exist in memory.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((cand) => (
                  <div 
                    key={cand.id} 
                    className={`bg-slate-950 border p-5 rounded-2xl flex flex-col justify-between gap-5 transition-all duration-300 hover:-translate-y-0.5 shadow-xl group ${
                      blindMode ? 'border-purple-500/20 hover:border-purple-500/40 hover:bg-slate-900/30' : 'border-slate-900 hover:border-emerald-500/25'
                    }`}
                  >
                    {/* Candidate header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3">
                        {!blindMode ? (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold uppercase flex items-center justify-center shrink-0">
                            {cand.name.charAt(0)}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-450 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5 animate-pulse" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <h3 className={`text-sm font-extrabold truncate group-hover:text-emerald-450 transition-colors duration-250 ${
                            blindMode ? 'text-purple-400' : 'text-slate-200'
                          }`}>
                            {cand.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-550 mt-0.5 truncate flex items-center gap-1.5">
                            <span>{cand.current_title}</span>
                            <span>•</span>
                            {blindMode ? (
                              <span className="inline-flex items-center gap-0.5 text-purple-550/90 italic font-medium">
                                <Lock className="w-2.5 h-2.5" /> Masked
                              </span>
                            ) : (
                              <span>{cand.location}</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 border text-[10px] font-black rounded shrink-0 uppercase ${
                        blindMode 
                          ? 'bg-purple-500/5 border-purple-500/30 text-purple-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        {cand.composite_match_percentage}% Match
                      </span>
                    </div>

                    {/* Proof container */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 leading-none">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400/80" /> Verified Historical Alignment Proof
                      </span>
                      <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl font-mono text-[11.5px] leading-relaxed text-emerald-400/85 whitespace-pre-wrap select-text overflow-y-auto max-h-[140px] shadow-inner">
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

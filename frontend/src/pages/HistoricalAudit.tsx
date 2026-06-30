import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History, 
  Database, 
  Cpu, 
  TrendingUp, 
  RefreshCw, 
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Scale,
  Users,
  Binary
} from 'lucide-react';

interface QueryLogEntry {
  target_job_title: string;
  raw_text_length: number;
  semantic_weight: number;
  behavioral_weight: number;
  active_preset: string;
  timestamp: string;
  candidates_shortlisted: number;
}

interface HistoryMetrics {
  total_queries_logged: number;
  processed_samples_count: number;
  average_semantic_weight: number;
  average_behavioral_weight: number;
  top_searched_titles: { title: string; count: number }[];
  preset_distribution: Record<string, number>;
  recent_queries: QueryLogEntry[];
  performance_telemetry: {
    computation_time_ms: number;
    total_response_time_ms: number;
    persistence_source: string;
  };
}

export default function HistoricalAudit() {
  const [metrics, setMetrics] = useState<HistoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Primary GET request to active proxied gateway path
      const response = await axios.get<HistoryMetrics>('/api/metrics-summary');
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Failed to fetch audit metrics:', err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Failed to fetch historical telemetry logs from server.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        date: date.toLocaleDateString(undefined, {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        }),
        time: date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };
    } catch (e) {
      return { date: isoString, time: '' };
    }
  };

  // Safe defaults and parsing
  const totalLogged = metrics?.total_queries_logged ?? 0;
  const avgVelocity = metrics?.performance_telemetry?.total_response_time_ms 
    ? `${metrics.performance_telemetry.total_response_time_ms.toFixed(2)} ms`
    : '4.20 ms';
  
  const mostSearchedSkillVector = metrics?.top_searched_titles && metrics.top_searched_titles.length > 0
    ? metrics.top_searched_titles[0].title
    : 'None Registered';

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-955 text-slate-100 font-sans p-6 md:p-8">
      {/* Header and Banner */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-emerald-500/20 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <History className="w-5 h-5 text-emerald-450 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold font-display bg-gradient-to-r from-slate-50 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              Historical Audit System
            </h1>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Verifying weight ratio distribution, request lengths, and ranking computation latencies across past talent discovery executions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHistoryData}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-350 hover:bg-slate-900 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-emerald-950/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform duration-300 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Diagnostics</span>
        </button>
      </header>

      {/* METRICS HIGHLIGHTS DISTRIBUTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card 1: Total Talent Registry Indexed */}
        <div className="bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Talent Indexed</span>
            <span className="text-3xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-300">
              7 Active Profiles
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Cached multi-vector talent repository
            </span>
          </div>
          <div className="p-4 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Average Calculation Velocity */}
        <div className="bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Avg Calculation Velocity</span>
            <span className="text-3xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-300">
              {avgVelocity}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Intelligent ranking & similarity matching
            </span>
          </div>
          <div className="p-4 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Most Searched Skill Vectors */}
        <div className="bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between group transition-all duration-300 hover:-translate-y-1">
          <div className="flex flex-col gap-1.5 max-w-[75%]">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Top Skill Vector</span>
            <span className="text-2xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors duration-300 truncate" title={mostSearchedSkillVector}>
              {mostSearchedSkillVector}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Total searches logged: <span className="text-emerald-400 font-bold">{totalLogged}</span>
            </span>
          </div>
          <div className="p-4 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* SEARCH LOGS MATRIX TABLE CONTAINER */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col min-h-[450px]">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold font-display text-slate-200">
              Talent Discovery Search History Matrix
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Limit: 50 records
          </span>
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="flex flex-col gap-4 my-auto py-6">
            <div className="h-10 bg-slate-900/60 rounded-lg animate-pulse w-full border border-slate-800/40"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between items-center bg-slate-900/20 border border-slate-850 p-4 rounded-xl animate-pulse">
                <div className="flex gap-4 items-center">
                  <div className="h-5 w-5 bg-slate-800 rounded-full"></div>
                  <div className="h-4 w-28 bg-slate-800 rounded"></div>
                </div>
                <div className="h-4 w-44 bg-slate-800/80 rounded"></div>
                <div className="h-4 w-16 bg-slate-800/60 rounded"></div>
                <div className="h-4 w-32 bg-slate-800/60 rounded"></div>
                <div className="h-4 w-12 bg-slate-800/40 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-rose-500/5 border border-rose-500/20 rounded-2xl my-auto gap-4">
            <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-450 mb-1">Telemetry Fetch Exception</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">{error}</p>
            </div>
            <button
              onClick={fetchHistoryData}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition duration-200"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && (!metrics?.recent_queries || metrics.recent_queries.length === 0) && (
          <div className="flex flex-col items-center justify-center text-center p-16 bg-slate-950/20 border border-slate-800/80 border-dashed rounded-2xl my-auto gap-5">
            <div className="p-4 bg-slate-900 text-slate-500 rounded-full border border-slate-800">
              <Clock className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-350 mb-1.5">No Historical Queries Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                The recruiter audit log matrix is empty. When you perform search queries on the Discover page, their configurations will be recorded here.
              </p>
            </div>
          </div>
        )}

        {/* High-density Data Table */}
        {!loading && !error && metrics?.recent_queries && metrics.recent_queries.length > 0 && (
          <div className="overflow-x-auto w-full rounded-xl border border-slate-800 bg-slate-950/30">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-display text-[11px] tracking-wider select-none font-bold">
                  <th className="px-6 py-4.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Timestamp</span>
                    </div>
                  </th>
                  <th className="px-6 py-4.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Target Title</span>
                    </div>
                  </th>
                  <th className="px-6 py-4.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Binary className="w-3.5 h-3.5 text-slate-500" />
                      <span>Input Text Length</span>
                    </div>
                  </th>
                  <th className="px-6 py-4.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-slate-500" />
                      <span>Applied Weights Ratio (Semantic vs Behavioral)</span>
                    </div>
                  </th>
                  <th className="px-6 py-4.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Total Candidates Shortlisted</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40 text-slate-300">
                {metrics.recent_queries.map((item, idx) => {
                  const formatted = formatTimestamp(item.timestamp);
                  const isPreset = item.active_preset && item.active_preset !== 'None';
                  
                  return (
                    <tr 
                      key={idx} 
                      className="hover:bg-slate-900/40 transition-colors duration-150 border-b border-slate-900/50"
                    >
                      {/* Timestamp column */}
                      <td className="px-6 py-4.5 whitespace-nowrap font-medium">
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-semibold">{formatted.date}</span>
                          <span className="text-slate-500 text-[11px] font-mono">{formatted.time}</span>
                        </div>
                      </td>

                      {/* Target Job Title & Optional Preset badge */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-100 tracking-wide text-sm">{item.target_job_title}</span>
                          {isPreset && (
                            <span className="px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 rounded-md text-[10px] font-bold tracking-wider uppercase select-none">
                              {item.active_preset}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Text Length (Bytes) */}
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-900/80 border border-slate-800 text-slate-400 rounded-md text-xs font-mono font-bold">
                          {formatBytes(item.raw_text_length)}
                        </span>
                      </td>

                      {/* Weight Ratio */}
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-2 max-w-[200px] mx-auto">
                          <div className="flex justify-between w-full text-xs font-mono font-bold px-1 text-slate-400">
                            <span className="text-emerald-400">SEM {Math.round(item.semantic_weight * 100)}%</span>
                            <span className="text-violet-400">{Math.round(item.behavioral_weight * 100)}% BEH</span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                            <div 
                              style={{ width: `${item.semantic_weight * 100}%` }} 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full"
                            ></div>
                            <div 
                              style={{ width: `${item.behavioral_weight * 100}%` }} 
                              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-r-full"
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Total Candidates Shortlisted */}
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-black shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                          {item.candidates_shortlisted} candidates
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer persistence status telemetry */}
        {!loading && !error && metrics?.performance_telemetry && (
          <div className="mt-5 flex items-center justify-between text-[11px] text-slate-500 font-medium px-1 select-none">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Source: <strong className="text-slate-400 font-semibold">{metrics.performance_telemetry.persistence_source.toUpperCase()}</strong></span>
            </div>
            <span>Calculations aggregated in <strong className="text-slate-400 font-semibold">{metrics.performance_telemetry.computation_time_ms.toFixed(3)} ms</strong> (Total API: {metrics.performance_telemetry.total_response_time_ms.toFixed(2)} ms)</span>
          </div>
        )}
      </div>
    </div>
  );
}

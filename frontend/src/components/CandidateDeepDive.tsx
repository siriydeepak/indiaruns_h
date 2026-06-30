import { 
  X, 
  Activity, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  FileText,
  UserCheck,
  Shield,
  Lock
} from 'lucide-react';

interface VerificationSignals {
  github_verified: boolean;
  portfolio_linked: boolean;
  hackathon_awards_count: number;
}

interface BehavioralSignals {
  profile_completeness: number;
  career_velocity_score: number;
  interaction_response_rate: number;
  days_since_last_activity: number;
}

interface RankedCandidate {
  id: string;
  name: string;
  current_title: string;
  skills: string[];
  semantic_score: number;
  behavioral_score: number;
  composite_score: number;
  behavioral_signals?: BehavioralSignals;
  verification_signals?: VerificationSignals;
  full_resume_text?: string;
  location?: string;
  gender?: string;
}

interface CandidateDeepDiveProps {
  candidate: RankedCandidate | null;
  targetSkills: string[];
  semanticWeight: number;
  behavioralWeight: number;
  blindMode?: boolean;
  onClose: () => void;
}

export default function CandidateDeepDive({ 
  candidate, 
  targetSkills = [], 
  semanticWeight, 
  behavioralWeight, 
  blindMode = false,
  onClose 
}: CandidateDeepDiveProps) {
  if (!candidate) return null;

  const signals = candidate.behavioral_signals || {
    profile_completeness: 0.90,
    career_velocity_score: 3.5,
    interaction_response_rate: 0.80,
    days_since_last_activity: 5
  };

  const matchPercent = Math.round(candidate.composite_score * 100);
  const semanticPercent = Math.round(candidate.semantic_score * 100);
  const behavioralPercent = Math.round(candidate.behavioral_score * 100);

  // SVG parameters for the radial gauge
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (candidate.composite_score * circumference);

  // Velocity Tier Heuristic
  const getVelocityTier = (score: number) => {
    if (score >= 4.6) return { tier: 'High Momentum', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' };
    if (score >= 3.6) return { tier: 'Fast Tracker', color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-500/20' };
    if (score >= 2.6) return { tier: 'Steady Tracker', color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-500/20' };
    return { tier: 'Steady Track', color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' };
  };

  // Activity Status Heuristic
  const getActivityStatus = (days: number) => {
    if (days <= 2) return { status: 'Active within 48 hours', color: 'text-emerald-400', desc: 'Highly receptive to new offers.' };
    if (days <= 7) return { status: 'Active this week', color: 'text-emerald-400/80', desc: 'Regular platform interactions.' };
    if (days <= 30) return { status: 'Active this month', color: 'text-amber-400', desc: 'Moderately active engagement.' };
    return { status: 'Passive Talent', color: 'text-slate-400', desc: 'Not active in the last 30 days.' };
  };

  const velocityInfo = getVelocityTier(signals.career_velocity_score);
  const activityInfo = getActivityStatus(signals.days_since_last_activity);

  // Analyze skills overlap
  const lowercasedCandidateSkills = candidate.skills.map(s => s.toLowerCase());
  const skillMatrix = targetSkills.map(skill => {
    const isMatching = lowercasedCandidateSkills.includes(skill.toLowerCase());
    return { name: skill, match: isMatching };
  });

  const velocityBg = blindMode ? 'bg-purple-950/25 border-purple-500/25' : velocityInfo.bg;
  const velocityColor = blindMode ? 'text-purple-400' : velocityInfo.color;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      {/* Dark overlay click-away */}
      <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

      {/* Modal panel container */}
      <div className={`relative w-full max-w-2xl bg-slate-900 border-l h-full shadow-2xl flex flex-col transition-all duration-300 transform translate-x-0 overflow-y-auto ${
        blindMode ? 'border-purple-500/20' : 'border-emerald-500/20'
      }`}>
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800 bg-slate-955/40">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 transition duration-305 ${
              blindMode ? 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
            }`} />
            <h2 className="text-xl font-extrabold font-display text-slate-100">Talent Fit Diagnostics</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
          {/* Section 1: Visual Match Diagnostics */}
          <div className={`border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg transition duration-300 ${
            blindMode ? 'bg-purple-950/10 border-purple-500/10' : 'bg-slate-955/40 border-slate-850'
          }`}>
            
            {/* Radial circular score gauge */}
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Track circle */}
                <circle 
                  cx="72" cy="72" r={radius} 
                  stroke="rgba(255,255,255,0.03)" 
                  strokeWidth="10" 
                  fill="transparent" 
                />
                {/* Score circle */}
                <circle 
                  cx="72" cy="72" r={radius} 
                  stroke={blindMode ? '#a855f7' : '#10b981'} 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${
                    blindMode ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  }`}
                />
              </svg>
              {/* Inner score label */}
              <div className="absolute flex flex-col items-center">
                <span className={`text-3xl font-extrabold font-display leading-none transition duration-300 ${
                  blindMode ? 'text-purple-400' : 'text-emerald-400'
                }`}>
                  {matchPercent}%
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">
                  Synthesized Fit
                </span>
              </div>
            </div>

            {/* Score Breakdowns */}
            <div className="flex-1 w-full flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-200 font-display">{candidate.name}</h3>
                  {blindMode && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-450 text-[8px] font-extrabold uppercase rounded tracking-wider leading-none">
                      <Shield className="w-2 h-2" /> Compliance Mask
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">{candidate.current_title}</p>
                {(candidate.location || candidate.gender) && (
                  <div className="flex gap-4 mt-2 text-xs text-slate-455 font-medium">
                    {candidate.location && (
                      <span>
                        Location: <span className={blindMode ? 'text-purple-400' : 'text-slate-200'}>{candidate.location}</span>
                      </span>
                    )}
                    {candidate.gender && (
                      <span>
                        Gender: <span className={blindMode ? 'text-purple-400' : 'text-slate-200'}>{candidate.gender}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {/* Contextual Semantic Alignment progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Contextual Semantic Alignment ({semanticWeight}%)</span>
                    <span className={`font-bold transition duration-300 ${blindMode ? 'text-purple-450' : 'text-emerald-400'}`}>
                      {semanticPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 border border-slate-850 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        blindMode ? 'bg-purple-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${semanticPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Behavioral Health Index progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Behavioral Health Index ({behavioralWeight}%)</span>
                    <span className={`font-bold transition duration-300 ${blindMode ? 'text-purple-455' : 'text-emerald-450'}`}>
                      {behavioralPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 border border-slate-850 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        blindMode ? 'bg-purple-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${behavioralPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Behavioral Signal Dashboard */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Activity className={`w-4 h-4 ${blindMode ? 'text-purple-450' : 'text-emerald-400'}`} /> Integrated Heuristics Dashboard
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Career Velocity Gauge */}
              <div className="bg-slate-955/40 border border-slate-850 rounded-xl p-4 flex flex-col gap-2 shadow">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Career Velocity</span>
                <div className={`px-2.5 py-1 text-xs font-bold rounded-lg border text-center ${velocityBg} ${velocityColor}`}>
                  {velocityInfo.tier}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Promotion: <span className="font-semibold text-slate-200">{signals.career_velocity_score}/5.0</span>
                </div>
              </div>

              {/* Engagement Index */}
              <div className="bg-slate-955/40 border border-slate-850 rounded-xl p-4 flex flex-col gap-2 shadow">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Engagement Rate</span>
                <div className="flex items-center justify-between text-xs font-bold text-slate-355">
                  <span>Responsiveness</span>
                  <span className={blindMode ? 'text-purple-400' : 'text-emerald-400'}>{Math.round(signals.interaction_response_rate * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${blindMode ? 'bg-purple-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${signals.interaction_response_rate * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-0.5">Contacts answered</p>
              </div>

              {/* Profile Completeness */}
              <div className="bg-slate-955/40 border border-slate-850 rounded-xl p-4 flex flex-col gap-2 shadow">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Profile Fill</span>
                <div className="flex items-center justify-between text-xs font-bold text-slate-355">
                  <span>Completeness</span>
                  <span className={blindMode ? 'text-purple-400' : 'text-emerald-400'}>{Math.round(signals.profile_completeness * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${blindMode ? 'bg-purple-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${signals.profile_completeness * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-0.5">Profile data depth</p>
              </div>

              {/* Profile Activity Status */}
              <div className="bg-slate-955/40 border border-slate-850 rounded-xl p-4 flex flex-col gap-1.5 shadow">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Platform Recency</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Calendar className={`w-3.5 h-3.5 ${blindMode ? 'text-purple-400' : 'text-emerald-400'}`} />
                  <span className={blindMode ? 'text-purple-450' : activityInfo.color}>{activityInfo.status}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mt-1">
                  Active <span className="font-semibold">{signals.days_since_last_activity} days ago</span>.
                </p>
              </div>

            </div>
          </div>

          {/* Section 3: Contextual Skills Mapping Matrix */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <UserCheck className={`w-4 h-4 ${blindMode ? 'text-purple-455' : 'text-emerald-400'}`} /> Skills Alignment Mapping Matrix
            </h3>

            {skillMatrix.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Requirements (LHS) */}
                <div className="bg-slate-955/30 border border-slate-850 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase text-slate-405 tracking-wider border-b border-slate-850 pb-1.5">
                    Target Job Stack ({skillMatrix.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {skillMatrix.map(skill => (
                      <span 
                        key={skill.name}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition ${
                          skill.match 
                            ? (blindMode 
                                ? 'bg-purple-950/40 border border-purple-500/30 text-purple-300 shadow-md' 
                                : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-md')
                            : 'bg-rose-955/20 border border-rose-500/25 text-rose-400'
                        }`}
                      >
                        {skill.match ? (
                          <CheckCircle2 className={`w-3 h-3 ${blindMode ? 'text-purple-400' : 'text-emerald-400'}`} />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-450" />
                        )}
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Candidate Capabilities (RHS) */}
                <div className="bg-slate-955/30 border border-slate-850 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase text-slate-405 tracking-wider border-b border-slate-850 pb-1.5">
                    Candidate Profile Stack ({candidate.skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map(skill => {
                      const isOverlap = targetSkills.some(ts => ts.toLowerCase() === skill.toLowerCase());
                      return (
                        <span 
                          key={skill}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
                            isOverlap 
                              ? (blindMode ? 'bg-purple-955/40 border-purple-500/30 text-purple-300 font-bold' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-bold') 
                              : 'bg-slate-900 border-slate-850 text-slate-400'
                          }`}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-4 bg-slate-955/20 border border-slate-850 rounded-xl text-center text-xs text-slate-500 italic">
                No target technical skills parsed from the job description for alignment mapping.
              </div>
            )}
          </div>

          {/* Section 4: Resume Highlights */}
          <div className="flex flex-col gap-3 mt-1">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <FileText className={`w-4 h-4 ${blindMode ? 'text-purple-405' : 'text-emerald-400'}`} /> Resume Context Verification
            </h3>
            {blindMode ? (
              <div className="bg-purple-955/10 border border-purple-500/20 rounded-xl p-5 text-center flex flex-col items-center justify-center gap-2 shadow-inner min-h-[96px]">
                <Lock className="w-6 h-6 text-purple-400 animate-pulse" />
                <span className="text-xs font-bold text-purple-300">Resume PII Blocked</span>
                <p className="text-[10px] text-slate-500 max-w-xs">
                  Unstructured resume text is masked to enforce anti-bias selection rules. Disable blind mode to inspect direct credentials text.
                </p>
              </div>
            ) : (
              candidate.full_resume_text ? (
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-sans max-h-40 overflow-y-auto shadow-inner">
                  <p className="whitespace-pre-line">{candidate.full_resume_text}</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-955/20 border border-slate-850 rounded-xl text-center text-xs text-slate-500 italic">
                  No resume text available for this candidate.
                </div>
              )
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

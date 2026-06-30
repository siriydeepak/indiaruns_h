import React, { useState } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  Sliders, 
  Users, 
  Plus, 
  X, 
  AlertTriangle,
  FileText,
  UserCheck,
  ArrowUpDown,
  Shield,
  Link as LinkIcon,
  Trophy,
  Eye,
  EyeOff,
  Bold,
  Italic,
  List,
  RotateCcw,
  Lock,
  Download,
  Loader2
} from 'lucide-react';
import CandidateDeepDive from '../components/CandidateDeepDive';

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

interface CandidateScores {
  composite_match_percentage: number;
  contextual_semantic_fit: number;
  behavioral_signal_index: number;
  experience_status: string;
  verifiability_multiplier_applied: number;
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
  scores?: CandidateScores;
  reasoning?: string;
}

interface RankedShortlistResponse {
  job_id: string;
  results: RankedCandidate[];
  extracted_skills?: string[];
  mandatory_skills?: string[];
  total_candidates_evaluated?: number;
}

interface PresetRole {
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
}

const initialPresets: PresetRole[] = [
  {
    id: 'ml',
    name: 'ML Engineer',
    title: 'Principal Machine Learning Engineer',
    description: 'We are hiring an ML Architect to build scalable deep learning models. Candidate must have extensive knowledge in NLP, Transformers architectures, HuggingFace fine-tuning pipelines, vector search indexes like Qdrant or Milvus, and model serving systems like Triton. Focuses on low latency inference and distributed GPU training optimization.',
    tags: ['PyTorch', 'Transformers', 'HuggingFace', 'Qdrant', 'Triton', 'NLP']
  },
  {
    id: 'cyber',
    name: 'Cyber Security',
    title: 'Cyber Security & SecOps Specialist',
    description: 'We are seeking a Cyber Security Specialist to monitor and safeguard our digital infrastructure. The candidate will manage SIEM alert routing, identify threats, configure corporate firewalls, and conduct penetration testing audits against OWASP Top 10 vulnerabilities. Experience analyzing network packets using Wireshark is highly critical. Strong scripting skills in python/bash are desired.',
    tags: ['SIEM', 'Wireshark', 'OWASP', 'Pentesting', 'Firewalls', 'AWS', 'GCP']
  },
  {
    id: 'ux',
    name: 'UX Researcher',
    title: 'Senior UX Researcher',
    description: 'Looking for a Senior UX Researcher to lead usability testing programs and mapping initiatives. Responsibilities include running structured user interviews, constructing detailed user personas, creating wireframe concepts in Figma, and leading card sorting and A/B testing user evaluation cycles. Must turn complex user qualitative feedback into clean UI requirements.',
    tags: ['Usability Testing', 'User Interviews', 'Wireframing', 'Personas', 'Figma', 'Miro']
  }
];

function getTagsForRole(roleName: string): string[] {
  const name = roleName.toLowerCase();
  if (name.includes('quantum')) {
    return ['Qiskit', 'Cirq', 'Quantum SDK', 'Python'];
  }
  if (name.includes('bio') || name.includes('gene')) {
    return ['Genomics', 'Biopython', 'BLAST', 'R'];
  }
  if (name.includes('blockchain') || name.includes('crypto')) {
    return ['Solidity', 'Rust', 'Web3.js', 'Smart Contracts'];
  }
  if (name.includes('cloud') || name.includes('devops')) {
    return ['Kubernetes', 'Terraform', 'CI/CD', 'AWS'];
  }
  if (name.includes('data scientist') || name.includes('data engineer') || name.includes('analytics')) {
    return ['Pandas', 'SQL', 'Spark', 'Python'];
  }
  if (name.includes('frontend') || name.includes('react') || name.includes('ui') || name.includes('ux')) {
    return ['React', 'TypeScript', 'Tailwind', 'Figma'];
  }
  if (name.includes('backend') || name.includes('api') || name.includes('server')) {
    return ['FastAPI', 'PostgreSQL', 'Docker', 'Go'];
  }
  
  const words = roleName.split(/\s+/).filter(w => w.length > 3).map(w => w.replace(/[^a-zA-Z]/g, ''));
  const candidateTags = [...words, 'Python', 'Docker', 'API', 'SQL', 'Cloud'];
  const uniqueTags = Array.from(new Set(candidateTags)).slice(0, 4);
  return uniqueTags;
}

function getDynamicJobDescription(roleName: string) {
  const title = roleName.trim();
  const cleanName = title.charAt(0).toUpperCase() + title.slice(1);
  const tags = getTagsForRole(cleanName);
  
  const p1 = `We are seeking a high-caliber ${cleanName} to join our advanced technology division. The candidate will lead the design, implementation, and optimization of systems, translating business requirements into scalable technical architectures. This role involves close collaboration with cross-functional engineering teams to integrate modern software patterns with high-performance computing nodes.`;
  const p2 = `In this position, you will be responsible for building and maintaining robust software layers that support high availability and low latency execution. Hands-on experience with core technologies (such as ${tags[0]}, ${tags[1]}, or ${tags[2]}) is highly critical, alongside solid software engineering principles in modern programming languages. You will also focus on performance bottlenecks and database indexing strategies to improve execution fidelity.`;
  const p3 = `The ideal background holds a strong background in computer science, software engineering, or a related technical field. Key deliverables include developing clean APIs, optimizing cloud infrastructure deployment, and introducing automated testing coverage with ${tags[3]} integrations. If you are passionate about solving complex computational challenges and driving engineering excellence, we want you on our team.`;
  
  return {
    description: `${p1}\n\n${p2}\n\n${p3}`,
    tags,
    title: cleanName
  };
}

function extractExperience(text: string | undefined): number {
  if (!text) return 0;
  
  const patterns = [
    /\b(\d+)\s*(?:\+|to|-|–)\s*(\d+)?\s*(?:years?|yrs?)\b/gi,
    /\b(?:experience\s+of\s+|minimum\s+of\s+|at\s+least\s+|have\s+)?(\d+)\s*(?:years?|yrs?)\b/gi,
    /\b(\d+)\s*(?:years?|yrs?)\b\s*(?:of\s+)?(?:professional|relevant|hands-on|industry)?\s*(?:experience)?\b/gi
  ];
  
  const found: number[] = [];
  
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const val = parseInt(match[1], 10);
        if (val > 0 && val < 30) found.push(val);
      }
      if (match[2]) {
        const val = parseInt(match[2], 10);
        if (val > 0 && val < 30) found.push(val);
      }
    }
  }
  
  return found.length > 0 ? Math.max(...found) : 0;
}

export default function RecruiterConsole() {
  // Inputs
  const [jobTitle, setJobTitle] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skillTags, setSkillTags] = useState<string[]>([]);
  
  // Dynamic presets state management
  const [presets, setPresets] = useState<PresetRole[]>(initialPresets);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  
  // Custom Preset Form States (Input Rows Builder)
  const [customPresetName, setCustomPresetName] = useState('');
  const [customPresetTitle, setCustomPresetTitle] = useState('');
  const [customPresetSkills, setCustomPresetSkills] = useState('');
  const [customPresetDesc, setCustomPresetDesc] = useState('');
  
  const [blindMode, setBlindMode] = useState(false);
  
  // Weights (Balanced default summing to 100)
  const [semanticWeight, setSemanticWeight] = useState(60);
  const [behavioralWeight, setBehavioralWeight] = useState(40);
  
  // Scoring / Matching states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<RankedCandidate[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'redrob' | 'custom'>('redrob');
  const [sortField, setSortField] = useState<'composite' | 'semantic' | 'behavioral'>('composite');
  
  // Selected candidate for deep-dive panel
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);

  // Rich Text Editor Helpers
  const handleInsertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('job-spec-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    
    const nextText = text.substring(0, start) + replacement + text.substring(end);
    setRequirementsText(nextText);
    triggerWorkspaceReset();
    
    // Reset caret position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const handleInsertTemplate = (type: string) => {
    let template = '';
    if (type === 'stack') {
      template = `\n\n### Key Technology Stack\n- Core Languages: React, TypeScript, Node.js\n- Frameworks: Next.js, Express.js\n- Database: PostgreSQL, Redis\n- DevOps: Docker, AWS ECS/S3`;
    } else if (type === 'deliverables') {
      template = `\n\n### Primary Deliverables & Responsibilities\n- Design and architect reusable UI components using Tailwind CSS and React hooks.\n- Optimize API integration pathways using Axios for asynchronous telemetry ingestion.\n- Conduct code reviews and support unit testing pipelines.`;
    } else if (type === 'qualifications') {
      template = `\n\n### Preferred Qualifications\n- 4+ years of professional frontend/fullstack engineering experience.\n- Proven track record of building performant, low-latency client applications.\n- Strong comprehension of secure data parsing and design system tokens.`;
    }
    
    const nextText = requirementsText + template;
    setRequirementsText(nextText);
    triggerWorkspaceReset();
  };

  // Custom Preset Row Form submit
  const handleSaveCustomPreset = () => {
    const name = customPresetName.trim();
    if (!name) return;

    const title = customPresetTitle.trim() || name;
    const skills = customPresetSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const description = customPresetDesc.trim() || getDynamicJobDescription(name).description;
    
    const newId = `custom-${Date.now()}`;
    const newPreset: PresetRole = {
      id: newId,
      name,
      title,
      description,
      tags: skills.length > 0 ? skills : getTagsForRole(name)
    };

    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newId);
    
    // Dynamically update workspace inputs:
    setJobTitle(title);
    setRequirementsText(description);
    setSkillTags(newPreset.tags);
    
    // Clear custom form state
    setIsAddingCustom(false);
    setCustomPresetName('');
    setCustomPresetTitle('');
    setCustomPresetSkills('');
    setCustomPresetDesc('');

    // Reset any old search state when saving a custom preset
    triggerWorkspaceReset();
  };

  // Slide Weight Sync (Sums to 100)
  const handleSemanticSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSemanticWeight(val);
    setBehavioralWeight(100 - val);
  };

  const handleBehavioralSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBehavioralWeight(val);
    setSemanticWeight(100 - val);
  };

  // Add Custom Keyword Tag
  const handleAddSkillTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = skillInput.trim();
    if (tag && !skillTags.includes(tag)) {
      setSkillTags(prev => [...prev, tag]);
    }
    setSkillInput('');
  };

  const handleKeyDownSkillInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = skillInput.trim();
      if (tag && !skillTags.includes(tag)) {
        setSkillTags(prev => [...prev, tag]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkillTag = (tag: string) => {
    setSkillTags(prev => prev.filter(t => t !== tag));
  };

  // Search Submit - maps to live, functional FastAPI hybrid vector backend endpoint
  const handleAnalyzeTalentPool = async (e?: React.FormEvent, targetBlindMode?: boolean) => {
    if (e) e.preventDefault();
    
    const activeBlindMode = targetBlindMode !== undefined ? targetBlindMode : blindMode;
    setLoading(true);
    setError(null);
    setSearched(true);
    
    if (activeConsoleTab === 'redrob') {
      try {
        const response = await axios.post<RankedShortlistResponse>(
          `/api/discover/redrob-founding-engineer?blind_mode=${activeBlindMode}`
        );
        setShortlist(response.data.results);
        setTotalEvaluated(response.data.total_candidates_evaluated || null);
        setExtractedSkills(response.data.mandatory_skills || response.data.extracted_skills || []);
      } catch (err: any) {
        console.error(err);
        const errMsg = err.response?.data?.detail || err.message || 'Failed to analyze Redrob founding engineer candidates.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!jobTitle.trim() || !requirementsText.trim()) {
      setError('Job Title and Job Specification are required.');
      setLoading(false);
      return;
    }

    const payload = {
      raw_text_specification: requirementsText.trim(),
      blind_mode: activeBlindMode,
      weight_tuning_override: {
        semantic_fit: parseFloat((semanticWeight / 100).toFixed(2)),
        behavioral_signals: parseFloat((behavioralWeight / 100).toFixed(2))
      }
    };

    try {
      const response = await axios.post<RankedShortlistResponse>('/api/discover', payload);
      setShortlist(response.data.results);
      setTotalEvaluated(response.data.total_candidates_evaluated || null);
      setExtractedSkills(response.data.mandatory_skills || response.data.extracted_skills || skillTags);
      
      // Log search criteria to history persistence database
      try {
        await axios.post('/api/log-query', {
          target_job_title: jobTitle.trim(),
          raw_text_length: requirementsText.trim().length,
          semantic_weight: semanticWeight / 100,
          behavioral_weight: behavioralWeight / 100,
          active_preset: activePresetId || 'None'
        });
      } catch (logErr) {
        console.error('Failed to log search criteria telemetry:', logErr);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to connect to backend candidate calculations.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const downloadHackathonCSV = () => {
    if (shortlist.length === 0) return;
    
    const sorted = [...shortlist];
    // Step 1: Sort alphabetically by candidate ID ascending first
    sorted.sort((a, b) => a.id.localeCompare(b.id));
    // Step 2: Stable sort by score descending (preserves alphabetical order for ties)
    sorted.sort((a, b) => b.composite_score - a.composite_score);
    
    const top100 = sorted.slice(0, 100);
    
    let csvContent = "candidate_id,rank,score,reasoning\n";
    top100.forEach((cand, index) => {
      const rank = index + 1;
      const score = cand.composite_score;
      const reasoning = cand.reasoning || `${cand.scores?.experience_status || "Meets Baseline"}; strong skills in ${cand.skills.slice(0, 3).join(", ")}.`;
      const escapedReasoning = reasoning.replace(/"/g, '""');
      csvContent += `${cand.id},${rank},${score.toFixed(4)},"${escapedReasoning}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "team_TechTitans.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ref for any typing timeouts
  const debounceTimeoutRef = React.useRef<any>(null);

  // Instantly clears old results and returns console to idle state
  const triggerWorkspaceReset = () => {
    setShortlist([]);
    setTotalEvaluated(null);
    setSelectedCandidate(null);
    setError(null);
    setSearched(false);
    setLoading(false);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  // Asynchronous AI context generation block - populates the form inputs
  const generateJobContext = async (roleName: string, presetId: string) => {
    setLoading(true);
    setError(null);
    setShortlist([]);
    setTotalEvaluated(null);
    setSelectedCandidate(null);
    setSearched(false);

    // Cancel any pending typing timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Simulate LLM context extraction latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const { title, description, tags } = getDynamicJobDescription(roleName);

    setJobTitle(title);
    setRequirementsText(description);
    setSkillTags(tags);

    // Save generated details to presets array
    setPresets(prev => prev.map(p => p.id === presetId ? { ...p, title, description, tags } : p));
    setLoading(false);
  };

  // Select Preset Handler - fills workspace fields and clears previous search state
  const handleSelectPreset = async (preset: PresetRole) => {
    setActivePresetId(preset.id);
    triggerWorkspaceReset();

    if (preset.description) {
      // Use existing template text
      setJobTitle(preset.title);
      setRequirementsText(preset.description);
      setSkillTags(preset.tags);
    } else {
      // Custom preset that has not been generated yet
      await generateJobContext(preset.name, preset.id);
    }
  };

  const handleJobTitleChange = (val: string) => {
    setJobTitle(val);
    setActivePresetId(null);
    triggerWorkspaceReset();
  };

  const handleRequirementsTextChange = (val: string) => {
    setRequirementsText(val);
    setActivePresetId(null);
    triggerWorkspaceReset();
  };

  // Sort candidate list based on selection
  const sortedCandidates = [...shortlist].sort((a, b) => {
    if (sortField === 'semantic') {
      return b.semantic_score - a.semantic_score;
    } else if (sortField === 'behavioral') {
      return b.behavioral_score - a.behavioral_score;
    }
    return b.composite_score - a.composite_score;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-955 text-slate-100 font-sans p-6 md:p-8">
      {/* HUD Header */}
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-8 gap-4 transition duration-300 ${
        blindMode ? 'border-purple-500/20' : 'border-emerald-500/20'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`w-6 h-6 transition-all duration-300 ${
              blindMode ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
            }`} />
            <h1 className={`text-3xl font-extrabold font-display bg-gradient-to-r bg-clip-text text-transparent tracking-tight transition duration-300 ${
              blindMode ? 'from-slate-55 to-purple-400' : 'from-slate-55 to-emerald-400'
            }`}>
              Recruiter Console
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            AI-driven vector search & multi-signal behavioral ranking interface
          </p>
        </div>
        
        {/* Preset Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1 uppercase tracking-wider">Presets:</span>
          {presets.map(preset => (
            <button 
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition duration-300 ${
                activePresetId === preset.id 
                  ? (blindMode 
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.2)]' 
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]')
                  : (blindMode 
                      ? 'bg-slate-900 border-slate-800 hover:border-purple-500/40 text-purple-400' 
                      : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40 text-emerald-400')
              }`}
            >
              {preset.name}
            </button>
          ))}
          
          <button 
            type="button"
            onClick={() => {
              setIsAddingCustom(true);
              // Scroll to the builder form
              setTimeout(() => {
                document.getElementById('custom-preset-builder-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className={`px-3 py-1.5 bg-slate-900 border border-dashed hover:text-slate-250 rounded-lg text-xs font-semibold flex items-center gap-1 transition duration-300 ${
              blindMode 
                ? 'border-purple-500/30 hover:border-purple-500/60 text-purple-500 hover:text-purple-455' 
                : 'border-emerald-500/30 hover:border-emerald-500/60 text-emerald-500 hover:text-emerald-455'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Role
          </button>
        </div>
      </header>

      {/* Tab Switcher Headers */}
      <div className="flex items-center gap-3 border-b border-slate-900 pb-4 mb-4">
        <button
          type="button"
          onClick={() => {
            setActiveConsoleTab('redrob');
            triggerWorkspaceReset();
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeConsoleTab === 'redrob'
              ? (blindMode 
                  ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-450')
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-205 hover:bg-slate-905'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Redrob Founding AI Engineer Match</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveConsoleTab('custom');
            triggerWorkspaceReset();
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeConsoleTab === 'custom'
              ? (blindMode 
                  ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-450')
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-205 hover:bg-slate-905'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Custom Query Matcher</span>
        </button>
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: Job Card or Spec Input Area */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {activeConsoleTab === 'redrob' ? (
            <div className={`flex flex-col rounded-2xl p-6 shadow-2xl backdrop-blur-xl gap-5 transition-all duration-300 ${
              blindMode 
                ? 'bg-purple-950/10 border border-purple-500/30' 
                : 'bg-slate-900/60 border border-slate-800'
            }`}>
              <div className="flex items-center gap-2 border-b pb-3 mb-1">
                <Sparkles className="w-5 h-5 text-emerald-450" />
                <h2 className="text-base font-extrabold text-slate-200">Founding AI Engineer JD</h2>
              </div>
              
              <div className="flex flex-col gap-3.5">
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Role & Team</span>
                  <span className="text-sm font-black text-slate-205">Senior AI Engineer — Founding Team</span>
                  <span className="text-[11px] text-slate-450 mt-0.5">Redrob AI (Series A Talent Platform) • Pune/Noida</span>
                </div>
                
                <div className="flex flex-col gap-1.5 text-xs text-slate-350 leading-relaxed font-medium">
                  <span className="text-[10px] text-emerald-455 font-bold uppercase tracking-wider">JD CORE MANDATE</span>
                  <p>
                    Own the intelligence layer (search, retrieval, and matching systems).
                    Title-chasers, consulting-only backgrounds (TCS/Infosys/Wipro), and pure research archetypes are strictly penalized.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="bg-slate-955 border border-slate-900 rounded-xl p-3 flex flex-col">
                    <span className="text-[9px] text-slate-550 font-bold uppercase">Target Experience</span>
                    <span className="text-xs font-bold text-slate-200 mt-1">5–9 Years</span>
                  </div>
                  <div className="bg-slate-955 border border-slate-900 rounded-xl p-3 flex flex-col">
                    <span className="text-[9px] text-slate-550 font-bold uppercase">Location Cadence</span>
                    <span className="text-xs font-bold text-slate-200 mt-1">Pune / Noida (Hybrid)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-4 border-slate-850/40">
                  <span className="text-[10px] text-emerald-455 font-bold uppercase tracking-wider">Required Core Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["embeddings", "retrieval", "vector databases", "python", "evaluation (ndcg, mrr)"].map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-slate-955 border border-slate-850 rounded text-[10px] font-bold text-slate-300 uppercase">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => handleAnalyzeTalentPool()}
                disabled={loading}
                className="w-full mt-4 py-4 bg-emerald-500 hover:bg-emerald-450 text-slate-955 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 select-none shadow-lg hover:shadow-emerald-500/10 transition duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-955" />
                    <span>Analyzing Candidates...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-955" />
                    <span>Run Dedicated Hackathon Evaluator</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleAnalyzeTalentPool} className={`flex flex-col rounded-2xl p-6 shadow-2xl backdrop-blur-xl gap-5 transition-all duration-300 ${
              blindMode 
                ? 'bg-purple-950/10 border border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.05)]' 
                : 'bg-slate-900/60 border border-slate-800 shadow-[0_0_20px_rgba(16,185,129,0.02)]'
            }`}>
            <div className={`flex items-center gap-2 border-b pb-3 mb-2 transition duration-300 ${
              blindMode ? 'border-purple-955/40' : 'border-slate-800'
            }`}>
              <Sliders className={`w-5 h-5 transition duration-300 ${blindMode ? 'text-purple-400' : 'text-emerald-500'}`} />
              <h2 className="text-lg font-bold font-display text-slate-200">Matching Configuration</h2>
            </div>

            {/* Job Title */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Target Job Title</label>
              <input 
                type="text" 
                placeholder="e.g. Lead Cyber Security Specialist"
                value={jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                className={`w-full bg-slate-950 border focus:outline-none transition duration-200 rounded-xl px-4 py-3 text-sm ${
                  blindMode 
                    ? 'border-slate-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20' 
                    : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                }`}
                required
              />
            </div>

            {/* Unstructured specification text (Rich-Text area widget) */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Job Description Spec (Raw text)</label>
                
                {/* Word & Char Counters */}
                <span className="text-[10px] text-slate-500 font-semibold tracking-wide">
                  {requirementsText.trim() ? requirementsText.trim().split(/\s+/).length : 0} words | {requirementsText.length} chars
                </span>
              </div>
              
              <div className={`flex flex-col bg-slate-955 border rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1 ${
                blindMode 
                  ? 'border-slate-800 focus-within:border-purple-500/50 focus-within:ring-purple-500/20' 
                  : 'border-slate-800 focus-within:border-emerald-500/50 focus-within:ring-emerald-500/20'
              }`}>
                {/* Rich text formatting action toolbar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-b border-slate-805 select-none">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown('**', '**')}
                      title="Bold"
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown('*', '*')}
                      title="Italic"
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMarkdown('- ')}
                      title="Bullet List"
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <span className="h-4 w-px bg-slate-800 mx-1"></span>
                    
                    {/* Template buttons */}
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('stack')}
                      className="px-2 py-0.5 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 rounded transition font-semibold"
                    >
                      + Stack
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('deliverables')}
                      className="px-2 py-0.5 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 rounded transition font-semibold"
                    >
                      + Deliverables
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('qualifications')}
                      className="px-2 py-0.5 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 rounded transition font-semibold"
                    >
                      + Qualifications
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { 
                      if(window.confirm('Clear all spec text?')) { 
                        setRequirementsText(''); 
                        triggerWorkspaceReset();
                      } 
                    }}
                    title="Reset Spec"
                    className="p-1 hover:bg-rose-955/30 text-slate-500 hover:text-rose-455 rounded transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea 
                  id="job-spec-textarea"
                  rows={8}
                  placeholder="Paste multi-paragraph job requirements. Use toolbar markdown markers or append predefined templates above..."
                  value={requirementsText}
                  onChange={(e) => handleRequirementsTextChange(e.target.value)}
                  className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none"
                  required
                />
              </div>
              
              {/* Custom Role Preset inline option below textarea */}
              <div className="flex justify-between items-center -mt-1.5 px-1" id="custom-preset-builder-section">
                <span className="text-[11px] text-slate-500 italic">Need inspiration?</span>
                <button 
                  type="button"
                  onClick={() => setIsAddingCustom(prev => !prev)}
                  className={`text-xs font-semibold flex items-center gap-1 transition duration-205 ${
                    blindMode ? 'text-purple-400 hover:text-purple-300' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingCustom ? 'Hide Preset Builder' : '+ Custom Role Preset'}
                </button>
              </div>

              {/* Custom Preset Builder Row Form */}
              {isAddingCustom && (
                <div className={`border rounded-xl p-4 mt-2 flex flex-col gap-3 animate-fadeIn transition-colors duration-350 ${
                  blindMode ? 'bg-purple-950/20 border-purple-500/30' : 'bg-emerald-950/5 border-emerald-500/20'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    blindMode ? 'text-purple-400' : 'text-emerald-400'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Define Custom Preset Row
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold">Preset Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. DevOps Engineer"
                        value={customPresetName}
                        onChange={(e) => setCustomPresetName(e.target.value)}
                        className={`bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 ${
                          blindMode ? 'border-purple-955 focus:border-purple-500' : 'border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold">Target Job Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Lead Systems Engineer"
                        value={customPresetTitle}
                        onChange={(e) => setCustomPresetTitle(e.target.value)}
                        className={`bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-655 focus:outline-none focus:ring-1 ${
                          blindMode ? 'border-purple-955 focus:border-purple-500' : 'border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Skills Override (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Kubernetes, Terraform, Go, AWS"
                      value={customPresetSkills}
                      onChange={(e) => setCustomPresetSkills(e.target.value)}
                      className={`bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-655 focus:outline-none focus:ring-1 ${
                        blindMode ? 'border-purple-955 focus:border-purple-500' : 'border-slate-800 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Initial Job Specification Description</label>
                    <textarea 
                      rows={3}
                      placeholder="Enter job requirements description text..."
                      value={customPresetDesc}
                      onChange={(e) => setCustomPresetDesc(e.target.value)}
                      className={`bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-655 focus:outline-none focus:ring-1 resize-none ${
                        blindMode ? 'border-purple-955 focus:border-purple-500' : 'border-slate-800 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingCustom(false);
                        setCustomPresetName('');
                        setCustomPresetTitle('');
                        setCustomPresetSkills('');
                        setCustomPresetDesc('');
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:text-slate-200 text-slate-400 rounded-lg text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveCustomPreset}
                      disabled={!customPresetName.trim()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                        blindMode 
                          ? 'bg-purple-50 hover:bg-purple-400 text-slate-955' 
                          : 'bg-emerald-500 hover:bg-emerald-450 text-slate-955'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Save Preset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tag overriding block */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Manual Skill Override Tags</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type skill & press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDownSkillInput}
                  className={`flex-1 bg-slate-955 border focus:outline-none transition duration-200 rounded-xl px-4 py-2.5 text-sm ${
                    blindMode 
                      ? 'border-slate-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20' 
                      : 'border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20'
                  }`}
                />
                <button 
                  type="button" 
                  onClick={handleAddSkillTag}
                  className={`px-4 border rounded-xl transition duration-205 flex items-center justify-center ${
                    blindMode 
                      ? 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-450' 
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-450'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Render tags */}
              {skillTags.length > 0 ? (
                <div className={`flex flex-wrap gap-2 mt-2 p-3 bg-slate-955 border rounded-xl transition duration-300 ${
                  blindMode ? 'border-purple-955/40' : 'border-slate-800/80'
                }`}>
                  {skillTags.map(tag => (
                    <span 
                      key={tag}
                      className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-semibold transition duration-300 ${
                        blindMode 
                          ? 'bg-purple-950/40 border-purple-500/25 text-purple-400' 
                          : 'bg-emerald-950/40 border-emerald-500/25 text-emerald-450'
                      }`}
                    >
                      {tag}
                      <button 
                        type="button"
                        onClick={() => handleRemoveSkillTag(tag)}
                        className="hover:opacity-80 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Leave overrides empty to allow the local NLP parser to dynamically extract stack elements from the raw text.
                </p>
              )}
            </div>

            {/* Compliance Controls & Anti-Bias Toggle */}
            <div className={`flex flex-col gap-3 border-t pt-4 mt-1 transition duration-300 ${
              blindMode ? 'border-purple-950/40' : 'border-slate-800/60'
            }`}>
              <button
                type="button"
                id="enable-blind-evaluation-toggle"
                onClick={() => {
                  const nextMode = !blindMode;
                  setBlindMode(nextMode);
                  if (searched) {
                    handleAnalyzeTalentPool(undefined, nextMode);
                  }
                }}
                className={`w-full flex justify-between items-center border rounded-xl p-4 transition-all duration-300 focus:outline-none focus:ring-1 ${
                  blindMode 
                    ? 'bg-purple-950/20 border-purple-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)] focus:border-purple-500 text-purple-300' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 focus:border-slate-650 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`p-2 rounded-lg transition duration-300 ${
                    blindMode ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {blindMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold transition duration-300 ${blindMode ? 'text-purple-300' : 'text-slate-200'}`}>
                      Enable Blind Evaluation (Anti-Bias Mode)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Anonymizes names, masking PII & resume details
                    </span>
                  </div>
                </div>
                
                <div
                  className={`relative inline-flex h-6.5 w-12 items-center rounded-full transition-colors duration-300 ${
                    blindMode ? 'bg-purple-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 transform rounded-full bg-slate-955 transition-transform duration-300 ${
                      blindMode ? 'translate-x-6.5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Real-time Dynamic Sliders */}
            <div className={`flex flex-col gap-4 border-t pt-4 mt-1 transition duration-300 ${
              blindMode ? 'border-purple-955/40' : 'border-slate-800/60'
            }`}>
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Weight Heuristics Tuning</label>
              
              {/* Semantic weight slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Semantic Core Alignment</span>
                  <span className={`font-bold transition duration-300 ${blindMode ? 'text-purple-450' : 'text-emerald-455'}`}>
                    {semanticWeight}%
                  </span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={semanticWeight}
                  onChange={handleSemanticSliderChange}
                  className={`w-full h-1.5 bg-slate-955 rounded-lg appearance-none cursor-pointer ${
                    blindMode ? 'accent-purple-500' : 'accent-emerald-500'
                  }`}
                />
              </div>

              {/* Behavioral weight slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Behavioral Health Index</span>
                  <span className={`font-bold transition duration-300 ${blindMode ? 'text-purple-455' : 'text-emerald-455'}`}>
                    {behavioralWeight}%
                  </span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={behavioralWeight}
                  onChange={handleBehavioralSliderChange}
                  className={`w-full h-1.5 bg-slate-955 rounded-lg appearance-none cursor-pointer ${
                    blindMode ? 'accent-purple-500' : 'accent-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Action button */}
            <button 
              type="submit"
              disabled={loading || !jobTitle.trim() || !requirementsText.trim()}
              className={`w-full mt-2 py-4 font-bold uppercase rounded-xl transition duration-200 flex items-center justify-center gap-2 text-sm tracking-wider shadow-lg ${
                loading
                  ? 'bg-slate-805 text-slate-600 cursor-not-allowed'
                  : (blindMode 
                      ? 'bg-purple-50 hover:bg-purple-400 text-slate-955 shadow-purple-500/10' 
                      : 'bg-emerald-500 hover:bg-emerald-450 text-slate-955 shadow-emerald-500/10')
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-955 border-t-transparent"></div>
                  <span>Recalculating Vector Matrix...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Analyze & Rank Talent Pool</span>
                </>
              )}
            </button>
          </form>
          )}
        </div>

        {/* RIGHT: Live shortlist outputs */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className={`flex flex-col border rounded-2xl p-6 shadow-2xl backdrop-blur-xl min-h-[500px] transition-all duration-305 ${
            blindMode 
              ? 'bg-purple-950/10 border-purple-500/20 shadow-purple-500/5' 
              : 'bg-slate-900/60 border-slate-800 shadow-emerald-500/5'
          }`}>
            <div className={`flex justify-between items-center border-b pb-4 mb-5 flex-wrap gap-4 transition duration-300 ${
              blindMode ? 'border-purple-950/40' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 transition duration-300 ${blindMode ? 'text-purple-400' : 'text-emerald-500'}`} />
                <h2 className={`text-lg font-bold font-display transition duration-300 ${blindMode ? 'text-purple-300' : 'text-slate-200'}`}>
                  Predictive Pipeline Results
                </h2>
                {shortlist.length > 0 && !loading && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className={`px-2.5 py-0.5 border text-xs font-semibold rounded-full transition duration-300 ${
                      blindMode 
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                    }`}>
                      {shortlist.length} Top Matches
                    </span>
                    {totalEvaluated !== null && (
                      <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">
                        ({totalEvaluated.toLocaleString()} Evaluated)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {activeConsoleTab === 'redrob' && shortlist.length > 0 && !loading && (
                <button
                  type="button"
                  onClick={downloadHackathonCSV}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-955 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition duration-200 select-none shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-955" />
                  <span>Export Ranking CSV</span>
                </button>
              )}

              {/* Sorting filters */}
              {shortlist.length > 0 && !loading && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
                  </span>
                  <div className={`border p-0.5 rounded-lg flex text-[11px] transition duration-305 ${
                    blindMode ? 'bg-slate-955 border-purple-955' : 'bg-slate-955 border-slate-800'
                  }`}>
                    <button 
                      type="button"
                      onClick={() => setSortField('composite')}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        sortField === 'composite' 
                          ? (blindMode ? 'bg-purple-500 text-slate-955 font-bold' : 'bg-emerald-500 text-slate-955 font-bold') 
                          : 'text-slate-400 hover:text-slate-205'
                      }`}
                    >
                      Composite Fit
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSortField('semantic')}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        sortField === 'semantic' 
                          ? (blindMode ? 'bg-purple-500 text-slate-955 font-bold' : 'bg-emerald-500 text-slate-955 font-bold') 
                          : 'text-slate-400 hover:text-slate-205'
                      }`}
                    >
                      Vector Match
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSortField('behavioral')}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        sortField === 'behavioral' 
                          ? (blindMode ? 'bg-purple-500 text-slate-955 font-bold' : 'bg-emerald-500 text-slate-955 font-bold') 
                          : 'text-slate-400 hover:text-slate-205'
                      }`}
                    >
                      Behavior
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List Contents */}
            <div className="flex flex-col gap-4 flex-1">
              {/* Pipeline Extraction Diagnostics Panel */}
              {loading && requirementsText.trim().length > 0 && (
                <div className={`bg-slate-955 border-l-4 p-4 rounded-r-xl rounded-l-none animate-pulse flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition duration-300 ${
                  blindMode ? 'border-purple-500/40' : 'border-slate-800'
                }`}>
                  <div className="flex flex-col gap-2 w-full md:w-1/3">
                    <div className="h-4 bg-slate-805 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-slate-805/60 rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="flex gap-2 w-full md:w-2/3 flex-wrap">
                    <div className="h-6 bg-slate-805 rounded w-16 animate-pulse"></div>
                    <div className="h-6 bg-slate-805 rounded w-20 animate-pulse"></div>
                    <div className="h-6 bg-slate-805 rounded w-14 animate-pulse"></div>
                  </div>
                </div>
              )}

              {!loading && searched && !error && requirementsText.trim().length > 0 && shortlist.length > 0 && (
                <div className={`bg-slate-955 border-l-4 p-4 rounded-r-xl rounded-l-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition duration-300 shadow-md ${
                  blindMode ? 'border-purple-500 shadow-purple-950/10' : 'border-emerald-500 shadow-emerald-950/15'
                }`}>
                  {/* Left Block (Hard Constraints) */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Engine Constraints Diagnostics</span>
                    <div className="flex items-center gap-2">
                      <Sliders className={`w-4 h-4 ${blindMode ? 'text-purple-400' : 'text-emerald-500'}`} />
                      <span className="text-xs text-slate-200 font-bold">
                        Parsed Target Constraint: {extractExperience(requirementsText)} Years Minimum
                      </span>
                    </div>
                  </div>

                  {/* Right Block (Identified Tech Tokens) */}
                  <div className="flex flex-col gap-2 w-full md:w-auto md:max-w-xl">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider md:text-right">AI Extracted Skill Entities</span>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {extractedSkills.length > 0 ? (
                        extractedSkills.map(skill => (
                          <span 
                            key={skill}
                            className={`px-2 py-0.5 border text-[10px] font-bold rounded tracking-wide uppercase transition duration-300 ${
                              blindMode 
                                ? 'bg-purple-500/10 border-purple-500/25 text-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.1)]' 
                                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-450 shadow-[0_0_6px_rgba(16,185,129,0.1)]'
                            }`}
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No skills extracted</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex flex-col gap-4 flex-1 justify-center py-10">
                  {/* Pulse Skeleton State */}
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`border rounded-xl p-5 flex flex-col gap-4 animate-pulse transition duration-300 ${
                      blindMode ? 'bg-slate-950 border-purple-500/10 shadow-[0_0_12px_rgba(139,92,246,0.03)]' : 'bg-slate-950 border-slate-800/60'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                          <div className="h-5 w-36 bg-slate-805 rounded-md"></div>
                          <div className="h-4 w-28 bg-slate-805/60 rounded-md"></div>
                        </div>
                        <div className="h-10 w-16 bg-slate-805 rounded-lg"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-slate-805/80 rounded-full"></div>
                        <div className="h-6 w-20 bg-slate-805/80 rounded-full"></div>
                        <div className="h-6 w-14 bg-slate-805/80 rounded-full"></div>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="h-2 w-full bg-slate-805 rounded-full"></div>
                        <div className="h-2 w-5/6 bg-slate-805 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-rose-955/20 border border-rose-500/20 rounded-xl my-auto gap-3">
                  <AlertTriangle className="w-10 h-10 text-rose-505" />
                  <h3 className="text-base font-bold text-rose-450">Calculation Engine Failure</h3>
                  <p className="text-slate-400 text-sm max-w-sm">{error}</p>
                </div>
              )}

              {!searched && !loading && !error && (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-955/40 border border-slate-800/40 border-dashed rounded-xl my-auto gap-4">
                  <FileText className="w-12 h-12 text-slate-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-300 mb-1">Pipeline Engine Idle</h3>
                    <p className="text-slate-500 text-sm max-w-sm">
                      Input requirements spec, override custom skill tags if desired, and click "Analyze & Rank Talent Pool" to view vector comparisons.
                    </p>
                  </div>
                </div>
              )}

              {searched && sortedCandidates.length === 0 && !loading && !error && (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-955/40 border border-slate-800/40 rounded-xl my-auto gap-3">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <h3 className="text-base font-bold text-amber-400">No Candidate Matches</h3>
                  <p className="text-slate-400 text-sm max-w-sm">
                    No candidate records found in primary talent registry database.
                  </p>
                </div>
              )}

              {/* Render candidate list */}
              {!loading && !error && sortedCandidates.length > 0 && (
                <div className="flex flex-col gap-4">
                  {sortedCandidates.map((cand, idx) => {
                    const matchPercent = cand.scores ? cand.scores.composite_match_percentage.toFixed(1) : (cand.composite_score * 100).toFixed(1);

                    // Calculate Verifiable Boost Multiplier
                    const multiplier = cand.scores ? cand.scores.verifiability_multiplier_applied : (() => {
                      let m = 1.0;
                      if (cand.verification_signals?.github_verified) m += 0.1;
                      if (cand.verification_signals?.portfolio_linked) m += 0.1;
                      if (cand.verification_signals?.hackathon_awards_count && cand.verification_signals.hackathon_awards_count > 0) m += 0.1;
                      return m;
                    })();
                    const multiplierStr = `${multiplier.toFixed(1)}x`;
                    
                    return (
                      <div 
                        key={cand.id}
                        onClick={() => setSelectedCandidate(cand)}
                        className={`border transition-all duration-300 p-5 rounded-xl flex flex-col gap-4 group cursor-pointer ${
                          blindMode 
                            ? 'bg-slate-900/40 border-purple-500/20 hover:border-purple-500/40 shadow-lg shadow-purple-500/5 hover:bg-slate-900/60' 
                            : 'bg-slate-950 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-950'
                        }`}
                      >
                        {/* Title details */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4 items-center min-w-0">
                            {/* Avatar Prefix */}
                            {!blindMode ? (
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-450 font-bold uppercase shrink-0">
                                {cand.name.charAt(0)}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                                <Shield className="w-5 h-5 animate-pulse" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-500 uppercase font-display">Rank #{idx + 1}</span>
                                <h3 className={`text-base font-bold transition duration-305 truncate ${
                                  blindMode 
                                    ? 'text-purple-400 group-hover:text-purple-300' 
                                    : 'text-slate-205 group-hover:text-emerald-400'
                                }`}>
                                  {blindMode ? (cand.name.startsWith("REDACTED") ? cand.name : `Candidate ${cand.id.toUpperCase()}`) : cand.name}
                                </h3>
                                {blindMode && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-extrabold uppercase rounded tracking-wider leading-none animate-pulse-subtle">
                                    <Shield className="w-2.5 h-2.5 animate-spin-slow" /> Anti-Bias Masked
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{cand.current_title}</span>
                                {cand.location && (
                                  <>
                                    <span className="text-slate-650">•</span>
                                    <span className="flex items-center gap-1">
                                      {blindMode ? (
                                        <>
                                          <Lock className="w-3.5 h-3.5 animate-pulse text-purple-500" />
                                          <span className="text-purple-400/85 font-semibold italic text-[11px]">Location Masked</span>
                                        </>
                                      ) : (
                                        cand.location
                                      )}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          {/* Score badge */}
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`px-2.5 py-1 border text-xs font-bold rounded-lg tracking-wider transition-all duration-300 ${
                              blindMode 
                                ? 'bg-purple-500/10 border-purple-500/35 text-purple-400 shadow-[0_0_8px_rgba(139,92,246,0.15)]' 
                                : cand.composite_score >= 0.85
                                ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-450 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : cand.composite_score >= 0.70
                                ? 'bg-blue-500/10 border-blue-500/35 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              {matchPercent}% Match
                            </span>
                          </div>
                        </div>

                        {/* Interactive Skill chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {cand.skills.map(skill => {
                            const isMatch = extractedSkills.some(
                              reqSkill => reqSkill.toLowerCase().trim() === skill.toLowerCase().trim()
                            );
                            return (
                              <span 
                                key={skill}
                                className={`px-2.5 py-0.5 border rounded-md text-[10px] font-semibold transition duration-300 ${
                                  isMatch 
                                    ? (blindMode 
                                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.1)]' 
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-455 shadow-[0_0_6px_rgba(16,185,129,0.1)]'
                                      )
                                    : 'bg-slate-900 border border-slate-850 text-slate-400 hover:border-slate-750'
                                }`}
                              >
                                {skill}
                              </span>
                            );
                          })}
                        </div>

                        {/* Dynamic Match Reasoning Callout */}
                        {cand.reasoning && (
                          <div className={`p-3 rounded-lg border text-xs leading-relaxed font-medium transition duration-300 ${
                            blindMode 
                              ? 'bg-purple-950/20 border-purple-500/20 text-purple-300' 
                              : 'bg-slate-900/40 border-slate-850 text-slate-350'
                          }`}>
                            <span className="font-extrabold text-[10px] uppercase text-emerald-450 tracking-wider block mb-1">
                              Match Reasoning:
                            </span>
                            "{cand.reasoning}"
                          </div>
                        )}

                        {/* Verification Signals (Verification Loops) */}
                        {cand.verification_signals && (
                          <div className="flex flex-wrap gap-2 items-center border-t pt-3 border-slate-850/30">
                            <span className="text-[9px] text-slate-505 uppercase font-bold tracking-wider">Verification Loops:</span>
                            {cand.verification_signals.github_verified && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                blindMode 
                                  ? 'bg-purple-950/20 border-purple-500/20 text-purple-300' 
                                  : 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                                <Shield className="w-3 h-3 text-purple-450" /> GitHub Verified
                              </span>
                            )}
                            {cand.verification_signals.portfolio_linked && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                blindMode 
                                  ? 'bg-purple-950/20 border-purple-500/20 text-purple-300' 
                                  : 'bg-emerald-950/10 border-emerald-500/20 text-emerald-450'
                              }`}>
                                <LinkIcon className="w-3 h-3 text-cyan-400" /> Portfolio Linked
                              </span>
                            )}
                            {cand.verification_signals.hackathon_awards_count > 0 && (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                blindMode 
                                  ? 'bg-purple-950/20 border-purple-500/20 text-purple-300' 
                                  : 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400'
                              }`}>
                                <Trophy className="w-3 h-3 text-amber-400" /> Awards: {cand.verification_signals.hackathon_awards_count}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Match metrics and status indicators (4-column layout) */}
                        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-1 border rounded-xl p-3.5 transition duration-300 ${
                          blindMode ? 'bg-slate-900/10 border-purple-955' : 'bg-slate-900/30 border-slate-850'
                        }`}>
                          
                          {/* Semantic fit progress bar */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <span>Semantic Core Alignment</span>
                              <span className={`font-bold transition duration-300 ${blindMode ? 'text-purple-455' : 'text-emerald-455'}`}>
                                {cand.scores ? Math.round(cand.scores.contextual_semantic_fit * 100) : Math.round(cand.semantic_score * 100)}%
                              </span>
                            </div>
                            <div className={`w-full border h-2 rounded-full overflow-hidden transition duration-300 ${
                              blindMode ? 'bg-slate-905 border-purple-955' : 'bg-slate-900 border-slate-850'
                            }`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  blindMode ? 'bg-gradient-to-r from-purple-600 to-purple-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-450'
                                }`} 
                                style={{ width: `${(cand.scores ? cand.scores.contextual_semantic_fit : cand.semantic_score) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Behavioral Health Progress Bar */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <span>Behavioral Health Index</span>
                              <span className={`font-bold transition duration-300 ${blindMode ? 'text-purple-455' : 'text-emerald-455'}`}>
                                {cand.scores ? Math.round(cand.scores.behavioral_signal_index * 100) : Math.round(cand.behavioral_score * 100)}%
                              </span>
                            </div>
                            <div className={`w-full border h-2 rounded-full overflow-hidden transition duration-300 ${
                              blindMode ? 'bg-slate-905 border-purple-955' : 'bg-slate-900 border-slate-850'
                            }`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  blindMode ? 'bg-gradient-to-r from-purple-600 to-purple-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-450'
                                }`} 
                                style={{ width: `${(cand.scores ? cand.scores.behavioral_signal_index : cand.behavioral_score) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Experience Metric */}
                          <div className="flex flex-col gap-1 justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Experience Metric</span>
                            <div className="flex items-center mt-0.5">
                              <span className={`px-2 py-0.5 border text-[10px] font-extrabold rounded tracking-wide uppercase transition duration-300 ${
                                blindMode
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                  : (cand.scores?.experience_status === "Exceeds Profile" ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450 shadow-[0_0_6px_rgba(16,185,129,0.1)]' : 'bg-blue-500/10 border-blue-500/30 text-blue-400')
                              }`}>
                                {blindMode ? "Anti-Bias Masked" : (cand.scores?.experience_status === "Exceeds Profile" ? "Exceeds Profile" : "Meets Baseline")}
                              </span>
                            </div>
                          </div>

                          {/* Verifiable Boost Multiplier */}
                          {cand.scores && cand.scores.verifiability_multiplier_applied > 1.0 ? (
                            <div className="flex flex-col gap-1 justify-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Verifiable Boost</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-2.5 py-0.5 border text-[10px] font-extrabold rounded tracking-wide uppercase transition duration-305 ${
                                  blindMode ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-emerald-500/25 border-emerald-500/40 text-emerald-450'
                                }`}>
                                  {multiplierStr} Boost
                                </span>
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    blindMode ? 'bg-purple-400' : 'bg-emerald-400'
                                  }`}></span>
                                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                    blindMode ? 'bg-purple-500' : 'bg-emerald-500'
                                  }`}></span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 justify-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Verifiable Boost</span>
                              <div className="flex items-center mt-0.5">
                                <span className="text-[10px] text-slate-500 italic">No boost applied</span>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      
      {/* Visual Candidate Deep Dive Diagnostics Slide-Over Drawer */}
      <CandidateDeepDive 
        candidate={selectedCandidate}
        targetSkills={extractedSkills}
        semanticWeight={semanticWeight}
        behavioralWeight={behavioralWeight}
        blindMode={blindMode}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}

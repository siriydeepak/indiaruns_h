import { useState } from 'react';
import axios from 'axios';
import { 
  UserPlus, 
  Github, 
  Globe, 
  Trophy, 
  Sliders, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Shield,
  UploadCloud,
  Trash2,
  Database,
  Info
} from 'lucide-react';

interface AddCandidateFormProps {
  onSuccess?: () => void;
}

export default function AddCandidateForm({ onSuccess }: AddCandidateFormProps) {
  // Ingestion wizard mode switcher state
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');

  // 1. Structured Text Fields State (Manual Intake)
  const [fullName, setFullName] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [location, setLocation] = useState('Remote');
  const [gender, setGender] = useState('Not Disclosed');

  // 2. Verifiable Signal Checklist State
  const [githubVerified, setGithubVerified] = useState(false);
  const [portfolioLinked, setPortfolioLinked] = useState(false);
  const [awardsCount, setAwardsCount] = useState(0);

  // 3. Telemetry Metadata Sliders State
  const [profileCompleteness, setProfileCompleteness] = useState(0.85); // default 85%
  const [interactionRate, setInteractionRate] = useState(0.90); // default 90%
  const [careerVelocity, setCareerVelocity] = useState(3.5); // default 3.5

  // Bulk Ingestion states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedCandidates, setParsedCandidates] = useState<any[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // JSONL/Streaming state variables
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isJsonlFile, setIsJsonlFile] = useState(false);

  // Bulk upload progressive stats
  const [bulkIngesting, setBulkIngesting] = useState(false);
  const [bulkSuccessSummary, setBulkSuccessSummary] = useState<{ success: number; errors: number } | null>(null);

  // Database Management states
  const [dbLoading, setDbLoading] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string | null>(null);

  // Request & Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Manual Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim() || !currentTitle.trim() || !resumeText.trim()) {
      setError('Candidate Name, Current Job Title, and Resume Text are required fields.');
      return;
    }

    const parsedSkills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (parsedSkills.length === 0) {
      setError('Please enter at least one technical skill.');
      return;
    }

    setLoading(true);

    const payload = {
      id: `cand_${Date.now()}`,
      name: fullName.trim(),
      current_title: currentTitle.trim(),
      full_resume_text: resumeText.trim(),
      skills: parsedSkills,
      location: location.trim() || 'Remote',
      gender: gender,
      verification_signals: {
        github_verified: githubVerified,
        portfolio_linked: portfolioLinked,
        hackathon_awards_count: Number(awardsCount)
      },
      behavioral_signals: {
        profile_completeness: Number(profileCompleteness),
        career_velocity_score: Number(careerVelocity),
        interaction_response_rate: Number(interactionRate),
        days_since_last_activity: 1
      }
    };

    try {
      await axios.post('/api/candidates/add', payload);
      setSuccess(true);
      resetManualForm();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to submit candidate profile:', err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Failed to submit candidate profile data to active database registry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetManualForm = () => {
    setFullName('');
    setCurrentTitle('');
    setSkillsInput('');
    setResumeText('');
    setLocation('Remote');
    setGender('Not Disclosed');
    setGithubVerified(false);
    setPortfolioLinked(false);
    setAwardsCount(0);
    setProfileCompleteness(0.85);
    setInteractionRate(0.90);
    setCareerVelocity(3.5);
  };

  // Bulk File Selection handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const processUploadedFile = (file: File) => {
    setSelectedFile(file);
    setFileError(null);
    setBulkSuccessSummary(null);
    setParsedCandidates([]);

    const isJson = file.name.endsWith('.json');
    const isJsonl = file.name.endsWith('.jsonl');
    setIsJsonlFile(isJsonl);

    if (!isJson && !isJsonl) {
      setFileError('File format must be JSON (.json) or JSONL (.jsonl).');
      return;
    }

    if (isJsonl) {
      // Slice file to read first 15KB for sample preview, avoiding DOM tab crash
      const blobSlice = file.slice(0, 15000);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const previewArray: any[] = [];
          
          for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const line = lines[i].trim();
            if (line) {
              try {
                previewArray.push(JSON.parse(line));
              } catch (e) {
                // skip cut-off trailing JSON object
              }
            }
          }
          setParsedCandidates(previewArray);
        } catch (err: any) {
          setFileError('Invalid JSONL structure.');
        }
      };
      reader.readAsText(blobSlice);
    } else {
      // Read entire JSON file for preview & verification
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const json = JSON.parse(text);
          const candidatesArray = Array.isArray(json) ? json : [json];
          setParsedCandidates(candidatesArray);
        } catch (err: any) {
          setFileError('Invalid JSON structure. Failed to parse file.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Progressive Multipart Streaming Upload
  const handleBulkIngest = async () => {
    if (!selectedFile) return;
    
    setBulkIngesting(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setError(null);
    setSuccess(false);
    setBulkSuccessSummary(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post('/api/candidates/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            if (percentCompleted === 100) {
              setIsProcessing(true);
            }
          }
        }
      });
      
      setBulkSuccessSummary({
        success: res.data.success_count || 0,
        errors: res.data.error_count || 0
      });
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to ingest candidate dataset:', err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Failed to upload and ingest candidate dataset.'
      );
    } finally {
      setBulkIngesting(false);
      setUploadProgress(null);
      setIsProcessing(false);
      setSelectedFile(null);
      setParsedCandidates([]);
    }
  };

  // Clear Database operations
  const handleClearDatabase = async (reseed: boolean = false) => {
    setDbLoading(true);
    setDbStatusMsg(null);
    setError(null);
    setSuccess(false);
    try {
      const res = await axios.post(`/api/candidates/clear?reseed=${reseed}`);
      setDbStatusMsg(res.data.message);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to configure target database state.'
      );
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      
      {/* Tab Switcher Headers */}
      <div className="flex items-center gap-3 border-b border-slate-900 pb-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('manual');
            setError(null);
            setSuccess(false);
            setDbStatusMsg(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
              : 'bg-slate-955 border border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Manual Entry Form</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('bulk');
            setError(null);
            setSuccess(false);
            setDbStatusMsg(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'bulk'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
              : 'bg-slate-955 border border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Ingest (JSON / JSONL)</span>
        </button>
      </div>

      {/* Status Alerts Banners */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="flex-1 text-sm font-semibold">
            Ingestion handshake verified successfully! Profiles have been dynamically loaded into the multi-vector talent repository.
          </div>
          <button 
            type="button" 
            onClick={() => setSuccess(false)}
            className="text-xs text-emerald-500 hover:text-emerald-400 uppercase font-black tracking-wide cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {dbStatusMsg && (
        <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl animate-fadeIn">
          <Database className="w-5 h-5 shrink-0" />
          <div className="flex-1 text-sm font-semibold">{dbStatusMsg}</div>
          <button 
            type="button" 
            onClick={() => setDbStatusMsg(null)}
            className="text-xs text-purple-500 hover:text-purple-455 uppercase font-black tracking-wide cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-xl animate-fadeIn">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1 text-sm font-semibold">{error}</div>
          <button 
            type="button" 
            onClick={() => setError(null)}
            className="text-xs text-rose-500 hover:text-rose-455 uppercase font-black tracking-wide cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Content 1: Manual Structured Intake Form */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Structured Profile Details */}
            <div className="lg:col-span-7 flex flex-col gap-5 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-450" /> Structured Candidate Credentials
              </h3>

              {/* Full Name & Title grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Candidate Full Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-850 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Current Job Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-850 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Technical Skills Tag Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Declared Technical Skills</label>
                  <span className="text-[9px] text-slate-550 italic font-medium">Comma-separated entries</span>
                </div>
                <input 
                  type="text"
                  placeholder="React, TypeScript, Python, FastAPI, Docker, Kubernetes"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-850 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200"
                  required
                />
              </div>

              {/* Location & Gender Option grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Geographic Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-850 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Disclosed Gender</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-850 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200"
                  >
                    <option value="Not Disclosed">Not Disclosed</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                  </select>
                </div>
              </div>

              {/* Unstructured Resume Document Area */}
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Unstructured Resume Text Context
                </label>
                <textarea 
                  placeholder="Paste raw unstructured resume details or CV text document here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="w-full min-h-[160px] flex-1 bg-slate-955 border border-slate-850 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition rounded-xl px-4 py-3 text-xs font-medium text-slate-300 resize-none font-mono leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* Right Column: Algorithmic Verification & Telemetry sliders */}
            <div className="lg:col-span-5 flex flex-col gap-6 w-full">
              
              {/* Sub-section 1: Algorithmic Verification Signals Checklist */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-xl backdrop-blur-xl flex flex-col gap-5">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-450" /> Algorithmic Verification Parameters
                </h3>

                {/* Checkbox 1: Github Verified */}
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900/60 rounded-xl hover:border-slate-800 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg">
                      <Github className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">GitHub Source Repos</span>
                      <span className="text-[9px] text-slate-550 font-medium">Verify credentials via code footprint</span>
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={githubVerified}
                      onChange={(e) => setGithubVerified(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-350 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-transparent"></div>
                  </label>
                </div>

                {/* Checkbox 2: Portfolio website */}
                <div className="flex items-center justify-between p-3 bg-slate-955 border border-slate-900/60 rounded-xl hover:border-slate-800 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Professional Portfolio</span>
                      <span className="text-[9px] text-slate-550 font-medium">Linked and responsive website</span>
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={portfolioLinked}
                      onChange={(e) => setPortfolioLinked(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-350 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-transparent"></div>
                  </label>
                </div>

                {/* Counter: Hackathons Count */}
                <div className="flex items-center justify-between p-3 bg-slate-955 border border-slate-900/60 rounded-xl hover:border-slate-800 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Hackathon Milestones</span>
                      <span className="text-[9px] text-slate-550 font-medium">National awards & accomplishments</span>
                    </div>
                  </div>
                  
                  <input 
                    type="number"
                    min="0"
                    max="50"
                    value={awardsCount}
                    onChange={(e) => setAwardsCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-slate-900 border border-slate-800 focus:outline-none text-center py-1.5 rounded-lg text-xs font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              {/* Sub-section 2: Telemetry Metadata Sliders */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-xl backdrop-blur-xl flex flex-col gap-5">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-450" /> Behavioral Telemetry Sliders
                </h3>

                {/* Slider 1: Profile Completeness */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-350">Profile Completeness</span>
                    <span className="text-emerald-400 font-mono font-extrabold">{Math.round(profileCompleteness * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={profileCompleteness}
                    onChange={(e) => setProfileCompleteness(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-955 border border-slate-900/60 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Slider 2: Response Rate */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-350">Interaction Response Rate</span>
                    <span className="text-emerald-400 font-mono font-extrabold">{Math.round(interactionRate * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={interactionRate}
                    onChange={(e) => setInteractionRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-955 border border-slate-900/60 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Slider 3: Career Velocity */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-350">Career Velocity Index</span>
                    <span className="text-emerald-400 font-mono font-extrabold">{careerVelocity.toFixed(1)} / 5.0</span>
                  </div>
                  <input 
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={careerVelocity}
                    onChange={(e) => setCareerVelocity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-955 border border-slate-900/60 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Submission Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetManualForm}
                  disabled={loading}
                  className="w-1/3 py-3.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:text-slate-200 text-slate-400 rounded-xl text-xs font-bold uppercase transition select-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Form
                </button>
                
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3.5 bg-emerald-500 hover:bg-emerald-450 text-slate-955 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 select-none shadow-lg hover:shadow-emerald-500/10 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-955" />
                      <span>Processing Intake...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-slate-955" />
                      <span>Ingest Profile Data</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* Tab Content 2: Bulk JSON Ingestion File Area */}
      {activeTab === 'bulk' && (
        <div className="flex flex-col gap-6 w-full animate-fadeIn">
          
          {/* Main upload zone & DB action rows */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Drag and drop JSON/JSONL file receiver */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 min-h-[300px] text-center relative ${
                  isDragActive 
                    ? 'border-emerald-400 bg-emerald-500/5 scale-[0.99]' 
                    : 'border-slate-800 bg-slate-900/10 hover:border-slate-700/60 hover:bg-slate-900/20'
                }`}
              >
                <input 
                  type="file" 
                  accept=".json,.jsonl"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={bulkIngesting}
                />
                
                <div className="p-4 bg-slate-950/60 text-emerald-400 border border-slate-900 rounded-2xl mb-4 group-hover:scale-110 transition duration-200">
                  {bulkIngesting ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-emerald-400" />
                  )}
                </div>

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-slate-200">{selectedFile.name}</span>
                    <span className="text-xs text-slate-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-sm">
                    <span className="text-sm font-bold text-slate-200">Drag and drop your candidate dataset here</span>
                    <span className="text-xs text-slate-500 mt-1.5">or click to browse your local computer files</span>
                    <span className="text-[10px] bg-slate-900/60 border border-slate-900 text-slate-550 font-black px-2.5 py-1 rounded-full uppercase tracking-wider mt-4">
                      JSON or JSONL Files
                    </span>
                  </div>
                )}

                {fileError && (
                  <div className="mt-4 text-xs font-semibold text-rose-455 bg-rose-500/5 px-4 py-2 border border-rose-500/10 rounded-xl">
                    {fileError}
                  </div>
                )}
              </div>

              {/* Progress Bar (Visible when bulk uploading or ingesting file) */}
              {bulkIngesting && uploadProgress !== null && (
                <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl shadow-lg flex flex-col gap-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-350">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      {isProcessing ? "Processing candidate dataset on server..." : `Uploading file...`}
                    </span>
                    <span className="text-emerald-400 font-mono font-black">
                      {uploadProgress}%
                    </span>
                  </div>
                  
                  {/* Outer track */}
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider text-right">
                    {isProcessing ? "Streaming & executing constraints pipeline sequentially" : "Uploading dataset file to FastAPI backend..."}
                  </span>
                </div>
              )}

              {/* Success metrics box */}
              {bulkSuccessSummary && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 p-5 rounded-2xl shadow-lg flex flex-col gap-2 animate-fadeIn">
                  <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Ingestion Pipeline Complete
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-slate-955 border border-slate-900 rounded-xl p-3 flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Successfully Ingested</span>
                      <span className="text-lg font-black text-emerald-400">{bulkSuccessSummary.success.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-955 border border-slate-900 rounded-xl p-3 flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Errors / Skips</span>
                      <span className="text-lg font-black text-rose-455">{bulkSuccessSummary.errors.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Trigger Button */}
              {parsedCandidates.length > 0 && !bulkIngesting && (
                <button
                  type="button"
                  onClick={handleBulkIngest}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-450 text-slate-955 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 select-none shadow-lg hover:shadow-emerald-500/10 transition duration-200"
                >
                  <UserPlus className="w-4 h-4 text-slate-955" />
                  <span>
                    {isJsonlFile 
                      ? `Upload & Stream Ingestion` 
                      : `Upload & Index ${parsedCandidates.length.toLocaleString()} Candidates`}
                  </span>
                </button>
              )}
            </div>

            {/* Right: Selected File Stats Cards & DB Actions Drawer */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Box 1: File Stats & First Candidate Preview */}
              {parsedCandidates.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-xl backdrop-blur-xl flex flex-col gap-4 animate-fadeIn">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-450" /> Dataset Insights
                  </h3>
                  
                  <div className="flex flex-col gap-1 bg-slate-955 border border-slate-900 rounded-xl p-4.5">
                    <span className="text-[9px] text-slate-550 font-bold uppercase">Record Pool Size</span>
                    <span className="text-xl font-black text-slate-100">
                      {isJsonlFile ? "JSONL Stream Dataset" : `${parsedCandidates.length.toLocaleString()} profiles detected`}
                    </span>
                  </div>

                  {/* Previews mapping */}
                  <div className="flex flex-col gap-2.5 mt-1">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Candidate Sample Preview:</span>
                    {parsedCandidates.slice(0, 3).map((cand, idx) => {
                      const name = cand.profile?.anonymized_name || cand.name || `Candidate #${idx + 1}`;
                      const title = cand.profile?.current_title || cand.current_title || 'Unknown Title';
                      const company = cand.profile?.current_company || cand.current_company || 'Unknown Company';
                      return (
                        <div key={idx} className="flex flex-col bg-slate-955 border border-slate-850 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-200">{name}</span>
                          <span className="text-[10px] text-slate-450 mt-0.5">{title} at {company}</span>
                        </div>
                      );
                    })}
                    {isJsonlFile ? (
                      <span className="text-[9px] text-slate-550 italic text-center mt-1">
                        + Streaming dataset values sequentially...
                      </span>
                    ) : (
                      parsedCandidates.length > 3 && (
                        <span className="text-[9px] text-slate-550 italic text-center mt-1">
                          + {parsedCandidates.length - 3} more profiles in payload...
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Box 2: Database Management Console controls */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-xl backdrop-blur-xl flex flex-col gap-4">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-450" /> Database Administration
                </h3>
                
                <p className="text-[11px] text-slate-455 leading-relaxed font-medium">
                  Perform database resets or seed mock vectors to clear custom talent structures before running evaluations.
                </p>

                <div className="flex flex-col gap-3.5 mt-2">
                  {/* Action 1: Reseed Default Mock Profiles */}
                  <button
                    type="button"
                    onClick={() => handleClearDatabase(true)}
                    disabled={dbLoading || bulkIngesting}
                    className="w-full py-3 bg-slate-950 border border-slate-900 hover:border-slate-850 text-slate-300 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {dbLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <Database className="w-4 h-4 text-emerald-450" />
                    )}
                    <span>Reset to default 9 profiles</span>
                  </button>

                  {/* Action 2: Wipe database entirely */}
                  <button
                    type="button"
                    onClick={() => handleClearDatabase(false)}
                    disabled={dbLoading || bulkIngesting}
                    className="w-full py-3 bg-slate-955 border border-slate-900 hover:border-rose-900/30 text-rose-455 hover:bg-rose-950/5 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {dbLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-450" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-rose-450" />
                    )}
                    <span>Wipe all candidate data</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { Upload, FileText, Briefcase, CheckCircle, AlertCircle, Loader2, ChevronRight, BarChart, Sparkles, TrendingUp, TrendingDown, Star, Lightbulb, User, Link as LinkIcon, Columns2, Download } from 'lucide-react';
import JobFitView from './JobFitView';
import ExportReport from './ExportReport';

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [showExport, setShowExport] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) { setError("Please select a resume PDF first."); return; }
    setError(null); setResult(null); setLoading(true); setActiveTab('summary');
    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription.trim()) formData.append('job_description', jobDescription);
    try {
      const response = await fetch('http://localhost:8080/api/analyze', { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Failed to analyze resume.");
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message || "Analysis failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const llm = result?.llm_analysis;
  const hasLlm = llm && !llm.error;

  const expLevelColor = {
    'Junior': 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    'Mid-Level': 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    'Senior': 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    'Lead/Principal': 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl shadow-2xl shadow-indigo-500/10 mb-4 ring-1 ring-white/10">
            <BarChart className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-purple-300">
            Neural Resume Analyzer
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">
            Hybrid AI engine — deterministic NLP extraction powered by spaCy + deep contextual analysis via Google Gemini LLM.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">spaCy NER</span>
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">Regex Engine</span>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gemini LLM</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl transition-all hover:bg-white/[0.07]">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-indigo-300">
                <FileText className="w-5 h-5 mr-2" /> Upload Resume
              </h2>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-indigo-500/30 rounded-2xl cursor-pointer bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-400 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-indigo-400 mb-3 group-hover:-translate-y-1 transition-transform" />
                  <p className="mb-2 text-sm text-slate-300"><span className="font-semibold text-indigo-300">Click to upload</span> or drag & drop</p>
                  <p className="text-xs text-slate-500">PDF documents only</p>
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              </label>
              {file && (
                <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-200 truncate pr-4">{file.name}</span>
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl transition-all hover:bg-white/[0.07]">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-purple-300">
                <Briefcase className="w-5 h-5 mr-2" /> Job Description <span className="text-xs ml-2 px-2 py-1 bg-white/10 rounded-full font-medium">Optional</span>
              </h2>
              <textarea
                className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
                placeholder="Paste the target job description here to calculate match score and skill gaps..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !file}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center transition-all shadow-lg ${
                loading || !file ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (<><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Analyzing...</>) : (<>Launch Analysis <ChevronRight className="w-5 h-5 ml-1" /></>)}
            </button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" /><p>{error}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {result ? (
              <div className="space-y-5">
                {/* Tab bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                    {[{ id: 'summary', label: 'Summary', Icon: Sparkles }, { id: 'fitview', label: 'Resume vs Job Fit', Icon: Columns2 }].map(({ id, label, Icon }) => (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowExport(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all">
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                </div>

                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.match_score !== null && (
                        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
                          <div className="flex items-center justify-between relative z-10">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-1">Match Score</h3>
                              <p className="text-indigo-200/70 text-xs">Skill alignment with JD</p>
                            </div>
                            <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-indigo-500/30 bg-black/40 shadow-inner relative">
                              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-purple-300">{result.match_score}%</span>
                              <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="40" cy="40" r="36" className="text-transparent stroke-current" strokeWidth="4" fill="none" />
                                <circle cx="40" cy="40" r="36" className="text-indigo-400 stroke-current transition-all duration-1000 ease-out" strokeWidth="4" strokeLinecap="round" fill="none"
                                  strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={2 * Math.PI * 36 - (2 * Math.PI * 36 * result.match_score) / 100} />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                      {hasLlm && (
                        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-purple-500/15 rounded-full blur-3xl"></div>
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> AI Summary</h3>
                              {llm.experience_level && (<span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${expLevelColor[llm.experience_level] || 'text-slate-300 bg-white/5 border-white/10'}`}>{llm.experience_level}</span>)}
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">{llm.summary}</p>
                          </div>
                        </div>
                      )}
                      {llm?.error && (
                        <div className="bg-white/5 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 shadow-2xl">
                          <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> LLM Analysis Unavailable</h3>
                          <p className="text-sm text-slate-400">{llm.error}</p>
                        </div>
                      )}
                    </div>

                    {hasLlm && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {llm.strengths?.length > 0 && (
                          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold text-emerald-300 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Key Strengths</h3>
                            <ul className="space-y-2.5">{llm.strengths.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-300"><Star className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /><span>{s}</span></li>))}</ul>
                          </div>
                        )}
                        {llm.weaknesses?.length > 0 && (
                          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold text-rose-400 mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5" /> Areas for Improvement</h3>
                            <ul className="space-y-2.5">{llm.weaknesses.map((w, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-300"><AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" /><span>{w}</span></li>))}</ul>
                          </div>
                        )}
                      </div>
                    )}

                    {hasLlm && (
                      <div className="grid grid-cols-1 gap-6">
                        {llm.recommendations?.length > 0 && (
                          <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5" /> AI Recommendations</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {llm.recommendations.map((r, i) => (<div key={i} className="p-4 bg-black/20 rounded-xl border border-amber-500/10"><span className="text-xs text-amber-500 font-bold mb-1 block">#{i + 1}</span><p className="text-sm text-slate-300">{r}</p></div>))}
                            </div>
                          </div>
                        )}
                        {llm.fit_analysis && (
                          <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/10 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2"><User className="w-5 h-5" /> Job Fit Analysis</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">{llm.fit_analysis}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-emerald-300 mb-4">Extracted Skills</h3>
                        {result.entities.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">{result.entities.skills.map((skill, idx) => (<span key={idx} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/20">{skill}</span>))}</div>
                        ) : (<p className="text-sm text-slate-500 italic">No technical skills identified.</p>)}
                      </div>
                      {result.missing_skills?.length > 0 && (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                          <h3 className="text-lg font-semibold text-pink-400 mb-4">Missing Requirements</h3>
                          <div className="flex flex-wrap gap-2">{result.missing_skills.map((skill, idx) => (<span key={idx} className="px-3 py-1.5 bg-pink-500/10 text-pink-300 text-xs font-medium rounded-lg border border-pink-500/20">{skill}</span>))}</div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                      <h3 className="text-lg font-semibold text-blue-300 mb-4">Contact & Entities</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Emails</p>
                          {result.entities.emails.length > 0 ? <ul className="space-y-1">{result.entities.emails.map((e, i) => <li key={i} className="text-sm text-slate-300">{e}</li>)}</ul> : <span className="text-sm text-slate-600">—</span>}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Phones</p>
                          {result.entities.phones.length > 0 ? <ul className="space-y-1">{result.entities.phones.map((p, i) => <li key={i} className="text-sm text-slate-300">{p}</li>)}</ul> : <span className="text-sm text-slate-600">—</span>}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Links</p>
                          {result.entities.links?.length > 0 ? <ul className="space-y-1">{result.entities.links.map((l, i) => (<li key={i}><a href={l} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-300 hover:text-indigo-200 underline truncate block">{l}</a></li>))}</ul> : <span className="text-sm text-slate-600">—</span>}
                        </div>
                        <div className="sm:col-span-3 mt-2">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Organizations</p>
                          {result.entities.organizations.length > 0 ? (
                            <div className="flex flex-wrap gap-2">{result.entities.organizations.map((org, i) => (<span key={i} className="px-2 py-1 bg-white/5 text-slate-300 text-xs rounded-md border border-white/10">{org}</span>))}</div>
                          ) : <span className="text-sm text-slate-600">—</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'fitview' && <JobFitView result={result} />}
              </div>
            ) : (
              <div className="h-full min-h-[500px] bg-white/[0.02] border border-white/[0.05] border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                  <BarChart className="w-10 h-10 text-indigo-400/50" />
                </div>
                <h3 className="text-xl font-medium text-slate-300 mb-2">No Analysis Yet</h3>
                <p className="text-slate-500 max-w-sm mb-6">Upload a resume and optional job description to see the hybrid AI analysis results.</p>
                <div className="flex flex-col gap-2 text-xs text-slate-600">
                  <span>⚡ Layer 1: Instant NLP extraction (spaCy + Regex)</span>
                  <span>🧠 Layer 2: Deep contextual analysis (Gemini LLM)</span>
                  <span>📊 New: Side-by-side Resume vs Job Fit view</span>
                  <span>📄 New: Export full analysis report as PDF</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showExport && result && (
        <ExportReport result={result} filename={file?.name || 'resume.pdf'} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

export default App;

import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle, XCircle, BarChart2 } from 'lucide-react';

function ScoreBar({ label, value, color }) {
  const colors = {
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-rose-400',
    indigo: 'bg-indigo-400',
  };
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colors[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-8 text-right">{value}%</span>
    </div>
  );
}

function SkillChip({ skill, variant }) {
  const styles = {
    match: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    miss: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    neutral: 'bg-white/5 text-slate-300 border-white/10',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${styles[variant]}`}>
      {skill}
    </span>
  );
}

export default function JobFitView({ result }) {
  const { entities, match_score, matched_skills = [], missing_skills = [], llm_analysis: llm } = result;
  const hasJD = match_score !== null && match_score !== undefined;

  // Compute sub-scores (heuristic based on available data)
  const skillScore = hasJD ? match_score : null;
  const strengthScore = llm?.strengths ? Math.min(100, llm.strengths.length * 20) : null;
  const weakScore = llm?.weaknesses ? Math.max(0, 100 - llm.weaknesses.length * 20) : null;

  const expLevelColor = {
    Junior: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    'Mid-Level': 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    Senior: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    'Lead/Principal': 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Score summary */}
      {hasJD && (
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Fit Score Breakdown</h3>
            {llm?.experience_level && (
              <span className={`ml-auto text-xs px-2.5 py-1 rounded-full border font-semibold ${expLevelColor[llm.experience_level] || 'text-slate-300 bg-white/5 border-white/10'}`}>
                {llm.experience_level}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <ScoreBar label="Skills match" value={skillScore} color={skillScore >= 70 ? 'green' : skillScore >= 40 ? 'amber' : 'red'} />
            {strengthScore !== null && <ScoreBar label="Strengths depth" value={strengthScore} color="indigo" />}
            {weakScore !== null && <ScoreBar label="Profile polish" value={weakScore} color={weakScore >= 60 ? 'green' : 'amber'} />}
          </div>
        </div>
      )}

      {/* Side-by-side grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left — Resume */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">From Resume</p>

          {/* Skills */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Extracted Skills
            </h4>
            {entities.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entities.skills.map((s, i) => (
                  <SkillChip key={i} skill={s} variant={hasJD && matched_skills.map(x => x.toLowerCase()).includes(s.toLowerCase()) ? 'match' : 'neutral'} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No skills detected.</p>
            )}
          </div>

          {/* Contact */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-blue-300 mb-3">Contact Details</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              {entities.emails.length > 0 && entities.emails.map((e, i) => <div key={i}><span className="text-slate-500 mr-2">Email</span>{e}</div>)}
              {entities.phones.length > 0 && entities.phones.map((p, i) => <div key={i}><span className="text-slate-500 mr-2">Phone</span>{p}</div>)}
              {entities.links?.length > 0 && entities.links.map((l, i) => <div key={i}><span className="text-slate-500 mr-2">Link</span><a href={l} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline truncate">{l}</a></div>)}
              {entities.emails.length === 0 && entities.phones.length === 0 && <span className="text-slate-600 italic">None extracted.</span>}
            </div>
          </div>

          {/* Strengths */}
          {llm?.strengths?.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Strengths
              </h4>
              <ul className="space-y-1.5">
                {llm.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✦</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right — Job Description */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">
            {hasJD ? 'From Job Description' : 'AI Analysis'}
          </p>

          {/* Matched vs Missing */}
          {hasJD && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-indigo-300 mb-3">Required Skills</h4>
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2">Matched</p>
                <div className="flex flex-wrap gap-1.5">
                  {matched_skills.length > 0
                    ? matched_skills.map((s, i) => <SkillChip key={i} skill={s} variant="match" />)
                    : <span className="text-xs text-slate-600 italic">None matched.</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Missing</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing_skills.length > 0
                    ? missing_skills.map((s, i) => <SkillChip key={i} skill={s} variant="miss" />)
                    : <span className="text-xs text-emerald-400 italic">No gaps found!</span>}
                </div>
              </div>
            </div>
          )}

          {/* Fit analysis */}
          {llm?.fit_analysis && (
            <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-cyan-300 mb-2">Job Fit Analysis</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{llm.fit_analysis}</p>
            </div>
          )}

          {/* Weaknesses */}
          {llm?.weaknesses?.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Areas to Improve
              </h4>
              <ul className="space-y-1.5">
                {llm.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-rose-500 mt-0.5 flex-shrink-0">✦</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {llm?.recommendations?.length > 0 && (
            <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-amber-300 mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {llm.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-500 font-bold flex-shrink-0">#{i + 1}</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Organizations */}
          {entities.organizations?.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Organizations Detected</h4>
              <div className="flex flex-wrap gap-1.5">
                {entities.organizations.map((org, i) => <SkillChip key={i} skill={org} variant="neutral" />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

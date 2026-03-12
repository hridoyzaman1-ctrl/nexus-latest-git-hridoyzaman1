import type { CoachReport, SectionScore, TrendDataPoint, TimelineMarker, QuestionResult, CoachSessionConfig } from '@/types/presentationCoach';
import { calculateOverallScore } from './scoringEngine';

export function generateReport(
  config: CoachSessionConfig,
  scores: Record<string, SectionScore>,
  elapsedSeconds: number,
  trendData: TrendDataPoint[],
  timelineMarkers: TimelineMarker[],
  transcriptAvailable: boolean,
  splitScreenUsed: boolean,
  questionResults?: QuestionResult[],
): CoachReport {
  const overall = calculateOverallScore(scores);
  const overtime = Math.max(0, elapsedSeconds - config.targetDuration);
  const strengths = findStrengths(scores);
  const areasToImprove = findWeaknesses(scores);
  const suggestions = generateSuggestions(scores, overtime, transcriptAvailable);
  const positiveReinforcement = generatePositiveNotes(scores, elapsedSeconds);
  const summary = generateSummary(config, scores, overall, elapsedSeconds, overtime);

  return {
    id: crypto.randomUUID(),
    title: config.title || `Practice Session - ${new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
    sessionType: config.sessionType,
    date: new Date().toISOString(),
    duration: elapsedSeconds,
    targetDuration: config.targetDuration,
    overtime,
    scriptUsed: config.useScript,
    splitScreenUsed,
    questionModeUsed: config.useQuestionMode,
    transcriptAvailable,
    overallScore: overall,
    scores: {
      posture: scores.posture,
      eyeContact: scores.eyeContact,
      gestureControl: scores.gestureControl,
      speechDelivery: scores.speechDelivery,
      speechPace: scores.speechPace,
      timeManagement: scores.timeManagement,
      overallPresence: scores.overallPresence,
    },
    strengths,
    areasToImprove,
    suggestions,
    positiveReinforcement,
    summary,
    trendData,
    timelineMarkers,
    questionResults,
    script: config.script,
    version: 1,
  };
}

function findStrengths(scores: Record<string, SectionScore>): string[] {
  return Object.values(scores)
    .filter(s => s.score >= 75)
    .sort((a, b) => b.score - a.score)
    .map(s => `${s.label} (${s.score}/100): ${s.explanation}`)
    .slice(0, 4);
}

function findWeaknesses(scores: Record<string, SectionScore>): string[] {
  return Object.values(scores)
    .filter(s => s.score < 60)
    .sort((a, b) => a.score - b.score)
    .map(s => `${s.label} (${s.score}/100): ${s.explanation}`)
    .slice(0, 4);
}

function generateSuggestions(scores: Record<string, SectionScore>, overtime: number, transcriptAvailable: boolean): string[] {
  const suggestions: string[] = [];

  if (scores.posture?.score < 60) {
    suggestions.push('Practice in front of a mirror to build posture awareness. Keep your shoulders back and spine aligned.');
  }
  if (scores.eyeContact?.score < 60) {
    suggestions.push('Place your camera at eye level and practice looking directly into the lens. Use sticky notes near the camera as a visual anchor.');
  }
  if (scores.gestureControl?.score < 60) {
    suggestions.push('Record yourself speaking and watch your hand movements. Aim for deliberate, purposeful gestures that emphasize key points.');
  }
  if (scores.speechDelivery?.score < 60) {
    suggestions.push('Practice vocal warm-ups before speaking. Focus on maintaining consistent volume and adding strategic pauses for emphasis.');
  }
  if (scores.speechPace?.score < 60) {
    suggestions.push('Use a metronome app at 130 BPM while practicing to develop a natural speaking rhythm. Aim for 120-160 words per minute.');
  }
  if (overtime > 60) {
    suggestions.push(`You went over time by ${Math.round(overtime / 60)} minute${overtime > 120 ? 's' : ''}. Practice with a timer visible and plan transition phrases to wrap up gracefully.`);
  }

  if (suggestions.length === 0) {
    suggestions.push('Keep practicing regularly to maintain and improve your skills.');
    suggestions.push('Try increasing your target duration to challenge yourself further.');
  }

  return suggestions.slice(0, 5);
}

function generatePositiveNotes(scores: Record<string, SectionScore>, duration: number): string[] {
  const notes: string[] = [];

  if (duration >= 60) {
    notes.push(`You practiced for ${Math.round(duration / 60)} minute${duration >= 120 ? 's' : ''} — consistency is key to improvement.`);
  }

  Object.values(scores)
    .filter(s => s.score >= 80)
    .forEach(s => {
      notes.push(`Your ${s.label.toLowerCase()} was impressive — maintain this strength.`);
    });

  if (notes.length === 0) {
    notes.push('Great job completing this practice session. Every session builds your confidence.');
  }

  return notes.slice(0, 4);
}

function generateSummary(
  config: CoachSessionConfig,
  scores: Record<string, SectionScore>,
  overall: number,
  elapsed: number,
  overtime: number,
): string {
  const mins = Math.round(elapsed / 60);
  const type = config.sessionType;
  const best = Object.values(scores).sort((a, b) => b.score - a.score)[0];
  const worst = Object.values(scores).sort((a, b) => a.score - b.score)[0];

  let summary = `This ${type} practice session lasted ${mins} minute${mins !== 1 ? 's' : ''}`;
  if (config.targetDuration > 0) {
    summary += ` (target: ${Math.round(config.targetDuration / 60)} min)`;
  }
  summary += `. Your overall score was ${overall}/100. `;

  if (best && best.score >= 70) {
    summary += `Your strongest area was ${best.label.toLowerCase()} at ${best.score}/100. `;
  }
  if (worst && worst.score < 60) {
    summary += `The area most in need of focus is ${worst.label.toLowerCase()} at ${worst.score}/100. `;
  }

  if (overtime > 0) {
    summary += `You exceeded your target duration by ${Math.round(overtime)}s. `;
  }

  if (overall >= 80) {
    summary += 'This was an excellent session — keep up the great work!';
  } else if (overall >= 60) {
    summary += 'A solid performance with clear areas for growth. Keep practicing!';
  } else {
    summary += 'Regular practice will help you build confidence and improve your scores.';
  }

  return summary;
}

export function generatePrintableReport(report: CoachReport): string {
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${report.title} - MindFlow Coach Report</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px; color: #1a1a2e; }
  h1 { font-size: 22px; color: #1a1a2e; border-bottom: 3px solid #6c63ff; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #6c63ff; margin-top: 24px; }
  .meta { font-size: 13px; color: #666; margin-bottom: 16px; }
  .overall { text-align: center; padding: 20px; background: linear-gradient(135deg, #6c63ff15, #00d9ff10); border-radius: 12px; margin: 16px 0; }
  .overall .score { font-size: 48px; font-weight: bold; color: #6c63ff; }
  .overall .label { font-size: 14px; color: #666; }
  .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; }
  .score-item { padding: 12px; background: #f8f9fa; border-radius: 8px; }
  .score-item .name { font-size: 12px; color: #666; }
  .score-item .val { font-size: 20px; font-weight: bold; }
  .score-item .desc { font-size: 11px; color: #888; margin-top: 4px; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; font-size: 14px; }
  .summary { background: #f0f0ff; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.5; }
  .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${report.title}</h1>
<div class="meta">
  <strong>Type:</strong> ${report.sessionType} &nbsp;|&nbsp;
  <strong>Date:</strong> ${new Date(report.date).toLocaleString()} &nbsp;|&nbsp;
  <strong>Duration:</strong> ${fmtTime(report.duration)}${report.targetDuration ? ` / ${fmtTime(report.targetDuration)}` : ''}
  ${report.overtime > 0 ? `&nbsp;|&nbsp; <strong style="color:#e53e3e">Overtime:</strong> ${fmtTime(report.overtime)}` : ''}
  <br/>
  ${report.scriptUsed ? '✓ Script used' : ''} ${report.questionModeUsed ? '✓ Question mode' : ''} ${report.splitScreenUsed ? '✓ Split-screen' : ''} ${report.transcriptAvailable ? '✓ Transcript available' : ''}
</div>

<div class="overall">
  <div class="score">${report.overallScore}</div>
  <div class="label">Overall Score</div>
</div>

<h2>Section Scores</h2>
<div class="scores">
  ${Object.values(report.scores).map(s => `
    <div class="score-item">
      <div class="name">${s.label}</div>
      <div class="val" style="color:${s.score >= 80 ? '#38a169' : s.score >= 60 ? '#3182ce' : s.score >= 40 ? '#d69e2e' : '#e53e3e'}">${s.score}</div>
      <div class="desc">${s.explanation}</div>
    </div>
  `).join('')}
</div>

${report.strengths.length ? `<h2>Strengths</h2><ul>${report.strengths.map(s => `<li>✓ ${s}</li>`).join('')}</ul>` : ''}
${report.areasToImprove.length ? `<h2>Areas to Improve</h2><ul>${report.areasToImprove.map(s => `<li>→ ${s}</li>`).join('')}</ul>` : ''}
${report.suggestions.length ? `<h2>Suggestions</h2><ul>${report.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
${report.positiveReinforcement.length ? `<h2>What Went Well</h2><ul>${report.positiveReinforcement.map(s => `<li>★ ${s}</li>`).join('')}</ul>` : ''}

<h2>Session Summary</h2>
<div class="summary">${report.summary}</div>

<div class="footer">
  Report ID: ${report.id}<br/>
  Generated by MindFlow Presentation Coach
</div>
</body></html>`;
}

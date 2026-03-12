import type { CoachReport } from '@/types/presentationCoach';

const STORAGE_KEY = 'mindflow_coachReports';

function readReports(): CoachReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r: any) => r && r.id && r.overallScore !== undefined);
  } catch {
    return [];
  }
}

function writeReports(reports: CoachReport[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.warn('Failed to save coach reports:', e);
  }
}

export function getAllCoachReports(): CoachReport[] {
  return readReports().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCoachReport(id: string): CoachReport | null {
  return readReports().find(r => r.id === id) || null;
}

export function saveCoachReport(report: CoachReport) {
  const reports = readReports();
  const idx = reports.findIndex(r => r.id === report.id);
  if (idx >= 0) {
    reports[idx] = report;
  } else {
    reports.unshift(report);
  }
  writeReports(reports);
}

export function deleteCoachReport(id: string) {
  writeReports(readReports().filter(r => r.id !== id));
}

export function renameCoachReport(id: string, newTitle: string) {
  const reports = readReports();
  const report = reports.find(r => r.id === id);
  if (report) {
    report.title = newTitle;
    writeReports(reports);
  }
}

export function getCoachReportCount(): number {
  return readReports().length;
}

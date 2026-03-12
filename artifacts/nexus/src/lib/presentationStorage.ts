import type { Presentation } from '@/types/presentation';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';

const STORAGE_KEY = 'presentations';
const LINKS_KEY = 'studyPresentationLinks';

export interface StudyPresentationLink {
  id: string;
  presentationId: string;
  sessionId: string;
  addedAt: string;
}

export function getStudyPresentationLinks(): StudyPresentationLink[] {
  return getLocalStorage<StudyPresentationLink[]>(LINKS_KEY, []);
}

export function addStudyPresentationLink(presentationId: string, sessionId: string): StudyPresentationLink {
  const links = getStudyPresentationLinks();
  const existing = links.find(l => l.presentationId === presentationId && l.sessionId === sessionId);
  if (existing) return existing;
  const link: StudyPresentationLink = {
    id: crypto.randomUUID(),
    presentationId,
    sessionId,
    addedAt: new Date().toISOString(),
  };
  links.push(link);
  setLocalStorage(LINKS_KEY, links);
  return link;
}

export function removeStudyPresentationLink(linkId: string): void {
  const links = getStudyPresentationLinks().filter(l => l.id !== linkId);
  setLocalStorage(LINKS_KEY, links);
}

export function getLinksForSession(sessionId: string): StudyPresentationLink[] {
  return getStudyPresentationLinks().filter(l => l.sessionId === sessionId);
}

export function isLinkedToSession(presentationId: string, sessionId: string): boolean {
  return getStudyPresentationLinks().some(l => l.presentationId === presentationId && l.sessionId === sessionId);
}

export function removeLinksForSession(sessionId: string): void {
  const links = getStudyPresentationLinks().filter(l => l.sessionId !== sessionId);
  setLocalStorage(LINKS_KEY, links);
}

export function getAllPresentations(): Presentation[] {
  const raw = getLocalStorage<Presentation[]>(STORAGE_KEY, []);
  return raw.map(p => ({
    ...p,
    slides: (p.slides || []).map(s => ({
      ...s,
      speakerNotes: s.speakerNotes ?? '',
    })),
  }));
}

export function getPresentation(id: string): Presentation | undefined {
  return getAllPresentations().find(p => p.id === id);
}

export function savePresentation(presentation: Presentation): void {
  const all = getAllPresentations();
  const idx = all.findIndex(p => p.id === presentation.id);
  if (idx >= 0) {
    all[idx] = { ...presentation, updatedAt: new Date().toISOString() };
  } else {
    all.unshift(presentation);
  }
  try {
    setLocalStorage(STORAGE_KEY, all);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || (e?.message && /quota/i.test(e.message))) {
      throw new Error('Storage quota exceeded. Try reducing image sizes or removing unused presentations.');
    }
    throw e;
  }
}

export function deletePresentation(id: string): void {
  const all = getAllPresentations().filter(p => p.id !== id);
  setLocalStorage(STORAGE_KEY, all);
  const links = getStudyPresentationLinks().filter(l => l.presentationId !== id);
  setLocalStorage(LINKS_KEY, links);
}

export function duplicatePresentation(id: string): Presentation | null {
  const original = getPresentation(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const dup: Presentation = {
    ...original,
    id: crypto.randomUUID(),
    settings: { ...original.settings, title: `${original.settings.title} (Copy)` },
    slides: original.slides.map(s => ({ ...s, id: crypto.randomUUID() })),
    createdAt: now,
    updatedAt: now,
  };
  savePresentation(dup);
  return dup;
}

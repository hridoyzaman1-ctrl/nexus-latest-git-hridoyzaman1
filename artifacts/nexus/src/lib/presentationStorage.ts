import type { Presentation } from '@/types/presentation';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import { dbGetAll, dbPut, dbDelete, STORES } from '@/lib/db';

const STORAGE_KEY = 'presentations';
const LINKS_KEY = 'studyPresentationLinks';
const MIGRATION_DONE_KEY = 'presentations_migrated_to_db';

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

async function runMigration() {
  const isMigrated = getLocalStorage<boolean>(MIGRATION_DONE_KEY, false);
  if (isMigrated === true) return;

  const raw = getLocalStorage<Presentation[]>(STORAGE_KEY, []);
  if (raw && raw.length > 0) {
    for (const p of raw) {
      await dbPut(STORES.PRESENTATIONS, p);
    }
  }
  setLocalStorage(MIGRATION_DONE_KEY, true);
  // localStorage.removeItem(`mindflow_${STORAGE_KEY}`);
}

export async function getAllPresentations(): Promise<Presentation[]> {
  await runMigration();
  const raw = await dbGetAll<Presentation>(STORES.PRESENTATIONS);
  return raw.map(p => ({
    ...p,
    slides: (p.slides || []).map(s => ({
      ...s,
      speakerNotes: s.speakerNotes ?? '',
    })),
  }));
}

export async function getPresentation(id: string): Promise<Presentation | undefined> {
  const all = await getAllPresentations();
  return all.find(p => p.id === id);
}

export async function savePresentation(presentation: Presentation): Promise<void> {
  const presentationToSave = {
    ...presentation,
    updatedAt: new Date().toISOString()
  };
  try {
    await dbPut(STORES.PRESENTATIONS, presentationToSave);
  } catch (e: any) {
    // IndexedDB quota is much larger, but still good to handle.
    if (e?.name === 'QuotaExceededError' || (e?.message && /quota/i.test(e.message))) {
      throw new Error('Storage space is low. Please remove old presentations.');
    }
    throw e;
  }
}

export async function deletePresentation(id: string): Promise<void> {
  await dbDelete(STORES.PRESENTATIONS, id);
  const links = getStudyPresentationLinks().filter(l => l.presentationId !== id);
  setLocalStorage(LINKS_KEY, links);
}

export async function duplicatePresentation(id: string): Promise<Presentation | null> {
  const original = await getPresentation(id);
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
  await savePresentation(dup);
  return dup;
}


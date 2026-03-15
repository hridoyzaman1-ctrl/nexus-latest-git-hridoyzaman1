// IndexedDB + localStorage persistence for generated audio/video media
// Blobs → IndexedDB (mindflow_media_db)
// Metadata → localStorage (mindflow_generatedMedia)

export interface VideoScene {
  type: 'title' | 'keypoint' | 'definition' | 'quote' | 'example' | 'recap';
  heading: string;
  body: string;
  duration: number; // seconds this scene shows
}

export interface GeneratedMediaItem {
  id: string;
  title: string;
  sourceModule: string; // 'books' | 'notes' | 'study' | 'presentations' | 'coach'
  sourceId: string;
  sourceName: string;
  mode: 'summary' | 'explainer' | 'video';
  script: string;
  language: string;
  voiceName: string;
  voiceRate: number;
  voicePitch: number;
  scenes?: VideoScene[];
  estimatedDuration: number; // seconds
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  hasVideoBlob: boolean;
  videoMimeType?: string;
}

// ── IndexedDB for video blobs ─────────────────────────────────────────────────

const DB_NAME = 'mindflow_media_db';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  // Convert blob to ArrayBuffer BEFORE opening transaction — IDB transactions
  // must have their stores accessed synchronously after creation.
  const ab = await blob.arrayBuffer();
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('IDB transaction aborted'));
    tx.objectStore(STORE_NAME).put(ab, id);
  });
}

export async function getVideoBlob(id: string, mimeType = 'video/webm'): Promise<Blob | null> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      if (!req.result) { resolve(null); return; }
      resolve(new Blob([req.result], { type: mimeType }));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVideoBlob(id: string): Promise<void> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── localStorage for metadata ──────────────────────────────────────────────────

const META_KEY = 'mindflow_generatedMedia';

export function getAllMediaItems(): GeneratedMediaItem[] {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveMediaItem(item: GeneratedMediaItem): void {
  const all = getAllMediaItems();
  const idx = all.findIndex(x => x.id === item.id);
  if (idx >= 0) {
    all[idx] = item;
  } else {
    all.unshift(item);
  }
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

export function updateMediaTitle(id: string, title: string): void {
  const all = getAllMediaItems();
  const item = all.find(x => x.id === id);
  if (item) {
    item.title = title;
    item.updatedAt = new Date().toISOString();
    localStorage.setItem(META_KEY, JSON.stringify(all));
  }
}

export function getMediaItem(id: string): GeneratedMediaItem | null {
  return getAllMediaItems().find(x => x.id === id) ?? null;
}

export function getMediaForSource(sourceId: string): GeneratedMediaItem[] {
  return getAllMediaItems().filter(x => x.sourceId === sourceId);
}

export function deleteMediaItem(id: string): void {
  const all = getAllMediaItems().filter(x => x.id !== id);
  localStorage.setItem(META_KEY, JSON.stringify(all));
  deleteVideoBlob(id).catch(() => {});
}

export function deleteAllMedia(): void {
  const all = getAllMediaItems();
  all.forEach(x => deleteVideoBlob(x.id).catch(() => {}));
  localStorage.removeItem(META_KEY);
}

export function deleteAllMediaForSource(sourceId: string): void {
  const all = getAllMediaItems();
  const toDelete = all.filter(x => x.sourceId === sourceId);
  toDelete.forEach(x => deleteVideoBlob(x.id).catch(() => {}));
  localStorage.setItem(META_KEY, JSON.stringify(all.filter(x => x.sourceId !== sourceId)));
}

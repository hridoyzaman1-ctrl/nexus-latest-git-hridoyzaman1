// IndexedDB storage for presentation narration audio blobs.
// Uses its OWN database (mindflow_pres_audio_db) — intentionally SEPARATE from
// mindflow_media_db (used by mediaStorage.ts at version 1).  Sharing a DB across
// files with different version numbers causes IDB VersionError / blocked events.

const DB_NAME = 'mindflow_pres_audio_db';
const STORE_NAME = 'pres_audio_blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IDB open blocked — another connection is open'));
  });
}

export async function savePresentationAudio(presentationId: string, blob: Blob): Promise<void> {
  const ab = await blob.arrayBuffer();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(new Error('IDB transaction aborted')); };
    tx.objectStore(STORE_NAME).put(ab, presentationId);
  });
}

export async function getPresentationAudio(presentationId: string, mimeType = 'audio/webm'): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(presentationId);
    req.onsuccess = () => {
      db.close();
      if (!req.result) { resolve(null); return; }
      resolve(new Blob([req.result], { type: mimeType }));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deletePresentationAudio(presentationId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.objectStore(STORE_NAME).delete(presentationId);
  });
}

export async function hasPresentationAudio(presentationId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getKey(presentationId);
    req.onsuccess = () => { db.close(); resolve(req.result !== undefined); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

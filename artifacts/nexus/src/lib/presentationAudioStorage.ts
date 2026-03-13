// IndexedDB storage for presentation narration audio blobs
// Uses the same mindflow_media_db as media blobs but with a separate store

const DB_NAME = 'mindflow_media_db';
const STORE_NAME = 'pres_audio_blobs';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('media_blobs')) {
        db.createObjectStore('media_blobs');
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePresentationAudio(presentationId: string, blob: Blob): Promise<void> {
  const ab = await blob.arrayBuffer();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('IDB transaction aborted'));
    tx.objectStore(STORE_NAME).put(ab, presentationId);
  });
}

export async function getPresentationAudio(presentationId: string, mimeType = 'audio/webm'): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(presentationId);
    req.onsuccess = () => {
      if (!req.result) { resolve(null); return; }
      resolve(new Blob([req.result], { type: mimeType }));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deletePresentationAudio(presentationId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).delete(presentationId);
  });
}

export async function hasPresentationAudio(presentationId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getKey(presentationId);
    req.onsuccess = () => resolve(req.result !== undefined);
    req.onerror = () => reject(req.error);
  });
}

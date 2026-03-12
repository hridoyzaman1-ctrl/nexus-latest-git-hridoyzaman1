// IndexedDB storage for study material files (PDF, TXT, EPUB, PPTX, Videos)
const DB_NAME = 'mindflow_study_db';
const STORE_NAME = 'study_files';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
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

export interface StudyFileData {
  pdfData?: string;       // base64 for PDFs
  content?: string;       // text for TXT/EPUB
  pptxSlides?: string[];  // base64 images of each slide
  videoBlob?: ArrayBuffer; // raw video data
  videoType?: string;     // mime type
}

export async function saveStudyFile(materialId: string, data: StudyFileData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, materialId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStudyFile(materialId: string): Promise<StudyFileData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(materialId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteStudyFile(materialId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(materialId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

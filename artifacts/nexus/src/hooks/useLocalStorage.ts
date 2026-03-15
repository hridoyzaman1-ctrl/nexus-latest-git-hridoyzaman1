import { useState, useCallback, useEffect } from 'react';
import { exampleGoals, exampleHabits, exampleTodos } from '@/lib/examples';

// Request persistent storage to prevent browser from clearing data
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(persistent => {
    if (persistent) console.log("Storage will not be cleared except by explicit user action");
    else console.warn("Storage may be cleared under storage pressure");
  });
}

const urlDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
if (urlDemo) {
  try { window.sessionStorage.setItem('mindflow_isDemoMode', 'true'); } catch (e) { }
}
export const isDemoMode = urlDemo || (function () {
  try { return window.sessionStorage.getItem('mindflow_isDemoMode') === 'true'; }
  catch (e) { return false; }
})();

// In-memory isolated store for demo mode to prevent overwriting user data
const demoMemoryStore = new Map<string, string>();

if (isDemoMode) {
  // Pre-seed demo store with some content so the app isn't empty in demo mode
  demoMemoryStore.set('mindflow_onboardingDone', 'true');
  demoMemoryStore.set('mindflow_appVersion', '"2.0.0"');
  demoMemoryStore.set('mindflow_goals', JSON.stringify(exampleGoals));
  demoMemoryStore.set('mindflow_habits', JSON.stringify(exampleHabits));
  demoMemoryStore.set('mindflow_todos', JSON.stringify(exampleTodos));
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const prefixedKey = `mindflow_${key}`;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = isDemoMode ? demoMemoryStore.get(prefixedKey) : window.localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        if (isDemoMode) {
          demoMemoryStore.set(prefixedKey, JSON.stringify(valueToStore));
        } else {
          window.localStorage.setItem(prefixedKey, JSON.stringify(valueToStore));
        }
        window.dispatchEvent(new CustomEvent('local-storage', { detail: { key: prefixedKey, newValue: valueToStore } }));
      } catch (error) {
        console.warn(`Error setting localStorage key "${prefixedKey}":`, error);
      }
      return valueToStore;
    });
  }, [prefixedKey]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === prefixedKey) {
        setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
      }
    };
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === prefixedKey) {
        setStoredValue(e.detail.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleCustomStorageChange as EventListener);
    };
  }, [prefixedKey, initialValue]);

  return [storedValue, setValue] as const;
}

export function getLocalStorage<T>(key: string, fallback: T): T {
  try {
    const prefixedKey = `mindflow_${key}`;
    const item = isDemoMode ? demoMemoryStore.get(prefixedKey) : window.localStorage.getItem(prefixedKey);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  const prefixedKey = `mindflow_${key}`;
  if (isDemoMode) {
    demoMemoryStore.set(prefixedKey, JSON.stringify(value));
  } else {
    window.localStorage.setItem(prefixedKey, JSON.stringify(value));
  }
  window.dispatchEvent(new CustomEvent('local-storage', { detail: { key: prefixedKey, newValue: value } }));
}

// Data Export/Import for Persistence across uninstalls
export function exportAppData() {
  const data: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('mindflow_')) {
      data[key] = localStorage.getItem(key);
    }
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindflow_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAppData(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('mindflow_')) {
        localStorage.setItem(key, value as string);
      }
    });
    window.location.reload();
  } catch (e) {
    console.error("Failed to import data", e);
    alert("Invalid backup file");
  }
}

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';

const VISITED_KEY = 'visitedModules';

export function useFirstVisitTooltip(pageId: string) {
  const [showTooltips, setShowTooltips] = useState(false);

  useEffect(() => {
    const visited = getLocalStorage<string[]>(VISITED_KEY, []);
    if (!visited.includes(pageId)) {
      // Small delay so DOM is ready
      const t = setTimeout(() => setShowTooltips(true), 600);
      return () => clearTimeout(t);
    }
  }, [pageId]);

  const dismiss = useCallback(() => {
    setShowTooltips(false);
    const visited = getLocalStorage<string[]>(VISITED_KEY, []);
    if (!visited.includes(pageId)) {
      setLocalStorage(VISITED_KEY, [...visited, pageId]);
    }
  }, [pageId]);

  return { showTooltips, dismiss };
}

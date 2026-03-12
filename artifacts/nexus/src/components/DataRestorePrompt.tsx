import { useState, useEffect } from 'react';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DatabaseBackup, Trash2, Sparkles, Upload } from 'lucide-react';

import { hasExistingData, clearAllMindflowData } from '@/lib/dataRestoreHelpers';

function getDataSummary(): { entries: number; modules: string[] } {
  let entries = 0;
  const modules: string[] = [];

  const check = (key: string, label: string) => {
    try {
      const item = window.localStorage.getItem(`mindflow_${key}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          entries += parsed.length;
          modules.push(`${parsed.length} ${label}`);
        }
      }
    } catch { /* skip */ }
  };

  check('goals', 'goals');
  check('habits', 'habits');
  check('tasks', 'tasks');
  check('notes', 'notes');
  check('books', 'books');
  check('expenses', 'expenses');
  check('todos', 'todos');
  check('studySessions', 'study sessions');
  check('studyMaterials', 'study materials');
  check('studyNotes', 'study notes');
  check('studyHighlights', 'highlights');
  check('focusSessions', 'focus sessions');
  check('timeEntries', 'time entries');
  check('breathingFeedback', 'breathing sessions');
  check('moodEntries', 'mood entries');
  check('sleepEntries', 'sleep entries');
  check('waterEntries', 'water entries');
  check('incomes', 'incomes');

  return { entries, modules };
}

interface DataRestorePromptProps {
  onRestore: () => void;
  onFresh: () => void;
}

export default function DataRestorePrompt({ onRestore, onFresh }: DataRestorePromptProps) {
  const [showImport, setShowImport] = useState(false);
  const { entries, modules } = getDataSummary();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        Object.entries(data).forEach(([k, v]) => {
          if (k.startsWith('mindflow_') || 
              k.startsWith('newsCache_') || 
              k === 'newsBookmarks' || 
              k === 'newsSelectedMode' || 
              k === 'newsSelectedCategory' ||
              k === 'install_banner_dismissed' ||
              k === 'themeMode' ||
              k === 'accentIndex'
          ) {
            localStorage.setItem(k, v as string);
          }
        });
        window.location.reload();
      } catch { alert('Invalid backup file'); }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-lg p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="glass rounded-3xl p-6 max-w-sm w-full space-y-5"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
            <DatabaseBackup className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold font-display">Welcome to MindFlow</h2>
          <p className="text-sm text-muted-foreground">
            {entries > 0
              ? 'We found your saved MindFlow data from a previous session.'
              : 'Start fresh or import a previous backup to restore your data.'}
          </p>
        </div>

        {/* Data summary */}
        {entries > 0 && (
          <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold">{entries} items found</p>
            <div className="flex flex-wrap gap-1">
              {modules.slice(0, 8).map(m => (
                <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{m}</span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {entries > 0 && (
            <Button onClick={onRestore} className="w-full gap-2" size="lg">
              <Sparkles className="w-4 h-4" />
              Restore My Data
            </Button>
          )}
          <Button onClick={onFresh} variant={entries > 0 ? 'outline' : 'default'} className="w-full gap-2" size="lg">
            {entries > 0 ? <Trash2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {entries > 0 ? 'Start Fresh' : 'Get Started'}
          </Button>

          {/* Import backup option */}
          <label className="block">
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground" size="lg" asChild>
              <span>
                <Upload className="w-4 h-4" />
                Import Previous Backup
              </span>
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </label>

          {entries > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">
              Starting fresh will permanently delete all previous data.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            💡 Study files (PDFs, videos) stored locally will persist. Export backups regularly from Settings.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { hasExistingData, clearAllMindflowData } from '@/lib/dataRestoreHelpers';

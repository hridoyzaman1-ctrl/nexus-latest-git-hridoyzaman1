import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { syncSafetyDataToSW } from '@/hooks/useActivityTracker';
import { UserProfile, SafetySettings, defaultSafetySettings, EmergencyContact } from '@/types';
import { avatars, avatarColors } from '@/lib/avatars';
import { Sun, Moon, Monitor, Download, Upload, Trash2, Bell, Camera, X, ImagePlus, LayoutGrid, Volume2, Smartphone, ShieldAlert, Accessibility, Type, Eye as EyeIcon, Zap, BoldIcon, Eclipse, BookOpen, HelpCircle, Globe, Share2, ChevronRight, Sparkles } from 'lucide-react';
import { TimePicker } from '@/components/TimePicker';
import { useNavigate } from 'react-router-dom';
import { AudioPreferences, DEFAULT_AUDIO_PREFS, BUILTIN_TRACKS, useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useAccessibility, defaultAccessibility } from '@/hooks/useAccessibility';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { NotificationSettings, defaultNotificationSettings, buildWeeklySummary } from '@/hooks/useNotificationReminders';
import { Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const accentPresets = [
  { name: 'Indigo', h: 245, s: 58, l: 62 },
  { name: 'Emerald', h: 152, s: 69, l: 45 },
  { name: 'Rose', h: 340, s: 82, l: 52 },
  { name: 'Amber', h: 38, s: 92, l: 50 },
  { name: 'Cyan', h: 199, s: 89, l: 48 },
  { name: 'Purple', h: 291, s: 64, l: 42 },
  { name: 'Blue', h: 217, s: 91, l: 60 },
  { name: 'Red', h: 0, s: 84, l: 60 },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useLocalStorage<UserProfile>('profile', { name: '', age: 0, occupation: '', goalsText: '', avatar: '😊' });
  const [themeMode, setThemeMode] = useLocalStorage<'system' | 'light' | 'dark' | 'amoled'>('themeMode', 'dark');
  const [accentIndex, setAccentIndex] = useLocalStorage<number>('accentIndex', 0);
  const [notifSettings, setNotifSettings] = useLocalStorage<NotificationSettings>('notificationSettings', defaultNotificationSettings);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TutorialDialog = lazy(() => import('@/components/TutorialDialog'));

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 256px for localStorage efficiency
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        updateProfile({ profilePicture: dataUrl });
        toast.success('Profile picture updated!');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeProfilePicture = () => {
    updateProfile({ profilePicture: undefined });
    toast.success('Profile picture removed');
  };

  const applyTheme = (mode: typeof themeMode) => {
    setThemeMode(mode);
    const root = document.documentElement;
    // Add transition class for smooth theme switch
    root.classList.add('theme-transitioning');
    root.classList.remove('dark', 'light', 'amoled');
    if (mode === 'dark') root.classList.add('dark');
    else if (mode === 'amoled') root.classList.add('amoled');
    else if (mode === 'light') { /* light is default :root */ }
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
    }
    // Remove transition class after animation completes
    setTimeout(() => root.classList.remove('theme-transitioning'), 450);
  };

  const applyAccent = (index: number) => {
    setAccentIndex(index);
    const { h, s, l } = accentPresets[index];
    document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    document.documentElement.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    document.documentElement.style.setProperty('--ring', `${h} ${s}% ${l}%`);
  };

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') toast.success('Notifications enabled! 🔔');
    else toast.error('Permission denied. Please allow notifications in browser settings.');
  };

  const updateNotif = (key: keyof NotificationSettings, value: boolean | string) => {
    if (typeof value === 'boolean' && value && Notification.permission !== 'granted') {
      requestNotifPermission();
    }
    setNotifSettings(prev => ({ ...prev, [key]: value }));
  };

  const exportData = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    // Include app version for future schema compatibility
    data['__mindflow_backup_version__'] = '2.0.0';
    data['__mindflow_backup_date__'] = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url; a.download = `mindflow-backup-${dateStr}.json`; a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('mindflow_lastExportDate', new Date().toISOString());
    toast.success('Data exported! Keep this backup file safe for restoring later.');
    toast('Note: Imported PDFs & study files are stored locally and cannot be backed up.', { duration: 5000 });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        let count = 0;
        Object.entries(data).forEach(([k, v]) => {
          if (k !== '__mindflow_backup_version__' && k !== '__mindflow_backup_date__') {
            localStorage.setItem(k, v as string);
            count++;
          }
        });
        toast.success(`${count} items imported! Refreshing...`);
        setTimeout(() => window.location.reload(), 1000);
      } catch { toast.error('Invalid backup file. Please use a MindFlow JSON backup.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearDemoData = () => {
    const contentKeys = [
      'goals', 'habits', 'tasks', 'notes', 'expenses', 'todos', 'studySessions', 'timeEntries',
      'anxietyLogs', 'routines', 'focusSessions', 'meditationSessions', 'moodEntries',
      'sleepEntries', 'waterEntries', 'breathingFeedback', 'mealLogs', 'pantryItems',
      'workoutHistory', 'newsBookmarks', 'quizHistory', 'recentActivities', 'dismissedActivities'
    ];
    contentKeys.forEach(k => localStorage.removeItem(`mindflow_${k}`));
    localStorage.setItem('mindflow_dataseeded', 'true'); // Prevent re-seeding
    toast.success('Demo data cleared! You can now start fresh.');
    setTimeout(() => window.location.reload(), 1000);
  };

  const clearAllData = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('mindflow_')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
    // Clear IndexedDB too
    try { indexedDB.deleteDatabase('mindflow_study_db'); } catch { }
    try { indexedDB.deleteDatabase('mindflow_books_db'); } catch { }
    toast.success('All data cleared! Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const avatarIndex = avatars.indexOf(profile.avatar);
  const avatarBg = avatarColors[avatarIndex >= 0 ? avatarIndex % avatarColors.length : 0];

  const notifItems: { key: keyof NotificationSettings; timeKey: keyof NotificationSettings; label: string; emoji: string; note?: string }[] = [
    { key: 'habitReminder', timeKey: 'habitReminderTime', label: 'Habit Reminder', emoji: '🔥' },
    { key: 'focusReminder', timeKey: 'focusReminderTime', label: 'Focus Session', emoji: '⏱️' },
    { key: 'dailyQuote', timeKey: 'dailyQuoteTime', label: 'Daily Quote', emoji: '✨' },
    { key: 'studyReminder', timeKey: 'studyReminderTime', label: 'Study Reminder', emoji: '📚' },
    { key: 'goalReminder', timeKey: 'goalReminderTime', label: 'Goal Check', emoji: '🎯' },
    { key: 'taskReminder', timeKey: 'taskReminderTime', label: 'Task List', emoji: '📋' },
    { key: 'expenseReminder', timeKey: 'expenseReminderTime', label: 'Finance Tracker', emoji: '💰' },
    { key: 'meditationReminder', timeKey: 'meditationReminderTime', label: 'Meditation', emoji: '🧘' },
    { key: 'readingReminder', timeKey: 'readingReminderTime', label: 'Reading', emoji: '📖' },
    { key: 'fitnessReminder', timeKey: 'fitnessReminderTime', label: 'Fitness', emoji: '🏃' },
    { key: 'nutritionReminder', timeKey: 'nutritionReminderTime', label: 'Nutrition', emoji: '🥗' },
    { key: 'moodReminder', timeKey: 'moodReminderTime', label: 'Mood Heart', emoji: '❤️' },
    { key: 'journalReminder', timeKey: 'journalReminderTime', label: 'Journal', emoji: '✍️' },
    { key: 'sleepReminder', timeKey: 'sleepReminderTime', label: 'Sleep Tracker', emoji: '😴' },
    { key: 'weeklySummary', timeKey: 'weeklySummaryTime', label: 'Weekly Summary', emoji: '📊', note: 'Every Sunday' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-5">
      <h1 className="text-2xl font-bold font-display" data-tour="settings-header">Settings</h1>

      <PageOnboardingTooltips pageId="settings" />

      {/* Profile */}
      <div className="glass rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Profile</h2>

        {/* Avatar / Profile Picture */}
        <div className="flex items-start gap-4">
          <div className="relative group">
            {profile.profilePicture ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/30">
                <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-transform active:scale-90"
                style={{ background: avatarBg + '22', border: `2px solid ${avatarBg}44` }}
              >
                {profile.avatar}
              </button>
            )}

            {/* Camera overlay button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Remove picture button */}
            {profile.profilePicture && (
              <button
                onClick={removeProfilePicture}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePictureUpload}
            />
          </div>

          <div className="flex-1 space-y-2">
            <Input
              placeholder="Name"
              value={profile.name}
              onChange={e => updateProfile({ name: e.target.value })}
              className="bg-secondary border-0"
            />
            <Input
              placeholder="Occupation"
              value={profile.occupation}
              onChange={e => updateProfile({ occupation: e.target.value })}
              className="bg-secondary border-0"
            />
          </div>
        </div>

        {/* Profile picture actions */}
        {!profile.profilePicture && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs gap-1.5"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Upload Photo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="text-xs"
            >
              {showAvatarPicker ? 'Hide Emojis' : 'Pick Emoji'}
            </Button>
          </div>
        )}

        {profile.profilePicture && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Replace Photo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={removeProfilePicture}
              className="text-xs text-destructive gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>
        )}

        {/* Emoji avatar picker */}
        <AnimatePresence>
          {showAvatarPicker && !profile.profilePicture && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-10 gap-2 pt-1">
                {avatars.map((a, i) => (
                  <button key={a} onClick={() => { updateProfile({ avatar: a }); setShowAvatarPicker(false); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${profile.avatar === a ? 'ring-2 ring-primary scale-110' : 'hover:bg-secondary'}`}
                    style={{ background: avatarColors[i % avatarColors.length] + '22' }}>
                    {a}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Additional profile fields */}
        <div className="space-y-2 pt-1 border-t border-border/30">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-12 shrink-0">Age</label>
            <Input
              type="number"
              placeholder="Age"
              value={profile.age || ''}
              onChange={e => updateProfile({ age: parseInt(e.target.value) || 0 })}
              className="bg-secondary border-0 h-8 text-sm"
              min={0}
              max={150}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Personal Goals</label>
            <Textarea
              placeholder="What are your goals? Write them here..."
              value={profile.goalsText}
              onChange={e => updateProfile({ goalsText: e.target.value })}
              className="bg-secondary border-0 min-h-[60px] text-sm mt-1"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Notification Reminders
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/notifications')} className="text-[10px] text-primary underline">History</button>
            {Notification.permission !== 'granted' && (
              <button onClick={requestNotifPermission} className="text-[10px] text-primary underline">Enable</button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifItems.slice(0, showAllNotifications ? undefined : 6).map(({ key, timeKey, label, emoji, note }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm">{emoji} {label}</span>
                    {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {key === 'weeklySummary' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px] gap-1 text-muted-foreground"
                        onClick={() => {
                          try {
                            const summary = buildWeeklySummary();
                            toast('📊 Weekly Summary Preview', {
                              description: summary,
                              duration: 15000,
                            });
                          } catch {
                            toast('Unable to generate weekly summary preview.', { duration: 3000 });
                          }
                        }}
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </Button>
                    )}
                    <Switch checked={notifSettings[key] as boolean} onCheckedChange={v => updateNotif(key, v)} />
                  </div>
                </div>
                {notifSettings[key] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <TimePicker value={notifSettings[timeKey] as string} onChange={v => updateNotif(timeKey, v)} placeholder="Set time" className="bg-secondary border-0 text-xs h-8 w-40" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Water Reminder — every 2 hours */}
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">💧 Water Reminder</span>
                <p className="text-[10px] text-muted-foreground">Every 2 hours during the day</p>
              </div>
              <Switch checked={notifSettings.waterReminder} onCheckedChange={v => updateNotif('waterReminder', v)} />
            </div>
            {notifSettings.waterReminder && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2">
                <TimePicker value={notifSettings.waterReminderStart} onChange={v => updateNotif('waterReminderStart', v)} placeholder="From" className="bg-secondary border-0 text-xs h-8 w-28" />
                <span className="text-[10px] text-muted-foreground">to</span>
                <TimePicker value={notifSettings.waterReminderEnd} onChange={v => updateNotif('waterReminderEnd', v)} placeholder="To" className="bg-secondary border-0 text-xs h-8 w-28" />
              </motion.div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllNotifications(!showAllNotifications)}
            className="w-full text-xs text-primary h-8 gap-1.5"
          >
            {showAllNotifications ? (
              <>Show Less <ChevronRight className="w-3 h-3 rotate-90" /></>
            ) : (
              <>Show All Reminders ({notifItems.length}) <ChevronRight className="w-3 h-3 rotate-90" /></>
            )}
          </Button>
        </div>
      </div>

      {/* Theme */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Theme</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { mode: 'light' as const, icon: Sun, label: 'Light' },
            { mode: 'dark' as const, icon: Moon, label: 'Dark' },
            { mode: 'amoled' as const, icon: Eclipse, label: 'AMOLED' },
            { mode: 'system' as const, icon: Monitor, label: 'System' },
          ].map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => applyTheme(mode)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors ${themeMode === mode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Accent Color</h2>
        <div className="flex gap-2 flex-wrap">
          {accentPresets.map((preset, i) => (
            <button key={preset.name} onClick={() => applyAccent(i)}
              className={`w-9 h-9 rounded-xl transition-all ${accentIndex === i ? 'ring-2 ring-foreground scale-110' : ''}`}
              style={{ background: `hsl(${preset.h}, ${preset.s}%, ${preset.l}%)` }}
              title={preset.name} />
          ))}
        </div>
      </div>

      {/* Safety Protocol - HIGHLIGHTED */}
      <SafetyProtocolSection />

      {/* Accessibility */}
      <AccessibilitySection />

      {/* Data Management */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Data Management</h2>
        <p className="text-[10px] text-muted-foreground">Export your data as a backup file. Import it after reinstalling to restore all settings, sessions, notes, highlights, and more.</p>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="secondary" size="sm" className="flex-1"><Download className="w-4 h-4 mr-1" /> Export Backup</Button>
          <label className="flex-1">
            <Button variant="secondary" size="sm" className="w-full" asChild><span><Upload className="w-4 h-4 mr-1" /> Import Backup</span></Button>
            <input type="file" accept=".json" className="hidden" onChange={importData} />
          </label>
        </div>
        <p className="text-[10px] text-muted-foreground">📌 Study files (PDFs, videos, slides) are stored locally and persist across sessions. Re-import them if you clear all data.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5">
              <Sparkles className="w-4 h-4 mr-1" /> Clear Demo Data & Start Fresh
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Start fresh?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all pre-loaded demo goals, habits, tasks, and other content. Your profile settings, theme, and study files will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-xl flex-1 m-0">Cancel</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl flex-1 m-0 bg-destructive text-destructive-foreground" onClick={clearDemoData}>Clear Demo Data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full"><Trash2 className="w-4 h-4 mr-1" /> Clear All Data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl border-destructive/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Delete all data?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete ALL of your MindFlow data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-xl flex-1 m-0">Cancel</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl flex-1 m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={clearAllData}>Delete Data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Audio Preferences */}
      <AudioPreferencesSection />

      {/* Symmetry & Order Mode */}
      <SymmetryModeSection />

      {/* Install App */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Smartphone className="w-4 h-4" /> Install App
        </h2>
        <p className="text-xs text-muted-foreground">Add MindFlow to your home screen for a native app experience.</p>
        <Button variant="secondary" size="sm" className="w-full gap-1.5" onClick={() => navigate('/install')}>
          <Download className="w-4 h-4" /> Install MindFlow
        </Button>
      </div>

      {/* App Tutorial */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4" /> Help & Tutorial
        </h2>
        <p className="text-xs text-muted-foreground">Learn how every feature and module works.</p>
        <Button variant="secondary" size="sm" className="w-full gap-1.5" onClick={() => setShowTutorial(true)}>
          <BookOpen className="w-4 h-4" /> View App Tutorial
        </Button>
      </div>

      {/* Help Us Grow */}
      <div className="glass rounded-2xl p-4 space-y-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate('/help-us-grow')}>
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          🌱 Help Us Grow
        </h2>
        <p className="text-xs text-muted-foreground">Support the project, see our roadmap & donate</p>
        <Button variant="secondary" size="sm" className="w-full gap-1.5" onClick={(e) => { e.stopPropagation(); navigate('/help-us-grow'); }}>
          Learn More →
        </Button>
      </div>

      {showTutorial && (
        <Suspense fallback={null}>
          <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
        </Suspense>
      )}

      {/* Share App */}
      <div className="glass rounded-2xl p-4 space-y-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => {
        if (navigator.share) {
          navigator.share({
            title: 'MindFlow - Your All-In-One Companion',
            text: 'Check out MindFlow! It has 28+ modules for productivity, studying, wellness, and more. 100% Free.',
            url: 'https://nexusmindflow.vercel.app',
          }).catch(console.error);
        } else {
          navigator.clipboard.writeText('https://nexusmindflow.vercel.app');
          toast.success('Link copied to clipboard!');
        }
      }}>
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Share2 className="w-4 h-4 text-blue-500" /> Share MindFlow
        </h2>
        <p className="text-xs text-muted-foreground">Invite your friends to use MindFlow</p>
        <Button variant="secondary" size="sm" className="w-full gap-1.5" onClick={(e) => {
          e.stopPropagation();
          if (navigator.share) {
            navigator.share({
              title: 'MindFlow - Your All-In-One Companion',
              text: 'Check out MindFlow! It has 28+ modules for productivity, studying, wellness, and more. 100% Free.',
              url: 'https://nexusmindflow.vercel.app',
            }).catch(console.error);
          } else {
            navigator.clipboard.writeText('https://nexusmindflow.vercel.app');
            toast.success('Link copied to clipboard!');
          }
        }}>
          Share App <Share2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Premium Showcase Link */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/showcase')}
        className="glass rounded-2xl p-5 border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent cursor-pointer shadow-lg shadow-primary/5 flex items-center justify-between group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors duration-500" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              We Build Premium Websites & Apps
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click here to explore our curated portfolio of masterpieces.
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors group-hover:translate-x-1 relative z-10" />
      </motion.div>

      {/* About */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground mb-1">About</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-display font-bold">Nexus MindFlow</p>
            <p className="text-xs text-muted-foreground">Version 2.0.0</p>
            <p className="text-xs text-primary font-medium mt-0.5">Developed by Hridoy Zaman</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs text-primary" onClick={() => navigate('/about')}>
            View Details →
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 text-xs h-9 mt-2"
          onClick={() => navigate('/landing')}
        >
          <Globe className="w-4 h-4" /> View Our Website
        </Button>
      </div>
    </motion.div>
  );
}

function SafetyProtocolSection() {
  const navigate = useNavigate();
  const [safety, setSafety] = useLocalStorage<SafetySettings>('safetySettings', defaultSafetySettings);
  const [contacts] = useLocalStorage<EmergencyContact[]>('emergencyContacts', []);

  useEffect(() => { syncSafetyDataToSW(); }, [safety]);

  return (
    <div className={`rounded-2xl p-4 space-y-3 border-2 transition-colors ${safety.enabled ? 'border-destructive/50 bg-destructive/5' : 'border-destructive/30 bg-destructive/5'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <div>
            <h2 className="text-sm font-bold text-destructive">Safety Protocol</h2>
            <p className="text-[10px] text-muted-foreground">Alert emergency contacts on inactivity</p>
          </div>
        </div>
        <Switch checked={safety.enabled} onCheckedChange={v => setSafety(prev => ({ ...prev, enabled: v }))} />
      </div>

      {safety.enabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Inactivity: <strong className="text-foreground">{safety.inactivityDays} days</strong></span>
            <span className="text-xs text-muted-foreground">{contacts.length}/5 contacts</span>
          </div>
          <Slider
            value={[safety.inactivityDays]}
            onValueChange={([v]) => setSafety(prev => ({ ...prev, inactivityDays: v }))}
            min={1} max={30} step={1}
          />
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={() => navigate('/emergency-contacts')}
      >
        <ShieldAlert className="w-3.5 h-3.5" /> Manage Emergency Contacts
      </Button>
    </div>
  );
}

function AccessibilitySection() {
  const [settings, setSettings] = useAccessibility();

  const update = (updates: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Accessibility className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground">Accessibility</h2>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" /> Font Size
        </label>
        <div className="flex gap-1.5">
          {(['small', 'medium', 'large', 'xlarge'] as const).map(size => (
            <button
              key={size}
              onClick={() => update({ fontSize: size })}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${settings.fontSize === size ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              {size === 'xlarge' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* High Contrast */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EyeIcon className="w-4 h-4" />
          <div>
            <p className="text-sm">High Contrast</p>
            <p className="text-[10px] text-muted-foreground">Increase text & element visibility</p>
          </div>
        </div>
        <Switch checked={settings.highContrast} onCheckedChange={v => update({ highContrast: v })} />
      </div>

      {/* Reduce Motion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <div>
            <p className="text-sm">Reduce Motion</p>
            <p className="text-[10px] text-muted-foreground">Disable all animations</p>
          </div>
        </div>
        <Switch checked={settings.reduceMotion} onCheckedChange={v => update({ reduceMotion: v })} />
      </div>

      {/* Bold Text */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BoldIcon className="w-4 h-4" />
          <div>
            <p className="text-sm">Bold Text</p>
            <p className="text-[10px] text-muted-foreground">Make all text bolder for readability</p>
          </div>
        </div>
        <Switch checked={settings.boldText} onCheckedChange={v => update({ boldText: v })} />
      </div>

      {/* Splash Sound */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <div>
            <p className="text-sm">Splash Sound</p>
            <p className="text-[10px] text-muted-foreground">Play sound during app startup animation</p>
          </div>
        </div>
        <Switch checked={settings.splashSound !== false} onCheckedChange={v => update({ splashSound: v })} />
      </div>
    </div>
  );
}

function SymmetryModeSection() {
  const [symmetryMode, setSymmetryMode] = useLocalStorage<boolean>('symmetryMode', false);

  const toggle = (enabled: boolean) => {
    setSymmetryMode(enabled);
    document.documentElement.classList.toggle('symmetry-mode', enabled);
  };

  // Apply on mount
  useEffect(() => {
    if (symmetryMode) document.documentElement.classList.add('symmetry-mode');
  }, []);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Symmetry & Order Mode</h2>
            <p className="text-[10px] text-muted-foreground">Enforces strict alignment and uniform spacing</p>
          </div>
        </div>
        <Switch checked={symmetryMode} onCheckedChange={toggle} />
      </div>
    </div>
  );
}

function AudioPreferencesSection() {
  const [prefs, setPrefs] = useLocalStorage<AudioPreferences>('audioPreferences', DEFAULT_AUDIO_PREFS);
  const { tracks } = useMusicPlayer();

  const update = (updates: Partial<AudioPreferences>) => {
    setPrefs(prev => ({ ...prev, ...updates }));
    toast.success('Audio preference saved');
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground">Audio Preferences</h2>
      </div>

      {/* Default Track */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Default Track</label>
        <Select value={prefs.defaultTrackId || 'none'} onValueChange={v => update({ defaultTrackId: v === 'none' ? '' : v })}>
          <SelectTrigger className="bg-secondary border-0 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {tracks.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.isCustom ? `🎵 ${t.name.replace(/^🎵\s*/, '')}` : t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Default Volume */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Default Volume</label>
          <span className="text-xs font-medium">{Math.round(prefs.defaultVolume * 100)}%</span>
        </div>
        <Slider
          value={[prefs.defaultVolume * 100]}
          onValueChange={([v]) => update({ defaultVolume: v / 100 })}
          min={0} max={100} step={5}
          className="w-full"
        />
      </div>

      {/* Autoplay */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Autoplay on open</p>
          <p className="text-[10px] text-muted-foreground">Plays default track when app loads</p>
        </div>
        <Switch checked={prefs.autoplay} onCheckedChange={v => update({ autoplay: v })} />
      </div>
    </div>
  );
}

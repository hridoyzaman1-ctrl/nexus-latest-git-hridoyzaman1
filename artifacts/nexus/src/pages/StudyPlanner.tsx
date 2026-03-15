import { useState, useCallback, useRef, useEffect } from 'react';
import { logError } from '@/lib/logger';
import { useLocalStorage, isDemoMode } from '@/hooks/useLocalStorage';
import { StudySession, StudyMaterial, StudyNote, StudyTimeLog, StudyHighlight, AlarmSoundType, QuizResult } from '@/types';
import type { Presentation as PresentationType } from '@/types/presentation';
import { getAllMediaItems } from '@/lib/mediaStorage';
import { exampleStudySessions } from '@/lib/examples';
import { saveStudyFile, deleteStudyFile, type StudyFileData } from '@/lib/studyStorage';
import { ArrowLeft, Plus, X, CheckCircle2, Circle, CalendarDays, Bell, Clock, Upload, BookOpen, FileText, Video, Trash2, ChevronDown, ChevronUp, Play, Pause, RotateCcw, StickyNote, Timer, BarChart2, LayoutDashboard, Brain, Sparkles, Download, Presentation, Eye, Headphones } from 'lucide-react';
import { 
  getLinksForSession, 
  removeStudyPresentationLink, 
  removeLinksForSession, 
  getPresentation as getPresentationById,
  getAllPresentations
} from '@/lib/presentationStorage';
import { generatePptx, downloadPptx } from '@/lib/pptxGenerator';
import { getTheme } from '@/lib/presentationThemes';
import AISummarizer from '@/components/AISummarizer';
import MediaGenerationModal from '@/components/MediaGenerationModal';
import SavedNotesAndSummaries from '@/components/SavedNotesAndSummaries';
import { makeStudyPageTextFn } from '@/lib/extractText';
import { parsePptxToSvgSlides } from '@/lib/fileParsers';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import { ALARM_SOUNDS, previewAlarmSound } from '@/lib/alarm';
import { toast } from 'sonner';
import EmptyState from '@/components/EmptyState';
import StudyMaterialReader from '@/components/study/StudyMaterialReader';
import StudyVideoPlayer from '@/components/study/StudyVideoPlayer';
import StudyTimer, { MiniStudyTimer } from '@/components/study/StudyTimer';
import StudyDashboard from '@/components/study/StudyDashboard';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import StudyQuiz from '@/components/study/StudyQuiz';
import KiraStudyBuddy from '@/components/study/KiraStudyBuddy';
import PresentationGenerator from '@/pages/PresentationGenerator';
import PresentationViewer from '@/components/PresentationViewer';


const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
const DOC_EXTENSIONS = ['pdf', 'txt', 'epub', 'pptx', 'ppt'];
const ALL_EXTENSIONS = [...DOC_EXTENSIONS, ...VIDEO_EXTENSIONS];

const STUDY_CATEGORIES = ['Class', 'School', 'University', 'Self-study', 'Certification', 'Research', 'Other'];

export default function StudyPlanner() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('study_init', false);
  const [sessions, setSessions] = useLocalStorage<StudySession[]>('studySessions', hasInit ? [] : exampleStudySessions);
  const [, setInit] = useLocalStorage('study_init', true);
  const [materials, setMaterials] = useLocalStorage<StudyMaterial[]>('studyMaterials', []);
  const [studyNotes, setStudyNotes] = useLocalStorage<StudyNote[]>('studyNotes', []);
  const [timeLogs, setTimeLogs] = useLocalStorage<StudyTimeLog[]>('studyTimeLogs', []);
  const [customCategories, setCustomCategories] = useLocalStorage<string[]>('studyCustomCategories', []);
  const [studyHighlights, setStudyHighlights] = useLocalStorage<StudyHighlight[]>('studyHighlights', []);
  const [completedMaterials, setCompletedMaterials] = useLocalStorage<string[]>('studyCompletedMaterials', []);
  const [quizHistory, setQuizHistory] = useLocalStorage<QuizResult[]>('studyQuizHistory', []);
  const [showQuiz, setShowQuiz] = useState(false);
  const [exportingPresId, setExportingPresId] = useState<string | null>(null);
  const [viewingPresentation, setViewingPresentation] = useState<string | null>(null);
  const [presLinkVersion, setPresLinkVersion] = useState(0);
  const [presentations, setPresentations] = useState<PresentationType[]>([]);

  useEffect(() => {
    getAllPresentations().then(setPresentations);
  }, [presLinkVersion]);
  // UI state
  const [showAdd, setShowAdd] = useState(false);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('60');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newAlarm, setNewAlarm] = useState(false);
  const [newAlarmSound, setNewAlarmSound] = useState<AlarmSoundType>('chime');
  const [newCategory, setNewCategory] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editDuration, setEditDuration] = useState('60');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('09:00');
  const [editReminderDate, setEditReminderDate] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editAlarmEnabled, setEditAlarmEnabled] = useState(false);
  const [editAlarmSound, setEditAlarmSound] = useState<AlarmSoundType>('chime');
  const [editCategory, setEditCategory] = useState('');
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState('');
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [readingMaterial, setReadingMaterial] = useState<StudyMaterial | null>(null);
  const [viewingVideo, setViewingVideo] = useState<StudyMaterial | null>(null);
  const [mediaModalMatId, setMediaModalMatId] = useState<string | null>(null);
  const [showTimerForSession, setShowTimerForSession] = useState<string | null>(null);
  const [miniTimerVisible, setMiniTimerVisible] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPresentations, setShowPresentations] = useState(false);
  // ─── Persistent Timer (survives reader/video sub-view transitions) ───
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0); // seconds
  const [timerSessionDuration, setTimerSessionDuration] = useState(0); // minutes
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerAlarmFired, setTimerAlarmFired] = useState(false);
  const timerRemaining = Math.max(0, timerSessionDuration * 60 - timerElapsed);

  // Persistent timer interval — runs at StudyPlanner level, never killed by sub-view transitions
  useEffect(() => {
    if (!timerRunning) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    timerIntervalRef.current = setInterval(() => {
      if (timerStartedAtRef.current) {
        const newElapsed = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
        setTimerElapsed(newElapsed);
      }
    }, 250);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [timerRunning]);

  // Helper to log whatever time is currently elapsed before resetting
  const logCurrentElapsed = useCallback(() => {
    if (showTimerForSession && timerElapsed >= 60) {
      const minutes = Math.floor(timerElapsed / 60);

      setTimeLogs(prev => {
        // Prevent duplicate logs for the exact same session in rapid succession (e.g. hitting pause then reset)
        const lastLog = prev[prev.length - 1];
        const now = Date.now();
        if (lastLog && lastLog.sessionId === showTimerForSession && (now - new Date(lastLog.endedAt).getTime() < 5000)) {
          return prev;
        }

        const session = sessions.find(s => s.id === showTimerForSession);
        if (!session) return prev;

        return [...prev, {
          id: crypto.randomUUID(),
          sessionId: showTimerForSession,
          subject: session.subject,
          topic: session.topic,
          durationMinutes: minutes,
          startedAt: new Date(now - timerElapsed * 1000).toISOString(),
          endedAt: new Date(now).toISOString(),
        }];
      });
      // Do not reset timerElapsed here, let the caller handle it so UI doesn't jump instantly if just paused
    }
  }, [showTimerForSession, timerElapsed, sessions, setTimeLogs]);

  // Check timer completion
  useEffect(() => {
    if (timerElapsed >= timerSessionDuration * 60 && timerSessionDuration > 0 && !timerAlarmFired && timerRunning && showTimerForSession) {
      setTimerAlarmFired(true);
      setTimerRunning(false);
      logCurrentElapsed();
      toast.success(`✅ Study session complete! ${timerSessionDuration} minutes logged.`, { duration: 8000 });
    }
  }, [timerElapsed, timerSessionDuration, timerAlarmFired, timerRunning, showTimerForSession, logCurrentElapsed]);

  // Timer control functions (passed to StudyTimer)
  const startTimer = useCallback((sessionId: string, durationMinutes: number) => {
    setShowTimerForSession(sessionId);
    setTimerSessionDuration(durationMinutes);
    if (timerElapsed >= durationMinutes * 60 && durationMinutes > 0) return; // already done
    timerStartedAtRef.current = Date.now() - timerElapsed * 1000;
    setTimerRunning(true);
  }, [timerElapsed]);

  const pauseTimer = useCallback(() => {
    if (timerRunning) logCurrentElapsed(); // Log time up to this point
    setTimerRunning(false);
  }, [timerRunning, logCurrentElapsed]);

  const resetTimer = useCallback((durationMinutes?: number) => {
    if (timerElapsed >= 60) logCurrentElapsed(); // Log time before wiping

    setTimerRunning(false);
    setTimerElapsed(0);
    setTimerAlarmFired(false);
    timerStartedAtRef.current = null;
    if (durationMinutes !== undefined) setTimerSessionDuration(durationMinutes);
  }, [timerElapsed, logCurrentElapsed]);

  // Cleanup on unmount (save whatever time is left)
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);

  if (!hasInit) setInit(true);

  const allCategories = [...STUDY_CATEGORIES, ...customCategories.filter(c => !STUDY_CATEGORIES.includes(c))];

  const add = () => {
    if (!subject.trim()) return;
    const scheduledDate = newDate || new Date().toISOString().split('T')[0];
    let cat = newCategory;
    if (customCategoryInput.trim() && !allCategories.includes(customCategoryInput.trim())) {
      cat = customCategoryInput.trim();
      setCustomCategories(prev => [...prev, cat]);
    } else if (customCategoryInput.trim()) {
      cat = customCategoryInput.trim();
    }
    setSessions(prev => [{
      id: crypto.randomUUID(), subject: subject.trim(), topic, duration: parseInt(duration) || 60,
      scheduledDate, scheduledTime: newTime || '09:00', completed: false,
      color: 'hsl(245, 58%, 62%)', studyCategory: cat || undefined,
      reminderDate: newReminderDate || null, reminderTime: newReminderTime || null,
      alarmEnabled: newAlarm, alarmSound: newAlarmSound, alarmFired: false,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    if (newReminderDate && newReminderTime) toast.success(`⏰ Reminder set${newAlarm ? ' with alarm' : ''}`);
    setSubject(''); setTopic(''); setShowAdd(false); setNewCategory(''); setCustomCategoryInput('');
    setNewDate(''); setNewTime('09:00'); setNewReminderDate(''); setNewReminderTime('');
    setNewAlarm(false); setNewAlarmSound('chime');
  };

  const startEditSession = (session: StudySession) => {
    setEditingSessionId(session.id);
    setEditSubject(session.subject);
    setEditTopic(session.topic || '');
    setEditDuration(session.duration.toString());
    setEditDate(session.scheduledDate);
    setEditTime(session.scheduledTime);
    setEditReminderDate(session.reminderDate || '');
    setEditReminderTime(session.reminderTime || '');
    setEditAlarmEnabled(session.alarmEnabled || false);
    setEditAlarmSound(session.alarmSound || 'chime');
    setEditCategory(session.studyCategory || '');
    setShowEditSchedule(!!(session.reminderDate));
    setExpandedId(session.id);
  };

  const saveEditSession = (id: string) => {
    let cat = editCategory;
    if (editCustomCategoryInput.trim() && !allCategories.includes(editCustomCategoryInput.trim())) {
      cat = editCustomCategoryInput.trim();
      setCustomCategories(prev => [...prev, cat]);
    } else if (editCustomCategoryInput.trim()) {
      cat = editCustomCategoryInput.trim();
    }

    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        subject: editSubject.trim(),
        topic: editTopic.trim(),
        duration: parseInt(editDuration) || 60,
        scheduledDate: editDate || s.scheduledDate,
        scheduledTime: editTime || s.scheduledTime,
        studyCategory: cat || undefined,
        reminderDate: editReminderDate || null,
        reminderTime: editReminderTime || null,
        alarmEnabled: editAlarmEnabled,
        alarmSound: editAlarmSound,
      };
    }));
    setEditingSessionId(null);
    toast.success('Session updated');
  };

  const toggle = (id: string) => setSessions(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  const deleteSession = (id: string) => {
    const sessionMaterials = materials.filter(m => m.sessionId === id);
    sessionMaterials.forEach(m => deleteStudyFile(m.id).catch(() => { }));
    setMaterials(prev => prev.filter(m => m.sessionId !== id));
    setStudyNotes(prev => prev.filter(n => n.sessionId !== id));
    removeLinksForSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast('Session deleted');
  };

  const completed = sessions.filter(s => s.completed).length;

  // Import file handler
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importSessionId) return;
    const name = file.name.replace(/\.[^.]+$/, '');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALL_EXTENSIONS.includes(ext)) {
      toast.error(`".${ext}" not supported. Use PDF, TXT, EPUB, PPTX, MP4, WebM, MOV, AVI, or MKV.`);
      e.target.value = '';
      return;
    }

    // No file size limit — all data stays in local IndexedDB

    const isVideo = VIDEO_EXTENSIONS.includes(ext);
    const materialId = crypto.randomUUID();

    try {
      if (isVideo) {
        toast.loading('Importing video…');
        const arrayBuffer = await file.arrayBuffer();
        await saveStudyFile(materialId, { videoBlob: arrayBuffer, videoType: file.type || `video/${ext}` });
        const mat: StudyMaterial = {
          id: materialId, sessionId: importSessionId, name: file.name,
          fileType: ext as any, category: 'video', createdAt: new Date().toISOString(),
        };
        setMaterials(prev => [...prev, mat]);
        toast.dismiss();
        toast.success(`Video "${name}" imported!`);
      } else if (ext === 'pdf') {
        toast.loading('Processing PDF…');
        const arrayBuffer = await file.arrayBuffer();
        const bufferCopy = arrayBuffer.slice(0);
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const bytes = new Uint8Array(bufferCopy);
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);
        await saveStudyFile(materialId, { pdfData: base64 });
        const mat: StudyMaterial = {
          id: materialId, sessionId: importSessionId, name: file.name,
          fileType: 'pdf', totalPages: pdf.numPages, currentPage: 1,
          category: 'book', createdAt: new Date().toISOString(),
        };
        setMaterials(prev => [...prev, mat]);
        toast.dismiss();
        toast.success(`PDF "${name}" — ${pdf.numPages} pages`);
      } else if (ext === 'txt') {
        const text = await file.text();
        if (!text.trim()) { toast.error('File is empty'); e.target.value = ''; return; }
        await saveStudyFile(materialId, { content: text });
        const mat: StudyMaterial = {
          id: materialId, sessionId: importSessionId, name: file.name,
          fileType: 'txt', totalPages: Math.ceil(text.length / 2000), currentPage: 1,
          category: 'book', createdAt: new Date().toISOString(),
        };
        setMaterials(prev => [...prev, mat]);
        toast.success(`Text file "${name}" imported!`);
      } else if (ext === 'epub') {
        toast.loading('Processing EPUB…');
        try {
          const ePub = (await import('epubjs')).default;
          const arrayBuffer = await file.arrayBuffer();
          const book = ePub(arrayBuffer as any);
          await book.ready;
          const spine = book.spine as any;
          const chapters: string[] = [];
          if (spine && spine.each) {
            const items: any[] = [];
            spine.each((item: any) => items.push(item));
            for (const item of items) {
              try {
                const doc = await book.load(item.href);
                const text = doc instanceof Document ? (doc.body?.textContent || '') : typeof doc === 'string' ? new DOMParser().parseFromString(doc, 'text/html').body?.textContent || '' : '';
                if (text.trim()) chapters.push(text.trim());
              } catch { /* skip */ }
            }
          }
          const fullText = chapters.join('\n\n--- Chapter ---\n\n');
          if (!fullText.trim()) { toast.dismiss(); toast.error('Could not extract text from EPUB.'); e.target.value = ''; return; }
          await saveStudyFile(materialId, { content: fullText });
          const mat: StudyMaterial = {
            id: materialId, sessionId: importSessionId, name: file.name,
            fileType: 'epub', totalPages: Math.ceil(fullText.length / 2000), currentPage: 1,
            category: 'book', createdAt: new Date().toISOString(),
          };
          setMaterials(prev => [...prev, mat]);
          book.destroy();
          toast.dismiss();
          toast.success(`EPUB "${name}" imported!`);
        } catch { toast.dismiss(); toast.error('Failed to parse EPUB.'); }
      } else if (ext === 'pptx' || ext === 'ppt') {
        toast.loading('Processing slides…');
        try {
          const slides = await parsePptxToSvgSlides(await file.arrayBuffer());

          if (slides.length === 0) { toast.dismiss(); toast.error('No slides found in this file.'); e.target.value = ''; return; }

          await saveStudyFile(materialId, { pptxSlides: slides });
          const mat: StudyMaterial = {
            id: materialId, sessionId: importSessionId, name: file.name,
            fileType: ext as 'pptx' | 'ppt', totalPages: slides.length, currentPage: 1,
            category: 'lecture-slides', createdAt: new Date().toISOString(),
          };
          setMaterials(prev => [...prev, mat]);
          toast.dismiss();
          toast.success(`Slides "${name}" — ${slides.length} slides`);
        } catch (err) {
          toast.dismiss();
          toast.error('Failed to process presentation file.');
          logError('PPTX error', err);
        }
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to import file.');
      logError('File import error', err);
    }
    e.target.value = '';
    setImportSessionId(null);
  };

  const deleteMaterial = (id: string) => {
    deleteStudyFile(id).catch(() => { });
    setMaterials(prev => prev.filter(m => m.id !== id));
    toast('Material removed');
  };

  const updateMaterialPage = useCallback((materialId: string, page: number) => {
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, currentPage: page } : m));
  }, [setMaterials]);

  const handleSaveNote = useCallback((note: StudyNote) => {
    setStudyNotes(prev => {
      const exists = prev.find(n => n.id === note.id);
      if (exists) return prev.map(n => n.id === note.id ? note : n);
      return [...prev, note];
    });
  }, [setStudyNotes]);

  const handleDeleteNote = useCallback((noteId: string) => {
    setStudyNotes(prev => prev.filter(n => n.id !== noteId));
  }, [setStudyNotes]);

  const handleExportStudyPresentation = async (presentationId: string) => {
    const pres = await getPresentationById(presentationId);
    if (!pres) {
      toast.error('Presentation not found. It may have been deleted from the Presentation Maker.');
      return;
    }
    setExportingPresId(presentationId);
    try {
      const safeName = pres.settings.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'presentation';
      const blob = await generatePptx(pres.slides, pres.themeId, pres.settings.title);
      downloadPptx(blob, safeName);
      toast.success('Presentation downloaded!');
    } catch {
      toast.error('Failed to export presentation.');
    } finally {
      setExportingPresId(null);
    }
  };

  const handleUnlinkPresentation = (linkId: string) => {
    removeStudyPresentationLink(linkId);
    setPresLinkVersion(v => v + 1);
    toast.success('Presentation removed from this subject.');
  };

  // Open a linked presentation as a PPTX in the default study reader
  const handleViewPresentationAsDoc = async (presentationId: string, sessionId: string) => {
    const pres = await getPresentationById(presentationId);
    if (!pres) {
      toast.error('Presentation not found.');
      return;
    }
    // Check if we already created a material for this presentation in this session
    const existingMat = materials.find(m => m.id === `pres-${presentationId}-${sessionId}`);
    if (existingMat) {
      setReadingMaterial(existingMat);
      return;
    }
    toast.loading('Opening presentation…');
    try {
      const blob = await generatePptx(pres.slides, pres.themeId, pres.settings.title);
      const arrayBuffer = await blob.arrayBuffer();
      const slides = await parsePptxToSvgSlides(arrayBuffer);

      if (slides.length === 0) {
        toast.dismiss();
        toast.error('Could not parse presentation.');
        return;
      }
      const materialId = `pres-${presentationId}-${sessionId}`;
      await saveStudyFile(materialId, { pptxSlides: slides });
      const mat: StudyMaterial = {
        id: materialId, sessionId, name: pres.settings.title + '.pptx',
        fileType: 'pptx', totalPages: slides.length, currentPage: 1,
        category: 'lecture-slides', createdAt: new Date().toISOString(),
      };
      setMaterials(prev => [...prev, mat]);
      toast.dismiss();
      setReadingMaterial(mat);
    } catch (err) {
      logError('viewPresAsDoc', err);
      toast.dismiss();
      toast.error('Failed to open presentation.');
    }
  };

  const logTime = useCallback((sessionId: string, minutes: number) => {
    // Kept for backward compatibility if called directly elsewhere
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const now = new Date().toISOString();
    setTimeLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      sessionId,
      subject: session.subject,
      topic: session.topic,
      durationMinutes: minutes,
      startedAt: new Date(Date.now() - minutes * 60000).toISOString(),
      endedAt: now,
    }]);
  }, [sessions, setTimeLogs]);

  // Ensure timer gets logged if user navigates away or unmounts the component
  // Use a ref to hold latest values for unmount
  const timerStateRef = useRef({ timerElapsed, showTimerForSession, sessions });
  useEffect(() => {
    timerStateRef.current = { timerElapsed, showTimerForSession, sessions };
  }, [timerElapsed, showTimerForSession, sessions]);

  useEffect(() => {
    return () => {
      // Unmount hook: log the time if at least 1 minute passed and a session is active
      const state = timerStateRef.current;
      if (state.showTimerForSession && state.timerElapsed >= 60) {
        const minutes = Math.floor(state.timerElapsed / 60);
        const session = state.sessions.find(s => s.id === state.showTimerForSession);
        if (session) {
          setTimeLogs(prev => [...prev, {
            id: crypto.randomUUID(),
            sessionId: state.showTimerForSession!,
            subject: session.subject,
            topic: session.topic,
            durationMinutes: minutes,
            startedAt: new Date(Date.now() - state.timerElapsed * 1000).toISOString(),
            endedAt: new Date().toISOString(),
          }]);
        }
      }
    };
  }, [setTimeLogs]);

  const sessionMaterials = (id: string) => materials.filter(m => m.sessionId === id);
  const sessionNotes = (id: string) => studyNotes.filter(n => n.sessionId === id);

  const changeMaterialCategory = (id: string, cat: StudyMaterial['category']) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, category: cat } : m));
  };

  const toggleMaterialCompleted = (id: string) => {
    setCompletedMaterials(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSaveQuiz = useCallback((result: QuizResult) => {
    setQuizHistory(prev => {
      const exists = prev.find(q => q.id === result.id);
      if (exists) return prev.map(q => q.id === result.id ? result : q);
      return [...prev, result];
    });
  }, [setQuizHistory]);

  // Get next session after current one
  const getNextSession = (currentId: string) => {
    const idx = sessions.findIndex(s => s.id === currentId);
    if (idx >= 0 && idx < sessions.length - 1) return sessions[idx + 1];
    return null;
  };

  // Total study time
  const totalStudyMinutes = timeLogs.reduce((s, l) => s + l.durationMinutes, 0);

  if (showPresentations) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setShowPresentations(false)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold font-display flex-1">Study Presentations</h1>
        </div>
        <PresentationGenerator embedded />
      </motion.div>
    );
  }

  // Quiz view
  if (showQuiz) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24">
        <StudyQuiz
          sessions={sessions}
          materials={materials}
          quizHistory={quizHistory}
          onSaveQuiz={handleSaveQuiz}
          onDeleteQuiz={(id) => setQuizHistory(prev => prev.filter(q => q.id !== id))}
          onDeleteAllQuizzes={() => setQuizHistory([])}
          onBack={() => setShowQuiz(false)}
        />
      </motion.div>
    );
  }

  // If reading a material
  if (readingMaterial) {
    const isVideo = VIDEO_EXTENSIONS.includes(readingMaterial.fileType);
    const timerOverlay = showTimerForSession ? (
      <MiniStudyTimer remaining={timerRemaining} isRunning={timerRunning} visible={miniTimerVisible} onToggleVisible={() => setMiniTimerVisible(!miniTimerVisible)} />
    ) : null;

    if (isVideo) {
      return (
        <StudyVideoPlayer
          material={readingMaterial}
          onBack={() => setReadingMaterial(null)}
          notes={sessionNotes(readingMaterial.sessionId)}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          timerOverlay={timerOverlay}
          sessionId={readingMaterial.sessionId}
        />
      );
    }
    return (
      <StudyMaterialReader
        material={readingMaterial}
        onBack={() => setReadingMaterial(null)}
        onPageUpdate={p => updateMaterialPage(readingMaterial.id, p)}
        timerOverlay={timerOverlay}
        notes={sessionNotes(readingMaterial.sessionId)}
        onSaveNote={handleSaveNote}
        sessionId={readingMaterial.sessionId}
        highlights={studyHighlights}
        onSaveHighlight={(h) => setStudyHighlights(prev => [...prev, h])}
        onDeleteHighlight={(id) => setStudyHighlights(prev => prev.filter(h => h.id !== id))}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="study" />
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept={ALL_EXTENSIONS.map(e => `.${e}`).join(',')} className="hidden" onChange={handleFileImport} disabled={isDemoMode} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => navigate(-1)} className="text-muted-foreground shrink-0"><ArrowLeft className="w-5 h-5" /></button>
          <h1 data-tour="study-header" className="text-xl sm:text-2xl font-bold font-display truncate">Study Planner</h1>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 -mb-1 w-full sm:w-auto shrink-0">
          <div data-tour="study-stats"><Button size="sm" variant={showDashboard ? 'default' : 'ghost'} onClick={() => { setShowDashboard(!showDashboard); if (showHistory) setShowHistory(false); }} className="px-2 shrink-0"><LayoutDashboard className="w-4 h-4" /></Button></div>
          <div data-tour="study-quiz-btn"><Button size="sm" variant="ghost" onClick={() => !isDemoMode && setShowQuiz(true)} title={isDemoMode ? "AI Quiz Disabled in Demo" : "AI Quiz"} disabled={isDemoMode} className="px-2 shrink-0"><Brain className="w-4 h-4" /></Button></div>
          <Button size="sm" variant="ghost" onClick={() => { setShowPresentations(true); setShowDashboard(false); setShowHistory(false); }} title="Presentations" data-testid="button-study-presentations" className="px-2 shrink-0"><Presentation className="w-4 h-4" /></Button>
          <Button size="sm" variant={showHistory ? 'default' : 'ghost'} onClick={() => { setShowHistory(!showHistory); if (showDashboard) setShowDashboard(false); }} className="px-2 shrink-0"><BarChart2 className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => { setShowAdd(!showAdd); if (showDashboard) setShowDashboard(false); if (showHistory) setShowHistory(false); }} variant="ghost" className="px-2 shrink-0"><Plus className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* Study Dashboard */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <StudyDashboard
              sessions={sessions}
              materials={materials}
              notes={studyNotes}
              timeLogs={timeLogs}
              onDeleteLog={(id) => setTimeLogs(prev => prev.filter(l => l.id !== id))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {!showDashboard && (
        <>
          <div className="glass rounded-2xl p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Completed</span>
            <span className="font-semibold text-success">{completed}/{sessions.length}</span>
          </div>
          {totalStudyMinutes > 0 && (
            <div className="glass rounded-2xl p-3 flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> Total Study Time</span>
              <span className="font-semibold text-primary">{Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m</span>
            </div>
          )}
        </>
      )}

      {/* Study time history */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass rounded-2xl p-3 space-y-2 overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground">📊 Study History</p>
            {timeLogs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4 opacity-60">No study sessions logged yet. Use the timer in a session to track study time.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {[...timeLogs].reverse().slice(0, 20).map(log => (
                  <div key={log.id} className="flex justify-between text-xs py-1 border-b border-border/30">
                    <span className="font-medium">{log.subject}{log.topic ? ` — ${log.topic}` : ''}</span>
                    <span className="text-muted-foreground">{log.durationMinutes}min • {new Date(log.endedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
            {(() => {
              const studyMedia = getAllMediaItems().filter(m => m.sourceModule === 'study');
              if (studyMedia.length === 0) return null;
              return (
                <div className="pt-1 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">🎧 Generated Media ({studyMedia.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {studyMedia.slice(0, 10).map(m => (
                      <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-border/20">
                        <span className="font-medium truncate max-w-[65%]">{m.title}</span>
                        <span className="text-muted-foreground capitalize shrink-0 ml-2">{m.mode} · {m.wordCount}w</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add session form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="bg-secondary border-0" />
            <Input placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} className="bg-secondary border-0" />
            <Input type="number" placeholder="Duration (minutes)" value={duration} onChange={e => setDuration(e.target.value)} className="bg-secondary border-0" />

            {/* Category */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Category (optional)</span>
              <div className="flex gap-1.5 flex-wrap">
                {allCategories.map(cat => (
                  <button key={cat} onClick={() => { setNewCategory(cat); setCustomCategoryInput(''); }}
                    className={`text-[10px] px-2.5 py-1.5 rounded-full transition-colors ${newCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <Input placeholder="Or type custom category..." value={customCategoryInput} onChange={e => { setCustomCategoryInput(e.target.value); setNewCategory(''); }} className="bg-secondary border-0 text-xs h-8" />
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-info" />
              <span className="text-xs font-medium">Schedule</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DatePicker value={newDate} onChange={setNewDate} placeholder="Date" className="bg-secondary border-0 w-full h-10 text-xs" />
              <TimePicker value={newTime} onChange={setNewTime} placeholder="Time" className="bg-secondary border-0 w-full h-10 text-xs" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Bell className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">Reminder</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DatePicker value={newReminderDate} onChange={setNewReminderDate} placeholder="Date" className="bg-secondary border-0 w-full h-10 text-xs" />
              <TimePicker value={newReminderTime} onChange={setNewReminderTime} placeholder="Time" className="bg-secondary border-0 w-full h-10 text-xs" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">🔔 Play alarm sound</span>
              <Switch checked={newAlarm} onCheckedChange={setNewAlarm} />
            </div>
            {newAlarm && (
              <div className="flex gap-1.5 flex-wrap">
                {ALARM_SOUNDS.map(s => (
                  <button key={s.value} type="button" onClick={() => { setNewAlarmSound(s.value); previewAlarmSound(s.value); }}
                    className={`text-[10px] px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 ${newAlarmSound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={add} className="flex-1" size="sm">Add Session</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions list */}
      <div className="space-y-3 pb-8">
        {sessions.length === 0 && !showAdd && (
          <EmptyState
            icon={BookOpen}
            title="No study sessions"
            description="Create your first study session to organize your materials."
            actionLabel="Add Session"
            onAction={() => setShowAdd(true)}
          />
        )}
        {sessions.map(session => {
          const isExpanded = expandedId === session.id;
          const mats = sessionMaterials(session.id);
          const notes = sessionNotes(session.id);
          const sTimeLogs = timeLogs.filter(l => l.sessionId === session.id);
          const sessionStudyMin = sTimeLogs.reduce((s, l) => s + l.durationMinutes, 0);
          const nextSession = getNextSession(session.id);

          return (
            <motion.div key={session.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl overflow-hidden">
              {/* Session header */}
              <div className="p-2 sm:p-3 flex items-start sm:items-center gap-2 sm:gap-3 relative">
                <button onClick={() => toggle(session.id)} className="mt-1 sm:mt-0 shrink-0">
                  {session.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <button className="flex-1 text-left min-w-0 pr-1" onClick={() => setExpandedId(isExpanded ? null : session.id)}>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-sm font-semibold truncate max-w-full">{session.subject}</span>
                    {session.studyCategory && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground whitespace-nowrap">{session.studyCategory}</span>
                    )}
                  </div>
                  {session.topic && <div className="text-xs text-muted-foreground truncate w-full">— {session.topic}</div>}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{session.duration}min</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/15 text-info flex items-center gap-0.5">
                      <CalendarDays className="w-3 h-3" /> {session.scheduledDate} {session.scheduledTime}
                    </span>
                    {mats.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{mats.length} file{mats.length > 1 ? 's' : ''}</span>
                    )}
                    {sessionStudyMin > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success flex items-center gap-0.5">
                        <Timer className="w-3 h-3" /> {sessionStudyMin}min studied
                      </span>
                    )}
                    {session.reminderDate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-0.5">
                        {session.alarmEnabled ? <Bell className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {session.reminderDate} {session.reminderTime || ''}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 bg-background/50 rounded-lg backdrop-blur-sm self-start sm:self-auto p-0.5 sm:p-0">
                  <button onClick={(e) => { e.stopPropagation(); startEditSession(session); }} className="text-muted-foreground hover:text-primary p-1 sm:p-1.5 rounded-md">
                    <StickyNote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="text-muted-foreground hover:text-destructive p-1 sm:p-1.5 rounded-md">
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : session.id)} className="text-muted-foreground p-1 sm:p-1.5 rounded-md">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
                      {editingSessionId === session.id ? (
                        <div className="glass p-3 rounded-xl space-y-3 bg-secondary/20 border border-primary/10">
                          <Input placeholder="Subject" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="bg-secondary border-0 text-sm h-9" />
                          <Input placeholder="Topic" value={editTopic} onChange={e => setEditTopic(e.target.value)} className="bg-secondary border-0 text-xs h-9" />
                          <Input type="number" placeholder="Duration (min)" value={editDuration} onChange={e => setEditDuration(e.target.value)} className="bg-secondary border-0 text-xs h-9" />

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-medium text-muted-foreground">Category</span>
                            <div className="flex gap-1 flex-wrap">
                              {allCategories.map(cat => (
                                <button key={cat} onClick={() => { setEditCategory(cat); setEditCustomCategoryInput(''); }}
                                  className={`text-[9px] px-2 py-1 rounded-full transition-colors ${editCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                                  {cat}
                                </button>
                              ))}
                            </div>
                            <Input placeholder="Or custom..." value={editCustomCategoryInput} onChange={e => { setEditCustomCategoryInput(e.target.value); setEditCategory(''); }} className="bg-secondary border-0 text-xs h-8" />
                          </div>

                          <div className="flex gap-2 items-center">
                            <button onClick={() => setShowEditSchedule(!showEditSchedule)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showEditSchedule ? 'bg-info text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                              <CalendarDays className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] text-muted-foreground">Schedule & Reminder</span>
                          </div>

                          {showEditSchedule && (
                            <div className="bg-secondary/30 rounded-xl p-3 space-y-2 border border-border/10">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <DatePicker value={editDate} onChange={setEditDate} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                                <TimePicker value={editTime} onChange={setEditTime} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <DatePicker value={editReminderDate} onChange={setEditReminderDate} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                                <TimePicker value={editReminderTime} onChange={setEditReminderTime} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                              </div>
                              <div className="flex items-center justify-between border-t border-border/10 pt-2">
                                <span className="text-[10px] text-muted-foreground">Alarm sound</span>
                                <Switch checked={editAlarmEnabled} onCheckedChange={setEditAlarmEnabled} />
                              </div>
                              {editAlarmEnabled && (
                                <div className="flex gap-1 flex-wrap">
                                  {ALARM_SOUNDS.map(s => (
                                    <button key={s.value} type="button" onClick={() => { setEditAlarmSound(s.value); previewAlarmSound(s.value); }}
                                      className={`text-[9px] px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${editAlarmSound === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                                      <span>{s.emoji}</span> {s.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEditSession(session.id)} className="flex-1 h-9">Save Changes</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSessionId(null)} className="h-9">Cancel</Button>
                          </div>
                        </div>
                      ) : (() => {
                        const isThisSession = showTimerForSession === session.id;
                        const elapsed = isThisSession ? timerElapsed : 0;
                        const totalSec = session.duration * 60;
                        const rem = isThisSession ? timerRemaining : totalSec;
                        const running = isThisSession && timerRunning;
                        const done = isThisSession && timerAlarmFired;
                        const progress = totalSec > 0 ? ((totalSec - rem) / totalSec) * 100 : 0;
                        const fmtTime = (secs: number) => {
                          const h = Math.floor(secs / 3600);
                          const m = Math.floor((secs % 3600) / 60);
                          const s = secs % 60;
                          if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                          return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                        };
                        return (
                          <div data-tour="study-timer" className="glass rounded-2xl p-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 shrink-0">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`} strokeLinecap="round" />
                                </svg>
                                <Timer className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-mono font-bold truncate">{fmtTime(rem)}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {done ? '✅ Complete!' : running ? 'Studying...' : elapsed > 0 ? 'Paused' : 'Ready'}
                                </p>
                              </div>
                              <div className="flex gap-1 sm:gap-1.5 shrink-0">
                                {!done && (
                                  running ? (
                                    <Button size="sm" variant="outline" onClick={pauseTimer} className="h-8 w-8 p-0"><Pause className="w-3.5 h-3.5" /></Button>
                                  ) : (
                                    <Button size="sm" onClick={() => startTimer(session.id, session.duration)} className="h-8 w-8 p-0"><Play className="w-3.5 h-3.5" /></Button>
                                  )
                                )}
                                <Button size="sm" variant="ghost" onClick={() => resetTimer(session.duration)} className="h-8 w-8 p-0"><RotateCcw className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Materials */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">📚 Materials</span>
                          <button onClick={() => { setImportSessionId(session.id); fileInputRef.current?.click(); }}
                            className="text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25 flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Import
                          </button>
                        </div>

                        {mats.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground opacity-60 py-2 text-center">No materials yet. Import PDF, TXT, EPUB, PPTX, or video files.</p>
                        ) : (
                          <div className="space-y-1">
                            {mats.map(mat => {
                              const isVideo = VIDEO_EXTENSIONS.includes(mat.fileType);
                              return (
                                <div key={mat.id} className={`rounded-xl ${completedMaterials.includes(mat.id) ? 'bg-success/10 border border-success/20' : 'bg-secondary/50'}`}>
                                  <div className="flex items-center gap-2 p-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                      {isVideo ? <Video className="w-3.5 h-3.5 text-primary" /> : mat.fileType === 'pptx' || mat.fileType === 'ppt' ? <FileText className="w-3.5 h-3.5 text-warning" /> : <BookOpen className="w-3.5 h-3.5 text-primary" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{mat.name}</p>
                                      <div className="flex gap-1.5 items-center flex-wrap">
                                        <span className="text-[9px] text-muted-foreground">{mat.fileType.toUpperCase()}</span>
                                        <select
                                          value={mat.category}
                                          onChange={e => changeMaterialCategory(mat.id, e.target.value as StudyMaterial['category'])}
                                          className="text-[9px] bg-transparent border rounded px-1 py-0.5 text-muted-foreground"
                                        >
                                          <option value="book">📖 Book</option>
                                          <option value="lecture-slides">📊 Lecture Slides</option>
                                          <option value="sheet">📄 Sheet</option>
                                          <option value="video">🎬 Video</option>
                                        </select>
                                        {mat.totalPages && <span className="text-[9px] text-muted-foreground">p{mat.currentPage || 1}/{mat.totalPages}</span>}
                                      </div>
                                    </div>
                                    <button onClick={() => toggleMaterialCompleted(mat.id)} className={`p-1 rounded-lg transition-colors ${completedMaterials.includes(mat.id) ? 'text-success' : 'text-muted-foreground/40 hover:text-success/60'}`} title={completedMaterials.includes(mat.id) ? 'Mark as unread' : 'Mark as done'}>
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setReadingMaterial(mat)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title={isVideo ? 'Play' : 'Read'}>
                                      {isVideo ? <Play className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={() => deleteMaterial(mat.id)} className="p-1 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {/* AI Summarizer + Saved Notes on their own rows */}
                                  <div className="px-2 pb-2">
                                    {!isVideo && mat.totalPages && mat.totalPages > 0 && (
                                      <AISummarizer
                                        documentId={mat.id}
                                        documentName={mat.name}
                                        getPageText={makeStudyPageTextFn(mat.id, mat.fileType)}
                                        totalPages={mat.totalPages}
                                      />
                                    )}
                                    {!isVideo && (
                                      <button
                                        onClick={() => setMediaModalMatId(mat.id)}
                                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-xl hover:bg-primary/10 w-full justify-center border border-dashed border-border/30 mt-1.5"
                                      >
                                        <Headphones className="w-3.5 h-3.5" />
                                        Generate Audio / Video
                                      </button>
                                    )}
                                    <SavedNotesAndSummaries
                                      documentId={mat.id}
                                      notes={studyNotes.filter(n => n.materialId === mat.id).map(n => ({ id: n.id, title: n.title, content: n.content, updatedAt: n.updatedAt }))}
                                      onDeleteNote={handleDeleteNote}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {notes.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><StickyNote className="w-3 h-3" /> Study Notes <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success">✓ Saved</span></span>
                          {notes.map(note => (
                            <div key={note.id} className="p-2 rounded-xl bg-secondary/50">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium">{note.title}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</span>
                                  <button onClick={() => { const blob = new Blob([note.content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${note.title}.txt`; a.click(); URL.revokeObjectURL(url); }} className="p-0.5 text-muted-foreground hover:text-primary" title="Download">
                                    <Download className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => { setStudyNotes(prev => prev.filter(n => n.id !== note.id)); toast('Note deleted'); }} className="p-0.5 text-muted-foreground hover:text-destructive" title="Delete">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Linked Presentations */}
                      {(() => {
                        const presLinks = getLinksForSession(session.id);
                        const linkedPresentations = presLinks.map(link => {
                          const pres = presentations.find(p => p.id === link.presentationId);
                          return { link, pres };
                        }).filter(item => item.pres !== undefined);
                        if (linkedPresentations.length === 0 && presLinks.length === 0) return null;
                        return (
                          <div className="space-y-1.5" data-testid={`section-linked-presentations-${session.id}`}>
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Presentation className="w-3 h-3" /> Generated Presentations
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{linkedPresentations.length}</span>
                            </span>
                            {linkedPresentations.length === 0 && presLinks.length > 0 ? (
                              <p className="text-[10px] text-muted-foreground opacity-60 py-2 text-center">Linked presentations have been removed from the Presentation Maker.</p>
                            ) : (
                              <div className="space-y-1">
                                {linkedPresentations.map(({ link, pres }) => {
                                  if (!pres) return null;
                                  const theme = getTheme(pres.themeId);
                                  return (
                                    <div key={link.id} className="rounded-xl bg-secondary/50" data-testid={`card-linked-pres-${link.id}`}>
                                      <div className="flex items-center gap-2 p-2">
                                        <div className="p-1.5 rounded-lg bg-primary/10">
                                          <Presentation className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate" data-testid={`text-linked-pres-title-${link.id}`}>{pres.settings.title}</p>
                                          <div className="flex gap-1.5 items-center flex-wrap">
                                            <span className="text-[9px] text-muted-foreground">{pres.slides.length} slides</span>
                                            <span className="text-[9px] px-1 py-0.5 rounded-full bg-primary/10 text-primary">{theme.name}</span>
                                            <span className="text-[9px] text-muted-foreground">{new Date(link.addedAt).toLocaleDateString()}</span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleViewPresentationAsDoc(pres.id, session.id)}
                                          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                                          title="Open in reader"
                                          data-testid={`button-view-pres-${link.id}`}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleExportStudyPresentation(pres.id)}
                                          disabled={exportingPresId === pres.id}
                                          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary disabled:opacity-50"
                                          title="Download PPTX"
                                          data-testid={`button-download-pres-${link.id}`}
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleUnlinkPresentation(link.id)}
                                          className="p-1 text-muted-foreground hover:text-destructive"
                                          title="Remove from subject (keeps in Presentation Maker)"
                                          data-testid={`button-unlink-pres-${link.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Delete session */}
                      <div className="flex justify-end pt-1">
                        <button onClick={() => deleteSession(session.id)} className="text-[10px] text-destructive hover:text-destructive/80 flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Delete Session
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Kira Study Buddy - always available in Study Planner */}
      <div data-tour="study-buddy-fab" className="contents">
        <KiraStudyBuddy />
      </div>
      {mediaModalMatId && (() => {
        const mm = materials.find(m => m.id === mediaModalMatId);
        if (!mm) return null;
        return (
          <MediaGenerationModal
            open
            onClose={() => setMediaModalMatId(null)}
            sourceModule="study"
            sourceId={mm.id}
            sourceName={mm.name}
            getSourceText={makeStudyPageTextFn(mm.id, mm.fileType)}
            totalPages={mm.totalPages || 0}
          />
        );
      })()}
    </motion.div>
  );
}

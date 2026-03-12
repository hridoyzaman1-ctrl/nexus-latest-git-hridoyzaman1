import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Note, NoteVersion, AlarmSoundType } from '@/types';
import { exampleNotes } from '@/lib/examples';
import { ArrowLeft, Plus, Trash2, X, Search, FolderOpen, Tag, History, Link2, ChevronDown, ChevronUp, Undo2, CalendarDays, Bell, Clock, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import EmptyState from '@/components/EmptyState';
import { ALARM_SOUNDS, previewAlarmSound } from '@/lib/alarm';

export default function Notes() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('notes_init', false);
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', hasInit ? [] : exampleNotes);
  const [, setInit] = useLocalStorage('notes_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [folder, setFolder] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editReminderDate, setEditReminderDate] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editAlarmEnabled, setEditAlarmEnabled] = useState(false);
  const [editAlarmSound, setEditAlarmSound] = useState<AlarmSoundType>('chime');
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [showVersions, setShowVersions] = useState<string | null>(null);
  // Scheduling state for new notes
  const [showScheduleNew, setShowScheduleNew] = useState(false);
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newAlarm, setNewAlarm] = useState(false);
  const [newAlarmSound, setNewAlarmSound] = useState<AlarmSoundType>('chime');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const addTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (
    ref: React.RefObject<HTMLTextAreaElement>,
    val: string,
    onChange: (v: string) => void,
    prefix: string,
    suffix: string = ''
  ) => {
    if (!ref.current) return;
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    const selectedText = val.substring(start, end) || 'text';
    const before = val.substring(0, start);
    const after = val.substring(end);
    onChange(`${before}${prefix}${selectedText}${suffix}${after}`);
    setTimeout(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const MarkdownToolbar = ({ textAreaRef, val, onChange }: { textAreaRef: React.RefObject<HTMLTextAreaElement>, val: string, onChange: (v: string) => void }) => (
    <div className="flex gap-0.5 mb-1.5 items-center bg-secondary/30 p-1 rounded-lg overflow-x-auto border border-border/20">
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '**', '**')} className="h-6 px-2 text-xs font-bold" title="Bold">B</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '*', '*')} className="h-6 px-2 text-xs italic" title="Italic">I</Button>
      <div className="w-px h-3 bg-border mx-1" />
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '# ')} className="h-6 px-2 text-[10px] font-bold" title="Heading 1">H1</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '## ')} className="h-6 px-2 text-[10px] font-semibold" title="Heading 2">H2</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '### ')} className="h-6 px-2 text-[10px] font-medium" title="Heading 3">H3</Button>
      <div className="w-px h-3 bg-border mx-1" />
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '- ')} className="h-6 px-2 text-[11px]" title="List">•</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat(textAreaRef, val, onChange, '`', '`')} className="h-6 px-2 text-[10px] font-mono bg-secondary/50" title="Code block">`code`</Button>
    </div>
  );

  useEffect(() => { if (!hasInit) setInit(true); }, [hasInit, setInit]);

  const allFolders = useMemo(() => [...new Set(notes.map(n => n.folder).filter(Boolean) as string[])], [notes]);
  const allTags = useMemo(() => [...new Set(notes.flatMap(n => n.tags || []))], [notes]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const addEditTag = () => {
    if (editTagInput.trim() && !editTags.includes(editTagInput.trim())) {
      setEditTags([...editTags, editTagInput.trim()]);
      setEditTagInput('');
    }
  };

  const addNote = () => {
    if (!title.trim()) return;
    setNotes(prev => [{
      id: crypto.randomUUID(), title: title.trim(), content,
      category: category || 'General', folder: folder || undefined,
      tags: tags.length > 0 ? tags : undefined,
      versions: [{ id: crypto.randomUUID(), content, savedAt: new Date().toISOString() }],
      scheduledDate: newScheduledDate || null, scheduledTime: newScheduledTime || null,
      reminderDate: newReminderDate || null, reminderTime: newReminderTime || null,
      alarmEnabled: newAlarm, alarmSound: newAlarmSound, alarmFired: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }, ...prev]);
    if (newReminderDate && newReminderTime) {
      toast.success(`⏰ Reminder set${newAlarm ? ' with alarm' : ''}`);
    }
    setTitle(''); setContent(''); setCategory(''); setFolder(''); setTags([]);
    setNewScheduledDate(''); setNewScheduledTime(''); setNewReminderDate(''); setNewReminderTime('');
    setNewAlarm(false); setNewAlarmSound('chime'); setShowScheduleNew(false); setShowAdd(false);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, alarmFired: updates.reminderDate !== undefined ? false : n.alarmFired } : n));
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
    setEditFolder(note.folder || '');
    setEditTags(note.tags || []);
    setEditScheduledDate(note.scheduledDate || '');
    setEditScheduledTime(note.scheduledTime || '');
    setEditReminderDate(note.reminderDate || '');
    setEditReminderTime(note.reminderTime || '');
    setEditAlarmEnabled(note.alarmEnabled || false);
    setEditAlarmSound(note.alarmSound || 'chime');
    setShowEditSchedule(!!(note.scheduledDate || note.reminderDate));
  };

  const saveEdit = (id: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const version: NoteVersion = { id: crypto.randomUUID(), content: n.content, savedAt: n.updatedAt || n.createdAt };
      return {
        ...n,
        title: editTitle.trim(),
        content: editContent,
        category: editCategory || 'General',
        folder: editFolder || undefined,
        tags: editTags.length > 0 ? editTags : undefined,
        scheduledDate: editScheduledDate || null,
        scheduledTime: editScheduledTime || null,
        reminderDate: editReminderDate || null,
        reminderTime: editReminderTime || null,
        alarmEnabled: editAlarmEnabled,
        alarmSound: editAlarmSound,
        versions: [...(n.versions || []), version],
        updatedAt: new Date().toISOString(),
      };
    }));
    setEditingId(null);
    toast.success('Note updated with version history');
  };

  const deleteNote = (id: string) => {
    const backup = notes.find(n => n.id === id);
    const index = notes.findIndex(n => n.id === id);
    if (!backup) return;

    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Note deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setNotes(prev => {
            const newNotes = [...prev];
            newNotes.splice(index, 0, backup);
            return newNotes;
          });
        }
      }
    });
  };

  const restoreVersion = (noteId: string, version: NoteVersion) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== noteId) return n;
      const v: NoteVersion = { id: crypto.randomUUID(), content: n.content, savedAt: new Date().toISOString() };
      return { ...n, content: version.content, versions: [...(n.versions || []), v], updatedAt: new Date().toISOString() };
    }));
    setShowVersions(null);
    toast.success('Version restored');
  };

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()) || (n.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchFolder = !filterFolder || n.folder === filterFolder;
    const matchTag = !filterTag || (n.tags || []).includes(filterTag);
    return matchSearch && matchFolder && matchTag;
  });

  // Simple markdown rendering — order matters: bold before italic
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<s class="text-muted-foreground">$1</s>')
      .replace(/`(.+?)`/g, '<code class="bg-secondary px-1 rounded text-xs">$1</code>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-3 list-decimal">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-3">• $1</li>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="notes" />
      <div data-tour="notes-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Notes</h1>
        <Button data-tour="add-btn" size="sm" onClick={() => setShowAdd(!showAdd)} variant="ghost"><Plus className="w-5 h-5" /></Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search notes, tags..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary border-0 pl-9" />
      </div>

      {/* Folder & Tag Filters */}
      {(allFolders.length > 0 || allTags.length > 0) && (
        <div className="space-y-2">
          {allFolders.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setFilterFolder(null)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${!filterFolder ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                All Folders
              </button>
              {allFolders.map(f => (
                <button key={f} onClick={() => setFilterFolder(filterFolder === f ? null : f)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${filterFolder === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  <FolderOpen className="w-3 h-3" /> {f}
                </button>
              ))}
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 flex-wrap">
              {allTags.map(t => (
                <button key={t} onClick={() => setFilterTag(filterTag === t ? null : t)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${filterTag === t ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Tag className="w-2.5 h-2.5" /> {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Note Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-0 font-semibold" />
            <div>
              <MarkdownToolbar textAreaRef={addTextareaRef} val={content} onChange={setContent} />
              <Textarea ref={addTextareaRef} placeholder="Content (supports markdown)" value={content} onChange={e => setContent(e.target.value)} className="bg-secondary border-0 min-h-[120px] font-mono text-xs" />
            </div>
            <Input placeholder="Category (optional)" value={category} onChange={e => setCategory(e.target.value)} className="bg-secondary border-0" />
            <Input placeholder="Folder (optional)" value={folder} onChange={e => setFolder(e.target.value)} className="bg-secondary border-0" />
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  className="bg-secondary border-0 text-xs" />
                <Button size="sm" variant="ghost" onClick={addTag}><Plus className="w-3 h-3" /></Button>
              </div>
              {tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {tags.map(t => (
                    <span key={t} className="text-[10px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      {t}
                      <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setShowScheduleNew(!showScheduleNew)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showScheduleNew ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
            {showScheduleNew && (
              <div className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-info" />
                  <span className="text-xs font-medium">Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={newScheduledDate} onChange={setNewScheduledDate} placeholder="Date" className="bg-secondary border-0 w-full h-10 text-xs" />
                  <TimePicker value={newScheduledTime} onChange={setNewScheduledTime} placeholder="Time" className="bg-secondary border-0 w-full h-10 text-xs" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">Reminder</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={addNote} className="flex-1" size="sm">Add Note</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="space-y-3">
        {filtered.length === 0 && !showAdd && (
          <EmptyState
            icon={StickyNote}
            title={search || filterFolder || filterTag ? "No results found" : "No notes yet"}
            description={search || filterFolder || filterTag ? "Try adjusting your search or filters." : "Create your first note to capture ideas."}
            actionLabel={search || filterFolder || filterTag ? "Clear Filters" : "Create Note"}
            onAction={() => {
              if (search || filterFolder || filterTag) {
                setSearch(''); setFilterFolder(null); setFilterTag(null);
              } else {
                setShowAdd(true);
              }
            }}
          />
        )}
        {filtered.map(note => (
          <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{note.title}</span>
                  {note.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-primary">{note.category}</span>
                  {note.folder && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><FolderOpen className="w-2.5 h-2.5" /> {note.folder}</span>}
                  {note.scheduledDate && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info/15 text-info flex items-center gap-0.5">
                      <CalendarDays className="w-3 h-3" /> {note.scheduledDate} {note.scheduledTime || ''}
                    </span>
                  )}
                  {note.reminderDate && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-0.5">
                      {note.alarmEnabled ? <Bell className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {note.reminderTime || ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(note.versions || []).length > 1 && (
                  <button onClick={() => setShowVersions(showVersions === note.id ? null : note.id)} className="text-muted-foreground hover:text-primary p-1">
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => deleteNote(note.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Tags */}
            {(note.tags || []).length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {(note.tags || []).map(t => (
                  <span key={t} className="text-[10px] bg-accent/15 text-accent-foreground px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Tag className="w-2 h-2" /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* Content - editable or rendered markdown */}
            {editingId === note.id ? (
              <div className="space-y-3 glass p-4 rounded-xl">
                <Input placeholder="Title" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-secondary border-0 text-sm font-semibold" />
                <div>
                  <MarkdownToolbar textAreaRef={editTextareaRef} val={editContent} onChange={setEditContent} />
                  <Textarea ref={editTextareaRef} value={editContent} onChange={e => setEditContent(e.target.value)} className="bg-secondary border-0 min-h-[120px] font-mono text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Category" value={editCategory} onChange={e => setEditCategory(e.target.value)} className="bg-secondary border-0 text-xs h-9" />
                  <Input placeholder="Folder" value={editFolder} onChange={e => setEditFolder(e.target.value)} className="bg-secondary border-0 text-xs h-9" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input placeholder="Add tag..." value={editTagInput} onChange={e => setEditTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditTag(); } }}
                      className="bg-secondary border-0 text-[10px] h-8" />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={addEditTag}><Plus className="w-3 h-3" /></Button>
                  </div>
                  {editTags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {editTags.map(t => (
                        <span key={t} className="text-[9px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                          {t}
                          <button onClick={() => setEditTags(editTags.filter(x => x !== t))}><X className="w-2 h-2" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <button onClick={() => setShowEditSchedule(!showEditSchedule)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showEditSchedule ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    <CalendarDays className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-muted-foreground">Schedule & Reminder</span>
                </div>

                {showEditSchedule && (
                  <div className="bg-secondary/30 rounded-xl p-3 space-y-2 border border-border/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-info font-medium flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Date</span>
                        <DatePicker value={editScheduledDate} onChange={setEditScheduledDate} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-info font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Time</span>
                        <TimePicker value={editScheduledTime} onChange={setEditScheduledTime} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-primary font-medium flex items-center gap-1"><Bell className="w-3 h-3" /> Reminder</span>
                        <DatePicker value={editReminderDate} onChange={setEditReminderDate} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-primary font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Time</span>
                        <TimePicker value={editReminderTime} onChange={setEditReminderTime} className="bg-secondary border-0 w-full h-8 text-[10px]" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/10 pt-2">
                      <span className="text-[10px] text-muted-foreground">Play alarm sound</span>
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
                  <Button size="sm" onClick={() => saveEdit(note.id)} className="flex-1 h-9">Update Note</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9">Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => startEdit(note)}
                className="text-xs text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(note.content)) }}
              />
            )}

            {/* Version History */}
            {showVersions === note.id && (
              <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-semibold flex items-center gap-1"><History className="w-3 h-3" /> Version History</span>
                {(note.versions || []).slice().reverse().map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{new Date(v.savedAt).toLocaleString()}</span>
                    <button onClick={() => restoreVersion(note.id, v)} className="text-primary flex items-center gap-0.5 hover:underline">
                      <Undo2 className="w-3 h-3" /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

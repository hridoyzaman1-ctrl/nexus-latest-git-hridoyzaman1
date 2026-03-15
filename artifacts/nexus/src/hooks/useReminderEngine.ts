import { useEffect, useRef, useCallback } from 'react';
import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import { Task, Todo, Note, StudySession, Goal, AlarmSoundType } from '@/types';
import { playAlarmSound, playNotificationChime } from '@/lib/alarm';
import { sendPersistentNotification, requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';
import { format } from 'date-fns';

/** Days until a scheduled/deadline date */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Handle both 'YYYY-MM-DD' and full ISO strings
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const target = new Date(dateOnly + 'T00:00:00');
  if (isNaN(target.getTime())) return 999; // Invalid date — skip
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

/** Get a unique key for a countdown reminder so we only fire once per day per item */
function countdownKey(type: string, id: string, daysLeft: number): string {
  const today = new Date().toDateString();
  return `${type}_${id}_d${daysLeft}_${today}`;
}

/** Fire a countdown reminder (3 days prior, 2 days prior, 1 day prior) */
function fireCountdownReminder(
  type: string,
  title: string,
  scheduledDate: string,
  id: string,
  firedSet: Set<string>
) {
  const days = daysUntil(scheduledDate);
  if (days > 3 || days <= 0) return; // Only 1-3 days before

  const key = countdownKey(type, id, days);
  if (firedSet.has(key)) return;
  firedSet.add(key);

  const dayLabel = days === 1 ? 'tomorrow' : `in ${days} days`;
  const emoji = days === 1 ? '🔴' : days === 2 ? '🟡' : '🟢';

  playNotificationChime();
  toast(`${emoji} ${type} Reminder: ${title}`, {
    description: `Due ${dayLabel} (${format(new Date(scheduledDate.includes('T') ? scheduledDate : scheduledDate + 'T00:00:00'), 'MMM d, yyyy')})`,
    duration: 8000,
  });
  sendPersistentNotification(
    `MindFlow — ${type} Coming Up`,
    `${title} is due ${dayLabel}`,
    `countdown_${type}_${id}_${days}`
  );
}

export function useReminderEngine() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const countdownFired = useRef<Set<string>>(new Set());

  const checkReminders = useCallback(() => {
    const now = new Date();
    const defaultAlarm = getLocalStorage<AlarmSoundType>('defaultAlarmSound', 'chime');

    // ── Tasks ──
    const tasks = getLocalStorage<Task[]>('tasks', []);
    let tasksChanged = false;
    const updatedTasks = tasks.map(task => {
      if (task.done) return task;

      // 3-day countdown for due date
      if (task.dueDate && !task.done) {
        fireCountdownReminder('Task', task.title, task.dueDate, task.id, countdownFired.current);
      }

      // Exact-time alarm
      if (task.alarmFired || !task.reminderDate || !task.reminderTime) return task;
      const reminderDateTime = new Date(`${task.reminderDate}T${task.reminderTime}`);
      if (now >= reminderDateTime) {
        tasksChanged = true;
        if (task.alarmEnabled) {
          playAlarmSound(task.alarmSound || defaultAlarm);
        } else {
          playNotificationChime();
        }
        toast(`⏰ Task Reminder: ${task.title}`, {
          description: task.notes || 'Your scheduled reminder is due!',
          duration: 10000,
          action: { label: 'Dismiss', onClick: () => {} },
        });
        sendPersistentNotification('MindFlow — Task Reminder', task.title, `task_${task.id}`);
        return { ...task, alarmFired: true };
      }
      return task;
    });
    if (tasksChanged) setLocalStorage('tasks', updatedTasks);

    // ── Todos ──
    const todos = getLocalStorage<Todo[]>('todos', []);
    let todosChanged = false;
    const updatedTodos = todos.map(todo => {
      if (todo.done) return todo;

      // 3-day countdown for scheduled date
      if (todo.scheduledDate && !todo.done) {
        fireCountdownReminder('To-Do', todo.text, todo.scheduledDate, todo.id, countdownFired.current);
      }

      // Exact-time alarm
      if (todo.alarmFired || !todo.reminderDate || !todo.reminderTime) return todo;
      const reminderDateTime = new Date(`${todo.reminderDate}T${todo.reminderTime}`);
      if (now >= reminderDateTime) {
        todosChanged = true;
        if (todo.alarmEnabled) {
          playAlarmSound(todo.alarmSound || defaultAlarm);
        } else {
          playNotificationChime();
        }
        toast(`⏰ To-Do Reminder: ${todo.text}`, {
          description: todo.notes || 'Your scheduled reminder is due!',
          duration: 10000,
          action: { label: 'Dismiss', onClick: () => {} },
        });
        sendPersistentNotification('MindFlow — To-Do Reminder', todo.text, `todo_${todo.id}`);
        return { ...todo, alarmFired: true };
      }
      return todo;
    });
    if (todosChanged) setLocalStorage('todos', updatedTodos);

    // ── Notes ──
    const notes = getLocalStorage<Note[]>('notes', []);
    let notesChanged = false;
    const updatedNotes = notes.map(note => {
      // 3-day countdown for scheduled date
      if (note.scheduledDate) {
        fireCountdownReminder('Note', note.title, note.scheduledDate, note.id, countdownFired.current);
      }

      // Exact-time alarm
      if (note.alarmFired || !note.reminderDate || !note.reminderTime) return note;
      const reminderDateTime = new Date(`${note.reminderDate}T${note.reminderTime}`);
      if (now >= reminderDateTime) {
        notesChanged = true;
        if (note.alarmEnabled) {
          playAlarmSound(note.alarmSound || defaultAlarm);
        } else {
          playNotificationChime();
        }
        toast(`📝 Note Reminder: ${note.title}`, {
          description: 'Your scheduled note reminder is due!',
          duration: 10000,
          action: { label: 'Dismiss', onClick: () => {} },
        });
        sendPersistentNotification('MindFlow — Note Reminder', note.title, `note_${note.id}`);
        return { ...note, alarmFired: true };
      }
      return note;
    });
    if (notesChanged) setLocalStorage('notes', updatedNotes);

    // ── Study Sessions ──
    const sessions = getLocalStorage<StudySession[]>('studySessions', []);
    let sessionsChanged = false;
    const updatedSessions = sessions.map(session => {
      if (session.completed) return session;

      // 3-day countdown
      if (session.scheduledDate) {
        fireCountdownReminder('Study', session.subject + (session.topic ? ` — ${session.topic}` : ''), session.scheduledDate, session.id, countdownFired.current);
      }

      // Exact-time alarm
      if (session.alarmFired || !session.reminderDate || !session.reminderTime) return session;
      const reminderDateTime = new Date(`${session.reminderDate}T${session.reminderTime}`);
      if (now >= reminderDateTime) {
        sessionsChanged = true;
        if (session.alarmEnabled) {
          playAlarmSound(session.alarmSound || defaultAlarm);
        } else {
          playNotificationChime();
        }
        toast(`📚 Study Reminder: ${session.subject}`, {
          description: session.topic || 'Your study session is due!',
          duration: 10000,
          action: { label: 'Dismiss', onClick: () => {} },
        });
        sendPersistentNotification('MindFlow — Study Reminder', session.subject, `study_${session.id}`);
        return { ...session, alarmFired: true };
      }
      return session;
    });
    if (sessionsChanged) setLocalStorage('studySessions', updatedSessions);

    // ── Goals (deadline) ──
    const goals = getLocalStorage<Goal[]>('goals', []);
    let goalsChanged = false;
    const updatedGoals = goals.map(goal => {
      if (goal.completed) return goal;

      // 3-day countdown for deadline
      if (goal.deadlineDate) {
        fireCountdownReminder('Goal', goal.title, goal.deadlineDate, goal.id, countdownFired.current);
      }

      // Exact-time alarm
      if (goal.alarmFired || !goal.reminderDate || !goal.reminderTime) return goal;
      const reminderDateTime = new Date(`${goal.reminderDate}T${goal.reminderTime}`);
      if (now >= reminderDateTime) {
        goalsChanged = true;
        if (goal.alarmEnabled) {
          playAlarmSound(goal.alarmSound || defaultAlarm);
        } else {
          playNotificationChime();
        }
        toast(`🎯 Goal Reminder: ${goal.title}`, {
          description: goal.description || 'Your goal deadline is here!',
          duration: 10000,
          action: { label: 'Dismiss', onClick: () => {} },
        });
        sendPersistentNotification('MindFlow — Goal Reminder', goal.title, `goal_${goal.id}`);
        return { ...goal, alarmFired: true };
      }
      return goal;
    });
    if (goalsChanged) setLocalStorage('goals', updatedGoals);
  }, []);

  useEffect(() => {
    requestNotificationPermission();
    checkReminders();
    intervalRef.current = setInterval(checkReminders, 15000);
    return () => clearInterval(intervalRef.current);
  }, [checkReminders]);
}

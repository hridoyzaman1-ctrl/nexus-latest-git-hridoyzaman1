export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
  read: boolean;
}

function getHistory(): NotificationHistoryItem[] {
  try {
    const raw = localStorage.getItem('mindflow_notificationHistory');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items: NotificationHistoryItem[]) {
  // Keep last 100 notifications
  localStorage.setItem('mindflow_notificationHistory', JSON.stringify(items.slice(0, 100)));
}

function logNotification(title: string, body: string, tag: string) {
  const history = getHistory();
  history.unshift({
    id: crypto.randomUUID(),
    title,
    body,
    tag,
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveHistory(history);
}

export function getNotificationHistory(): NotificationHistoryItem[] {
  return getHistory();
}

export function markNotificationRead(id: string) {
  const history = getHistory();
  const item = history.find(n => n.id === id);
  if (item) { item.read = true; saveHistory(history); }
}

export function markAllNotificationsRead() {
  const history = getHistory();
  history.forEach(n => n.read = true);
  saveHistory(history);
}

export function clearNotificationHistory() {
  localStorage.removeItem('mindflow_notificationHistory');
}

export function getUnreadCount(): number {
  return getHistory().filter(n => !n.read).length;
}

/**
 * Send a notification via the service worker (persists in background)
 * Falls back to the basic Notification API if SW is unavailable.
 */
export async function sendPersistentNotification(title: string, body: string, tag?: string): Promise<void> {
  const resolvedTag = tag || title;
  logNotification(title, body, resolvedTag);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: tag || title,
        vibrate: [200, 100, 200],
        data: { url: '/' },
      } as NotificationOptions);
      return;
    }
  } catch {
    // SW not available, fall through to basic API
  }

  // Fallback
  new Notification(title, { body, icon: '/pwa-192.png' });
}

/**
 * Request notification permission with a nice UX flow
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, CheckCheck, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getNotificationHistory,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotificationHistory,
  NotificationHistoryItem,
} from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function NotificationHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationHistoryItem[]>(getNotificationHistory);

  const refresh = useCallback(() => setItems(getNotificationHistory()), []);

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    refresh();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    refresh();
    toast.success('All notifications marked as read');
  };

  const handleClear = () => {
    if (!confirm('Clear all notification history?')) return;
    clearNotificationHistory();
    refresh();
    toast.success('History cleared');
  };

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pt-12 pb-24 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display">Notifications</h1>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
      </div>

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={handleMarkAllRead} className="text-xs gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleClear} className="text-xs gap-1.5 text-destructive">
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </Button>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <BellOff className="w-12 h-12 opacity-30" />
          <p className="text-sm">No notifications yet</p>
          <p className="text-xs text-center max-w-[250px]">
            Enable reminders in Settings to start receiving notifications.
          </p>
          <Button size="sm" variant="secondary" onClick={() => navigate('/settings')} className="mt-2 text-xs">
            Go to Settings
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-2 pr-2">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !item.read && handleMarkRead(item.id)}
                className={`glass rounded-xl p-3 cursor-pointer transition-all ${
                  !item.read
                    ? 'border-l-2 border-l-primary bg-primary/5'
                    : 'opacity-70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    !item.read ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {!item.read ? <Bell className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!item.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">
                      {item.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </motion.div>
  );
}

import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Grid3X3, BookOpen, Heart, BarChart3, Settings } from 'lucide-react';
import { getUnreadCount } from '@/lib/notifications';
import InstallBanner from '@/components/InstallBanner';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/modules', icon: Grid3X3, label: 'Modules' },
  { path: '/study', icon: BookOpen, label: 'Study' },
  { path: '/wellness', icon: Heart, label: 'Wellness' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(getUnreadCount());

  useEffect(() => {
    setUnread(getUnreadCount());
    // Poll every 3 seconds for real-time feel
    const interval = setInterval(() => setUnread(getUnreadCount()), 3000);
    // Also listen for storage changes (from other tabs or reminder engine writes)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mindflow_notificationHistory') setUnread(getUnreadCount());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [location.pathname]);

  // Hide bottom nav on chat page (full screen)
  const hideNav = location.pathname === '/chat';

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] relative">
        <InstallBanner />
        <main className={hideNav ? 'min-h-screen' : 'pb-24 min-h-screen'}>
          {children}
        </main>

        {!hideNav && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
            <div className="glass-strong mx-1 mb-2 rounded-2xl px-0.5 py-1.5 flex justify-between items-center">
              {tabs.map(({ path, icon: Icon, label }) => {
                const active = location.pathname === path ||
                  (path !== '/' && location.pathname.startsWith(path));
                const showBadge = path === '/' && unread > 0;
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`relative flex-1 min-w-0 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl transition-all duration-200 ${active
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

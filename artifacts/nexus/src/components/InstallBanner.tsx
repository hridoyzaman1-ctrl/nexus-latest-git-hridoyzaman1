import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('install_banner_dismissed');
    if (isStandalone || dismissed) return;

    const timer = setTimeout(() => setVisible(true), 3000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setVisible(false));

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('install_banner_dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setVisible(false);
      setDeferredPrompt(null);
    } else {
      navigate('/install');
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full overflow-hidden"
        >
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-foreground flex-1 min-w-0">
              <span className="font-semibold">Install MindFlow</span>
              <span className="text-muted-foreground"> — works offline!</span>
            </p>
            <button
              onClick={handleInstall}
              className="shrink-0 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium active:scale-95 transition-transform"
            >
              Install
            </button>
            <button onClick={dismiss} className="shrink-0 p-0.5 text-muted-foreground/60 hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

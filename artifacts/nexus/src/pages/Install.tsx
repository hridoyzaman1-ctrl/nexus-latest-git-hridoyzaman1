import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, Smartphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-12 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
      </div>
      <div className="text-center space-y-3">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
        <Smartphone className="w-10 h-10 text-primary-foreground" />
      </div>

      <h1 className="text-2xl font-bold font-display">Install MindFlow</h1>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto">
        Add MindFlow to your home screen for a native app experience — works offline, launches instantly.
      </p>
      </div>

      {isStandalone || installed ? (
        <div className="glass rounded-2xl p-6 space-y-3">
          <CheckCircle className="w-12 h-12 text-success mx-auto" />
          <p className="text-sm font-medium">MindFlow is already installed!</p>
          <Button variant="secondary" onClick={() => navigate('/')}>Go to Dashboard</Button>
        </div>
      ) : deferredPrompt ? (
        <Button size="lg" onClick={handleInstall} className="gap-2 text-base">
          <Download className="w-5 h-5" /> Install App
        </Button>
      ) : (
        <div className="glass rounded-2xl p-5 space-y-3 text-left">
          {isIOS ? (
            <>
              <h3 className="text-sm font-semibold">How to install on iPhone/iPad:</h3>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> button (square with arrow) in Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right</li>
              </ol>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold">How to install on Android:</h3>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Tap the <strong>three-dot menu</strong> (⋮) in Chrome</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                <li>Confirm by tapping <strong>"Install"</strong></li>
              </ol>
            </>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Works on Chrome, Edge, Safari (iOS), and Samsung Internet</p>
    </motion.div>
  );
}

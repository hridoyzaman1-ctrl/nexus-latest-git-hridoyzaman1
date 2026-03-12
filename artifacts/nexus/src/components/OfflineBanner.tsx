import { useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const wasOffline = useRef(false);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      wasOffline.current = true;
    };
    const goOnline = () => {
      setOffline(false);
      if (wasOffline.current) {
        toast.success('You\'re back online! ✅');
        wasOffline.current = false;
      }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 shadow-md"
        >
          <WifiOff className="w-3.5 h-3.5" /> You're offline — changes are saved locally
        </motion.div>
      )}
    </AnimatePresence>
  );
}

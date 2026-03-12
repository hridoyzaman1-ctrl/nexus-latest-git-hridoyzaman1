import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if ('periodicSync' in reg) {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
        if (status.state === 'granted') {
          await (reg as any).periodicSync.register('mindflow-inactivity-check', {
            minInterval: 24 * 60 * 60 * 1000,
          });
        }
      }
    } catch {
      // SW registration failed silently
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

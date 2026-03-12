import { useEffect, useCallback } from 'react';
import { setLocalStorage, getLocalStorage } from './useLocalStorage';
import { EmergencyContact, SafetySettings, defaultSafetySettings } from '@/types';

const LAST_ACTIVE_KEY = 'lastActiveTimestamp';

export async function syncSafetyDataToSW() {
  try {
    if (!('caches' in window)) return;
    const safety = getLocalStorage<SafetySettings>('safetySettings', defaultSafetySettings);
    const contacts = getLocalStorage<EmergencyContact[]>('emergencyContacts', []);
    const lastActive = getLocalStorage<number>(LAST_ACTIVE_KEY, Date.now());
    const cache = await caches.open('mindflow-safety-data');
    await cache.put('safety-config', new Response(JSON.stringify({
      lastActive,
      inactivityDays: safety.inactivityDays,
      enabled: safety.enabled,
      contacts,
      alertMessage: safety.alertMessage,
    })));
  } catch {}
}

export function recordActivity() {
  setLocalStorage(LAST_ACTIVE_KEY, Date.now());
  syncSafetyDataToSW();
}

export function getLastActivity(): number {
  return getLocalStorage<number>(LAST_ACTIVE_KEY, Date.now());
}

export function getInactiveDays(): number {
  const last = getLastActivity();
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}

/**
 * Tracks user activity by recording timestamps on interaction events.
 * Also checks for inactivity threshold and triggers alerts if needed.
 */
export function useActivityTracker() {
  const record = useCallback(() => {
    recordActivity();
  }, []);

  useEffect(() => {
    syncSafetyDataToSW();
  }, []);

  useEffect(() => {
    record();

    const events = ['click', 'keydown', 'touchstart', 'scroll'];
    // Throttle to once per minute
    let lastRecord = Date.now();
    const throttled = () => {
      if (Date.now() - lastRecord > 60000) {
        lastRecord = Date.now();
        record();
      }
    };

    events.forEach(e => window.addEventListener(e, throttled, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, throttled));
  }, [record]);

  // Check inactivity on mount
  useEffect(() => {
    const safety = getLocalStorage<SafetySettings>('safetySettings', defaultSafetySettings);
    if (!safety.enabled) return;

    const contacts = getLocalStorage<EmergencyContact[]>('emergencyContacts', []);
    if (contacts.length === 0) return;

    const inactiveDays = getInactiveDays();
    if (inactiveDays >= safety.inactivityDays) {
      // Show alert after a short delay to let the app render
      setTimeout(() => {
        const shouldAlert = confirm(
          `⚠️ Safety Alert\n\nYou haven't used MindFlow for ${inactiveDays} day${inactiveDays !== 1 ? 's' : ''}.\n\nWould you like to send a check-in message to your ${contacts.length} emergency contact${contacts.length !== 1 ? 's' : ''}?`
        );

        if (shouldAlert) {
          const msg = encodeURIComponent(safety.alertMessage);
          contacts.forEach(contact => {
            const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
            if (contact.preferWhatsApp) {
              window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
            } else {
              window.open(`sms:${cleanPhone}?body=${msg}`, '_blank');
            }
          });
        }
      }, 2000);
    }
  }, []);
}

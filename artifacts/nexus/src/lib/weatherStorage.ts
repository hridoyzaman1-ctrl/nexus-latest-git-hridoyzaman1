import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import type { WeatherData, HistoricalData, WeatherLocation, TempUnit, WeatherPopupState } from '@/types/weather';

const KEYS = {
  location: 'weatherLocation',
  recentLocations: 'weatherRecentLocations',
  unit: 'weatherUnit',
  currentData: 'weatherCurrentData',
  historicalData: 'weatherHistoricalData',
  popupState: 'weatherPopupState',
  lastUpdated: 'weatherLastUpdated',
};

export function getSavedLocation(): WeatherLocation | null {
  return getLocalStorage<WeatherLocation | null>(KEYS.location, null);
}

export function saveLocation(loc: WeatherLocation) {
  setLocalStorage(KEYS.location, loc);
  const recent = getRecentLocations();
  const filtered = recent.filter(r => !(Math.abs(r.latitude - loc.latitude) < 0.01 && Math.abs(r.longitude - loc.longitude) < 0.01));
  filtered.unshift(loc);
  setLocalStorage(KEYS.recentLocations, filtered.slice(0, 5));
}

export function getRecentLocations(): WeatherLocation[] {
  return getLocalStorage<WeatherLocation[]>(KEYS.recentLocations, []);
}

export function getTempUnit(): TempUnit {
  return getLocalStorage<TempUnit>(KEYS.unit, 'celsius');
}

export function saveTempUnit(unit: TempUnit) {
  setLocalStorage(KEYS.unit, unit);
}

export function getCachedWeather(): WeatherData | null {
  return getLocalStorage<WeatherData | null>(KEYS.currentData, null);
}

export function cacheWeather(data: WeatherData) {
  setLocalStorage(KEYS.currentData, data);
  setLocalStorage(KEYS.lastUpdated, Date.now());
}

export function getCachedHistorical(): HistoricalData | null {
  return getLocalStorage<HistoricalData | null>(KEYS.historicalData, null);
}

export function cacheHistorical(data: HistoricalData) {
  setLocalStorage(KEYS.historicalData, data);
}

export function getPopupState(): WeatherPopupState {
  return getLocalStorage<WeatherPopupState>(KEYS.popupState, { dismissedAt: null, lastShownCode: null });
}

export function savePopupState(state: WeatherPopupState) {
  setLocalStorage(KEYS.popupState, state);
}

export function getLastUpdated(): number {
  return getLocalStorage<number>(KEYS.lastUpdated, 0);
}

export function isCacheStale(maxAgeMs = 30 * 60 * 1000): boolean {
  const last = getLastUpdated();
  return !last || Date.now() - last > maxAgeMs;
}

import { useState, useEffect, useCallback } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Search, Navigation, RefreshCw, Thermometer, Droplets, Wind, Eye, Gauge, Sunrise, Sunset, CloudRain, X, AlertTriangle, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { getWeatherIcon, getWeatherLabel, getWeatherEmoji } from '@/lib/weatherIcons';
import { fetchWeatherData, fetchHistoricalWeather, searchLocations, getCurrentPosition, reverseGeocode } from '@/lib/weatherService';
import { getSavedLocation, saveLocation, getRecentLocations, getTempUnit, saveTempUnit, getCachedWeather, cacheWeather, getCachedHistorical, cacheHistorical, getPopupState, savePopupState, isCacheStale } from '@/lib/weatherStorage';
import { getWeatherAdvice, shouldShowPopup } from '@/lib/weatherRules';
import type { WeatherData, HistoricalData, WeatherLocation, TempUnit, GeocodingResult, WeatherAdvice } from '@/types/weather';

export default function Weather() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData | null>(getCachedWeather);
  const [historical, setHistorical] = useState<HistoricalData | null>(getCachedHistorical);
  const [unit, setUnit] = useState<TempUnit>(getTempUnit);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [histDate, setHistDate] = useState('');
  const [popup, setPopup] = useState<WeatherAdvice | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [isStale, setIsStale] = useState(() => {
    const cached = getCachedWeather();
    return cached ? isCacheStale() : false;
  });

  const unitLabel = unit === 'celsius' ? '°C' : '°F';
  const windLabel = unit === 'celsius' ? 'km/h' : 'mph';

  const loadWeather = useCallback(async (loc: WeatherLocation, u: TempUnit) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWeatherData(loc.latitude, loc.longitude, u, loc);
      setWeather(data);
      cacheWeather(data);
      setIsStale(false);

      const advice = getWeatherAdvice({ current: data.current, hourly: data.hourly, unit: u });
      const popState = getPopupState();
      if (shouldShowPopup(popState.dismissedAt, popState.lastShownCode, data.current.weatherCode)) {
        setPopup(advice);
        setPopupVisible(true);
      }
    } catch {
      const cached = getCachedWeather();
      if (cached) {
        setWeather(cached);
        setIsStale(true);
      } else {
        setError('Could not load weather data. Please try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistorical = useCallback(async (loc: WeatherLocation, start: string, end: string, u: TempUnit) => {
    setHistLoading(true);
    try {
      const data = await fetchHistoricalWeather(loc.latitude, loc.longitude, start, end, u, loc);
      setHistorical(data);
      cacheHistorical(data);
    } catch {
      const cached = getCachedHistorical();
      if (cached) setHistorical(cached);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const saved = getSavedLocation();
      if (saved) {
        loadWeather(saved, unit);
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        loadHistorical(saved, weekAgo, yesterday, unit);
        return;
      }
      try {
        const pos = await getCurrentPosition();
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        saveLocation(loc);
        loadWeather(loc, unit);
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        loadHistorical(loc, weekAgo, yesterday, unit);
      } catch {
        const cached = getCachedWeather();
        if (cached) {
          setWeather(cached);
          setIsStale(true);
        } else {
          setShowSearch(true);
        }
      }
    };
    init();
  }, []);

  const handleUseLocation = async () => {
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      saveLocation(loc);
      setShowSearch(false);
      loadWeather(loc, unit);
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      loadHistorical(loc, weekAgo, yesterday, unit);
    } catch {
      setError('Location access denied. Please search manually.');
      setShowSearch(true);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectLocation = (result: GeocodingResult) => {
    const loc: WeatherLocation = {
      name: result.name,
      country: result.country,
      admin1: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
    };
    saveLocation(loc);
    setSearchResults([]);
    setSearchQuery('');
    setShowSearch(false);
    loadWeather(loc, unit);
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    loadHistorical(loc, weekAgo, yesterday, unit);
  };

  const handleUnitToggle = async (newUnit: TempUnit) => {
    const prevUnit = unit;
    setUnit(newUnit);
    saveTempUnit(newUnit);
    if (weather?.location) {
      try {
        const data = await fetchWeatherData(weather.location.latitude, weather.location.longitude, newUnit, weather.location);
        setWeather(data);
        cacheWeather(data);
        setIsStale(false);
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        loadHistorical(weather.location, weekAgo, yesterday, newUnit);
      } catch {
        setUnit(prevUnit);
        saveTempUnit(prevUnit);
        setIsStale(true);
      }
    }
  };

  const handleRefresh = () => {
    if (weather?.location) loadWeather(weather.location, unit);
  };

  const dismissPopup = () => {
    setPopupVisible(false);
    savePopupState({ dismissedAt: Date.now(), lastShownCode: weather?.current.weatherCode ?? null });
  };

  const handleHistDateLookup = () => {
    if (!histDate || !weather?.location) return;
    loadHistorical(weather.location, histDate, histDate, unit);
  };

  const c = weather?.current;
  const WIcon = c ? getWeatherIcon(c.weatherCode, c.isDay) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="weather" />
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center" data-testid="button-back-weather">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold font-display" data-testid="text-weather-title" data-tour="weather-header">Weather</h1>
        <div className="flex items-center gap-1">
          <button onClick={handleRefresh} disabled={loading} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center" data-testid="button-refresh-weather">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center" data-testid="button-toggle-search" data-tour="weather-search">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {popupVisible && popup && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`rounded-2xl p-3 relative ${popup.tone === 'serious' ? 'bg-destructive/15 border border-destructive/30' : 'glass border border-primary/20'}`}
            data-testid="weather-popup"
          >
            <button onClick={dismissPopup} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-secondary/60 flex items-center justify-center" data-testid="button-dismiss-popup">
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-start gap-2.5 pr-6">
              {popup.tone === 'serious' ? (
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              ) : (
                <span className="text-xl flex-shrink-0">{popup.icon}</span>
              )}
              <div className="space-y-1 min-w-0">
                <p className={`text-xs font-bold ${popup.tone === 'serious' ? 'text-destructive' : ''}`}>{popup.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{popup.message}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{popup.attire}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{popup.activity}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search city or place..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-secondary/40 rounded-xl border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid="input-location-search"
                  />
                </div>
                <button onClick={handleSearch} disabled={searching} className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl" data-testid="button-search-location">
                  {searching ? '...' : 'Search'}
                </button>
              </div>
              <button onClick={handleUseLocation} className="flex items-center gap-1.5 text-[11px] text-primary font-medium" data-testid="button-use-gps">
                <Navigation className="w-3 h-3" /> Use my current location
              </button>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map(r => (
                    <button key={r.id} onClick={() => handleSelectLocation(r)}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-secondary/40 transition-colors flex items-center gap-2"
                      data-testid={`button-location-result-${r.id}`}>
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span>{r.name}{r.admin1 ? `, ${r.admin1}` : ''}, {r.country}</span>
                    </button>
                  ))}
                </div>
              )}
              {getRecentLocations().length > 0 && searchResults.length === 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Recent</p>
                  {getRecentLocations().map((loc, i) => (
                    <button key={i} onClick={() => handleSelectLocation({ id: i, name: loc.name, latitude: loc.latitude, longitude: loc.longitude, country: loc.country, admin1: loc.admin1, countryCode: '' })}
                      className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-secondary/40 transition-colors flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span>{loc.name}, {loc.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {loading && !weather && (
        <div className="glass rounded-2xl p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {c && weather && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium" data-testid="text-weather-location">{weather.location.name}{weather.location.admin1 ? `, ${weather.location.admin1}` : ''}{weather.location.country ? `, ${weather.location.country}` : ''}</span>
              </div>
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5" data-tour="weather-units">
                <button onClick={() => handleUnitToggle('celsius')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${unit === 'celsius' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  data-testid="button-unit-celsius">°C</button>
                <button onClick={() => handleUnitToggle('fahrenheit')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${unit === 'fahrenheit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  data-testid="button-unit-fahrenheit">°F</button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span data-testid="text-current-time">{format(new Date(), 'EEEE, MMM d · h:mm a')}</span>
              </div>
              <span data-testid="text-coordinates">{weather.location.latitude.toFixed(2)}°, {weather.location.longitude.toFixed(2)}°</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-4" data-testid="card-current-weather" data-tour="weather-current">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-display" data-testid="text-current-temp">{Math.round(c.temperature)}</span>
                  <span className="text-lg text-muted-foreground">{unitLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Feels like {Math.round(c.feelsLike)}{unitLabel}</p>
              </div>
              <div className="text-center">
                {WIcon && <WIcon className="w-12 h-12 text-primary mx-auto" />}
                <p className="text-[11px] font-medium mt-1">{getWeatherLabel(c.weatherCode)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DetailItem icon={Droplets} label="Humidity" value={`${c.humidity}%`} />
              <DetailItem icon={Wind} label="Wind" value={`${Math.round(c.windSpeed)} ${windLabel}`} />
              <DetailItem icon={CloudRain} label="Precip" value={`${c.precipitation} mm`} />
              <DetailItem icon={Eye} label="Cloud" value={`${c.cloudCover}%`} />
              <DetailItem icon={Gauge} label="Pressure" value={`${Math.round(c.pressure)} hPa`} />
              <DetailItem icon={Thermometer} label="UV Index" value={String(Math.round(c.uvIndex))} />
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Sunrise className="w-3 h-3 text-amber-400" />
                <span>{c.sunrise ? format(parseISO(c.sunrise), 'h:mm a') : '--'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Sunset className="w-3 h-3 text-orange-400" />
                <span>{c.sunset ? format(parseISO(c.sunset), 'h:mm a') : '--'}</span>
              </div>
            </div>
            {isStale && weather.fetchedAt && (
              <p className="text-[9px] text-muted-foreground/60 mt-2 text-center" data-testid="text-stale-indicator">
                Last updated {format(new Date(weather.fetchedAt), 'MMM d, h:mm a')}
              </p>
            )}
          </div>

          <div className="glass rounded-2xl p-3" data-testid="section-hourly-forecast" data-tour="weather-forecast">
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3 text-primary" /> Hourly Forecast</p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {weather.hourly.slice(0, 24).map((h, i) => {
                const HIcon = getWeatherIcon(h.weatherCode, h.isDay);
                return (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1 w-12 py-1.5 rounded-xl bg-secondary/20">
                    <span className="text-[9px] text-muted-foreground">{format(parseISO(h.time), 'ha')}</span>
                    <HIcon className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-bold">{Math.round(h.temperature)}°</span>
                    {h.precipitation > 0 && <span className="text-[8px] text-blue-400">{h.precipitation}%</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-3" data-testid="section-daily-forecast">
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> 7-Day Forecast</p>
            <div className="space-y-1">
              {weather.daily.map((d, i) => {
                const DIcon = getWeatherIcon(d.weatherCode, true);
                const dayLabel = i === 0 ? 'Today' : format(parseISO(d.date), 'EEE');
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/20 transition-colors" data-testid={`daily-forecast-${i}`}>
                    <span className="text-[11px] w-10 font-medium">{dayLabel}</span>
                    <DIcon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground flex-1 truncate">{getWeatherLabel(d.weatherCode)}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-bold">{Math.round(d.tempMax)}°</span>
                      <span className="text-muted-foreground">{Math.round(d.tempMin)}°</span>
                    </div>
                    {d.precipitationSum > 0 && (
                      <span className="text-[9px] text-blue-400 w-8 text-right">{d.precipitationSum.toFixed(1)}mm</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-3" data-testid="section-history">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full text-left">
              <p className="text-xs font-bold flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> Previous Weather</p>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <input type="date" value={histDate} onChange={e => setHistDate(e.target.value)}
                        max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
                        className="flex-1 px-3 py-1.5 text-xs bg-secondary/40 rounded-lg border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        data-testid="input-history-date" />
                      <button onClick={handleHistDateLookup} disabled={histLoading || !histDate}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                        data-testid="button-lookup-history">
                        {histLoading ? '...' : 'Lookup'}
                      </button>
                    </div>
                    {historical && historical.days.length > 0 && (
                      <div className="space-y-1">
                        {historical.days.map((d, i) => {
                          const HIcon = getWeatherIcon(d.weatherCode, true);
                          return (
                            <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-secondary/10" data-testid={`history-day-${i}`}>
                              <span className="text-[11px] w-16 font-medium">{format(parseISO(d.date), 'MMM d')}</span>
                              <HIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="text-[10px] text-muted-foreground flex-1 truncate">{getWeatherLabel(d.weatherCode)}</span>
                              <span className="text-[11px] font-bold">{Math.round(d.tempMax)}°</span>
                              <span className="text-[11px] text-muted-foreground">{Math.round(d.tempMin)}°</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {histLoading && (
                      <div className="flex justify-center py-3">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-secondary/15">
      <Icon className="w-3 h-3 text-primary flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-[11px] font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

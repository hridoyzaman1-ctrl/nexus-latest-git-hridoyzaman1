import type { WeatherData, HistoricalData, HistoricalDay, HourlyForecast, DailyForecast, CurrentWeather, WeatherLocation, TempUnit, GeocodingResult } from '@/types/weather';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

function tempUnitParam(unit: TempUnit): string {
  return unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
}

function windUnit(unit: TempUnit): string {
  return unit === 'fahrenheit' ? 'mph' : 'kmh';
}

export async function fetchWeatherData(lat: number, lon: number, unit: TempUnit, location: WeatherLocation): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,visibility',
    hourly: 'temperature_2m,weather_code,is_day,precipitation_probability,wind_speed_10m,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max',
    temperature_unit: tempUnitParam(unit),
    wind_speed_unit: windUnit(unit),
    forecast_days: '7',
    timezone: 'auto',
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();

  const c = data.current;
  const current: CurrentWeather = {
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    precipitation: c.precipitation,
    cloudCover: c.cloud_cover,
    pressure: c.pressure_msl,
    visibility: c.visibility ?? 10000,
    uvIndex: c.uv_index ?? 0,
    sunrise: data.daily?.sunrise?.[0] || '',
    sunset: data.daily?.sunset?.[0] || '',
  };

  const now = new Date();
  const currentHourIdx = data.hourly.time.findIndex((t: string) => new Date(t) >= now);
  const startIdx = Math.max(0, currentHourIdx);
  const hourlySlice = data.hourly.time.slice(startIdx, startIdx + 24);

  const hourly: HourlyForecast[] = hourlySlice.map((_: string, i: number) => {
    const idx = startIdx + i;
    return {
      time: data.hourly.time[idx],
      temperature: data.hourly.temperature_2m[idx],
      weatherCode: data.hourly.weather_code[idx],
      isDay: data.hourly.is_day[idx] === 1,
      precipitation: data.hourly.precipitation_probability?.[idx] ?? 0,
      windSpeed: data.hourly.wind_speed_10m[idx],
      humidity: data.hourly.relative_humidity_2m[idx],
    };
  });

  const daily: DailyForecast[] = data.daily.time.map((date: string, i: number) => ({
    date,
    weatherCode: data.daily.weather_code[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipitationSum: data.daily.precipitation_sum[i],
    windSpeedMax: data.daily.wind_speed_10m_max[i],
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
    uvIndexMax: data.daily.uv_index_max[i],
  }));

  return { current, hourly, daily, location, unit, fetchedAt: Date.now() };
}

export async function fetchHistoricalWeather(lat: number, lon: number, startDate: string, endDate: string, unit: TempUnit, location: WeatherLocation): Promise<HistoricalData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max',
    temperature_unit: tempUnitParam(unit),
    wind_speed_unit: windUnit(unit),
    timezone: 'auto',
  });

  const res = await fetch(`${ARCHIVE_URL}?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Historical API error: ${res.status}`);
  const data = await res.json();

  const days: HistoricalDay[] = (data.daily?.time || []).map((date: string, i: number) => ({
    date,
    weatherCode: data.daily.weather_code[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    tempMean: data.daily.temperature_2m_mean[i],
    precipitationSum: data.daily.precipitation_sum[i],
    windSpeedMax: data.daily.wind_speed_10m_max[i],
  }));

  return { days, location, unit, fetchedAt: Date.now() };
}

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({ name: query.trim(), count: '8', language: 'en', format: 'json' });
  const res = await fetch(`${GEOCODING_URL}?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country || '',
    admin1: r.admin1 || '',
    countryCode: r.country_code || '',
  }));
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<WeatherLocation> {
  try {
    const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon), count: '1', language: 'en', format: 'json' });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${params}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.results?.length) {
        const r = data.results[0];
        return { name: r.name, country: r.country || '', admin1: r.admin1, latitude: lat, longitude: lon };
      }
    }
  } catch {}
  return { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, country: '', latitude: lat, longitude: lon };
}

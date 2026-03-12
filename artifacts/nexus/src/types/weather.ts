export interface WeatherLocation {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export type TempUnit = 'celsius' | 'fahrenheit';

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  isDay: boolean;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

export interface HistoricalDay {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  tempMean: number;
  precipitationSum: number;
  windSpeedMax: number;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  location: WeatherLocation;
  unit: TempUnit;
  fetchedAt: number;
}

export interface HistoricalData {
  days: HistoricalDay[];
  location: WeatherLocation;
  unit: TempUnit;
  fetchedAt: number;
}

export interface WeatherPopupState {
  dismissedAt: number | null;
  lastShownCode: number | null;
}

export type PopupTone = 'fun' | 'serious';

export interface WeatherAdvice {
  tone: PopupTone;
  title: string;
  message: string;
  attire: string;
  activity: string;
  severity: 'none' | 'low' | 'medium' | 'high' | 'extreme';
  icon: string;
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  countryCode: string;
}

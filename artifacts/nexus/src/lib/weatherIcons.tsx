import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, CloudHail, Wind, Snowflake, Droplets, Eye } from 'lucide-react';

interface IconResult {
  Icon: typeof Sun;
  label: string;
  emoji: string;
}

const codeMap: Record<number, { day: IconResult; night: IconResult }> = {
  0: {
    day: { Icon: Sun, label: 'Clear sky', emoji: '☀️' },
    night: { Icon: Moon, label: 'Clear sky', emoji: '🌙' },
  },
  1: {
    day: { Icon: Sun, label: 'Mainly clear', emoji: '🌤️' },
    night: { Icon: Moon, label: 'Mainly clear', emoji: '🌙' },
  },
  2: {
    day: { Icon: CloudSun, label: 'Partly cloudy', emoji: '⛅' },
    night: { Icon: CloudMoon, label: 'Partly cloudy', emoji: '☁️' },
  },
  3: {
    day: { Icon: Cloud, label: 'Overcast', emoji: '☁️' },
    night: { Icon: Cloud, label: 'Overcast', emoji: '☁️' },
  },
  45: {
    day: { Icon: CloudFog, label: 'Fog', emoji: '🌫️' },
    night: { Icon: CloudFog, label: 'Fog', emoji: '🌫️' },
  },
  48: {
    day: { Icon: CloudFog, label: 'Depositing rime fog', emoji: '🌫️' },
    night: { Icon: CloudFog, label: 'Depositing rime fog', emoji: '🌫️' },
  },
  51: {
    day: { Icon: CloudDrizzle, label: 'Light drizzle', emoji: '🌦️' },
    night: { Icon: CloudDrizzle, label: 'Light drizzle', emoji: '🌧️' },
  },
  53: {
    day: { Icon: CloudDrizzle, label: 'Moderate drizzle', emoji: '🌦️' },
    night: { Icon: CloudDrizzle, label: 'Moderate drizzle', emoji: '🌧️' },
  },
  55: {
    day: { Icon: CloudDrizzle, label: 'Dense drizzle', emoji: '🌧️' },
    night: { Icon: CloudDrizzle, label: 'Dense drizzle', emoji: '🌧️' },
  },
  56: {
    day: { Icon: CloudDrizzle, label: 'Freezing drizzle', emoji: '🌧️' },
    night: { Icon: CloudDrizzle, label: 'Freezing drizzle', emoji: '🌧️' },
  },
  57: {
    day: { Icon: CloudDrizzle, label: 'Heavy freezing drizzle', emoji: '🌧️' },
    night: { Icon: CloudDrizzle, label: 'Heavy freezing drizzle', emoji: '🌧️' },
  },
  61: {
    day: { Icon: CloudRain, label: 'Slight rain', emoji: '🌦️' },
    night: { Icon: CloudRain, label: 'Slight rain', emoji: '🌧️' },
  },
  63: {
    day: { Icon: CloudRain, label: 'Moderate rain', emoji: '🌧️' },
    night: { Icon: CloudRain, label: 'Moderate rain', emoji: '🌧️' },
  },
  65: {
    day: { Icon: CloudRain, label: 'Heavy rain', emoji: '🌧️' },
    night: { Icon: CloudRain, label: 'Heavy rain', emoji: '🌧️' },
  },
  66: {
    day: { Icon: CloudHail, label: 'Freezing rain', emoji: '🌨️' },
    night: { Icon: CloudHail, label: 'Freezing rain', emoji: '🌨️' },
  },
  67: {
    day: { Icon: CloudHail, label: 'Heavy freezing rain', emoji: '🌨️' },
    night: { Icon: CloudHail, label: 'Heavy freezing rain', emoji: '🌨️' },
  },
  71: {
    day: { Icon: Snowflake, label: 'Slight snow', emoji: '🌨️' },
    night: { Icon: Snowflake, label: 'Slight snow', emoji: '🌨️' },
  },
  73: {
    day: { Icon: CloudSnow, label: 'Moderate snow', emoji: '❄️' },
    night: { Icon: CloudSnow, label: 'Moderate snow', emoji: '❄️' },
  },
  75: {
    day: { Icon: CloudSnow, label: 'Heavy snow', emoji: '❄️' },
    night: { Icon: CloudSnow, label: 'Heavy snow', emoji: '❄️' },
  },
  77: {
    day: { Icon: Snowflake, label: 'Snow grains', emoji: '🌨️' },
    night: { Icon: Snowflake, label: 'Snow grains', emoji: '🌨️' },
  },
  80: {
    day: { Icon: CloudRain, label: 'Slight rain showers', emoji: '🌦️' },
    night: { Icon: CloudRain, label: 'Slight rain showers', emoji: '🌧️' },
  },
  81: {
    day: { Icon: CloudRain, label: 'Moderate rain showers', emoji: '🌧️' },
    night: { Icon: CloudRain, label: 'Moderate rain showers', emoji: '🌧️' },
  },
  82: {
    day: { Icon: CloudRain, label: 'Violent rain showers', emoji: '⛈️' },
    night: { Icon: CloudRain, label: 'Violent rain showers', emoji: '⛈️' },
  },
  85: {
    day: { Icon: CloudSnow, label: 'Slight snow showers', emoji: '🌨️' },
    night: { Icon: CloudSnow, label: 'Slight snow showers', emoji: '🌨️' },
  },
  86: {
    day: { Icon: CloudSnow, label: 'Heavy snow showers', emoji: '❄️' },
    night: { Icon: CloudSnow, label: 'Heavy snow showers', emoji: '❄️' },
  },
  95: {
    day: { Icon: CloudLightning, label: 'Thunderstorm', emoji: '⛈️' },
    night: { Icon: CloudLightning, label: 'Thunderstorm', emoji: '⛈️' },
  },
  96: {
    day: { Icon: CloudLightning, label: 'Thunderstorm with hail', emoji: '⛈️' },
    night: { Icon: CloudLightning, label: 'Thunderstorm with hail', emoji: '⛈️' },
  },
  99: {
    day: { Icon: CloudLightning, label: 'Severe thunderstorm with hail', emoji: '⛈️' },
    night: { Icon: CloudLightning, label: 'Severe thunderstorm with hail', emoji: '⛈️' },
  },
};

function resolve(code: number, isDay: boolean): IconResult {
  const entry = codeMap[code];
  if (entry) return isDay ? entry.day : entry.night;
  if (code >= 95) return isDay ? codeMap[95].day : codeMap[95].night;
  if (code >= 80) return isDay ? codeMap[80].day : codeMap[80].night;
  if (code >= 71) return isDay ? codeMap[71].day : codeMap[71].night;
  if (code >= 61) return isDay ? codeMap[61].day : codeMap[61].night;
  if (code >= 51) return isDay ? codeMap[51].day : codeMap[51].night;
  if (code >= 45) return isDay ? codeMap[45].day : codeMap[45].night;
  if (code >= 1) return isDay ? codeMap[2].day : codeMap[2].night;
  return isDay ? codeMap[0].day : codeMap[0].night;
}

export function getWeatherIcon(code: number, isDay = true) {
  return resolve(code, isDay).Icon;
}

export function getWeatherLabel(code: number): string {
  return resolve(code, true).label;
}

export function getWeatherEmoji(code: number): string {
  return resolve(code, true).emoji;
}

export { Sun, Moon, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, Wind, Droplets, Eye };

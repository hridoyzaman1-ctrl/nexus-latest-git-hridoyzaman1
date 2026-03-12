import type { CurrentWeather, HourlyForecast, WeatherAdvice, PopupTone, TempUnit } from '@/types/weather';

function tempInC(temp: number, unit: TempUnit): number {
  return unit === 'fahrenheit' ? (temp - 32) * 5 / 9 : temp;
}

interface RuleInput {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  unit: TempUnit;
}

function isDangerous(code: number): boolean {
  return code >= 95 || code === 82 || code === 67 || code === 86 || code === 65 || code === 75;
}

function isSevereHeat(tempC: number): boolean {
  return tempC >= 40;
}

function isHighWind(windKmh: number, unit: TempUnit): boolean {
  const kmh = unit === 'fahrenheit' ? windKmh * 1.60934 : windKmh;
  return kmh >= 60;
}

function upcomingRain(hourly: HourlyForecast[]): boolean {
  return hourly.slice(0, 6).some(h => h.precipitation > 50 || [61, 63, 65, 80, 81, 82].includes(h.weatherCode));
}

const funMessages: Record<string, { title: string; message: string; attire: string; activity: string; icon: string }[]> = {
  clear_hot: [
    { title: 'Sizzling out there!', message: "The sun's showing off today. Stay hydrated or you'll turn into a raisin.", attire: 'Light breathable clothes, sunglasses, sunscreen', activity: 'Beach day, iced drinks, or find shade and chill', icon: '🥵' },
    { title: 'Sunscreen o\'clock', message: 'Perfect weather for outdoor fun — just don\'t forget the SPF unless you fancy lobster cosplay.', attire: 'Shorts, hat, light colors', activity: 'Pool time, park hangout, ice cream run', icon: '☀️' },
  ],
  clear_nice: [
    { title: 'Golden hour vibes', message: 'Weather so nice even your plants are jealous. Get outside and enjoy it!', attire: 'Whatever makes you happy — it\'s gorgeous out', activity: 'Walk, jog, picnic, or just exist outdoors', icon: '😎' },
    { title: 'Chef\'s kiss weather', message: 'Seriously, today is *that* kind of day. Put the phone down and go breathe some fresh air.', attire: 'Casual and comfortable', activity: 'Outdoor anything — the world is your oyster', icon: '🌤️' },
  ],
  clear_cold: [
    { title: 'Crisp and fresh!', message: 'It\'s clear but chilly — like the universe is serving lemonade without the sugar.', attire: 'Layer up! Jacket, scarf if needed', activity: 'Brisk walk, hot cocoa after', icon: '🧊' },
  ],
  cloudy: [
    { title: 'Cloud committee meeting', message: 'The clouds have gathered for their daily conference. No rain scheduled... probably.', attire: 'Light jacket just in case', activity: 'Good day for errands — the sun won\'t blind you', icon: '☁️' },
    { title: 'Overcast but okay', message: 'It\'s giving "moody artist" energy. Still a solid day to get things done.', attire: 'Comfortable layers', activity: 'Coffee shop vibes, reading, or a movie', icon: '🌥️' },
  ],
  drizzle: [
    { title: 'Drizzle alert', message: 'It\'s that annoying rain that\'s not quite rain but ruins your hair anyway.', attire: 'Waterproof jacket or umbrella', activity: 'Indoor plans are your friend today', icon: '🌦️' },
  ],
  rain: [
    { title: 'Umbrella required!', message: 'Rain is here and it means business. Unless you\'re a duck, grab an umbrella.', attire: 'Waterproof everything, closed shoes', activity: 'Stay dry inside, board games, Netflix marathon', icon: '🌧️' },
    { title: 'Rainy day blues?', message: 'Nah, rainy day cozy! Perfect excuse to stay in with snacks and zero guilt.', attire: 'Rain gear if going out, pajamas if not', activity: 'Reading, cooking, or productive procrastination', icon: '☔' },
  ],
  snow: [
    { title: 'Snow day!', message: 'The world just got a fresh coat of white paint. Bundle up and enjoy it!', attire: 'Heavy coat, boots, gloves, hat — the works', activity: 'Snowball fights, hot drinks, or just admire the view', icon: '❄️' },
  ],
  fog: [
    { title: 'Mysterious vibes', message: 'Fog thick enough to film a horror movie. Drive carefully and maybe skip the contacts.', attire: 'Bright colors for visibility', activity: 'Careful driving, keep the headlights on', icon: '🌫️' },
  ],
  windy: [
    { title: 'Hold onto your hat!', message: 'It\'s blowing out there. Your hairstyle is merely a suggestion today.', attire: 'Secure layers, zip everything up', activity: 'Kite flying... or staying indoors and being sensible', icon: '💨' },
  ],
  upcoming_rain: [
    { title: 'Rain incoming!', message: 'Clear-ish now but rain is scheming in the forecast. Pack that umbrella.', attire: 'Carry a rain jacket or umbrella', activity: 'Do outdoor things now, rain hits later', icon: '🌂' },
  ],
};

const seriousMessages: Record<string, { title: string; message: string; attire: string; activity: string; icon: string }> = {
  thunderstorm: { title: 'Thunderstorm Warning', message: 'Lightning and heavy rain expected. Stay indoors and away from windows. Avoid open areas.', attire: 'Stay inside — no outdoor gear needed', activity: 'Remain indoors. Unplug sensitive electronics.', icon: '⛈️' },
  heavy_rain: { title: 'Heavy Rain Warning', message: 'Intense rainfall may cause flooding. Avoid low-lying areas and non-essential travel.', attire: 'Full waterproof gear if you must go out', activity: 'Stay home. Avoid driving through standing water.', icon: '🌊' },
  extreme_heat: { title: 'Extreme Heat Alert', message: 'Dangerously high temperatures. Heat stroke risk is real. Limit sun exposure and stay hydrated.', attire: 'Lightest possible clothing, hat, sunscreen', activity: 'Stay in air conditioning. Drink water constantly.', icon: '🔥' },
  high_wind: { title: 'High Wind Warning', message: 'Very strong winds may cause damage. Secure loose objects and avoid being outdoors.', attire: 'Stay indoors if possible', activity: 'Avoid driving. Stay away from trees and structures.', icon: '🌪️' },
  heavy_snow: { title: 'Heavy Snow Warning', message: 'Significant snowfall expected. Travel may become impossible. Stock up on essentials.', attire: 'Full winter gear — multiple heavy layers', activity: 'Stay home. Keep emergency supplies ready.', icon: '🌨️' },
  freezing: { title: 'Freezing Conditions', message: 'Temperatures well below freezing. Frostbite risk for exposed skin. Drive with extreme caution.', attire: 'Maximum insulation — cover all skin', activity: 'Minimize time outdoors. Check on vulnerable people.', icon: '🥶' },
  low_visibility: { title: 'Low Visibility Warning', message: 'Dense fog is severely limiting visibility. Drive very slowly with fog lights. Hazardous conditions.', attire: 'Bright or reflective clothing if walking', activity: 'Avoid driving if possible. Use fog lights if you must.', icon: '🌫️' },
};

export function getWeatherAdvice(input: RuleInput): WeatherAdvice {
  const { current, hourly, unit } = input;
  const code = current.weatherCode;
  const tempC = tempInC(current.temperature, unit);

  if (isDangerous(code)) {
    if (code >= 95) {
      const s = seriousMessages.thunderstorm;
      return { tone: 'serious', ...s, severity: 'extreme' };
    }
    if (code === 65 || code === 82 || code === 67) {
      const s = seriousMessages.heavy_rain;
      return { tone: 'serious', ...s, severity: 'high' };
    }
    if (code === 75 || code === 86) {
      const s = seriousMessages.heavy_snow;
      return { tone: 'serious', ...s, severity: 'high' };
    }
  }

  if (isSevereHeat(tempC)) {
    const s = seriousMessages.extreme_heat;
    return { tone: 'serious', ...s, severity: 'extreme' };
  }

  if (isHighWind(current.windSpeed, unit)) {
    const s = seriousMessages.high_wind;
    return { tone: 'serious', ...s, severity: 'high' };
  }

  if (tempC <= -15) {
    const s = seriousMessages.freezing;
    return { tone: 'serious', ...s, severity: 'high' };
  }

  if ((code === 45 || code === 48) && current.visibility < 500) {
    const s = seriousMessages.low_visibility;
    return { tone: 'serious', ...s, severity: 'medium' };
  }

  let category: keyof typeof funMessages;
  if (code >= 71 && code <= 77) category = 'snow';
  else if (code >= 61 || (code >= 80 && code <= 81)) category = 'rain';
  else if (code >= 51 && code <= 57) category = 'drizzle';
  else if (code === 45 || code === 48) category = 'fog';
  else if (code === 3) category = 'cloudy';
  else if (code <= 2) {
    if (tempC >= 32) category = 'clear_hot';
    else if (tempC >= 15) category = 'clear_nice';
    else category = 'clear_cold';
  } else category = 'cloudy';

  if (category === 'clear_nice' || category === 'clear_cold' || category === 'cloudy') {
    if (upcomingRain(hourly)) category = 'upcoming_rain';
  }

  const pool = funMessages[category] || funMessages.clear_nice;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  let severity: WeatherAdvice['severity'] = 'none';
  if (code >= 61) severity = 'low';
  if (code >= 80) severity = 'medium';

  return { tone: 'fun', ...pick, severity };
}

export function shouldShowPopup(dismissedAt: number | null, lastCode: number | null, currentCode: number): boolean {
  if (dismissedAt) {
    const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
    if (hoursSince < 3 && lastCode === currentCode) return false;
    if (hoursSince < 1) return false;
  }
  return true;
}

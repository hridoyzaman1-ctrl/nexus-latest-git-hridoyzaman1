import type { MealType, CuisineType, CountryType, FoodUnit, HealthScoreLevel } from '@/types/nutrition';

export const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch', label: 'Lunch', emoji: '☀️' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🍿' },
];

export const CUISINE_TYPES: { value: CuisineType; label: string; emoji: string }[] = [
  { value: 'bangladeshi', label: 'Bangladeshi', emoji: '🇧🇩' },
  { value: 'indian', label: 'Indian', emoji: '🇮🇳' },
  { value: 'chinese', label: 'Chinese', emoji: '🇨🇳' },
  { value: 'thai', label: 'Thai', emoji: '🇹🇭' },
  { value: 'korean', label: 'Korean', emoji: '🇰🇷' },
  { value: 'japanese', label: 'Japanese', emoji: '🇯🇵' },
  { value: 'western', label: 'Western', emoji: '🍔' },
  { value: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { value: 'mexican', label: 'Mexican', emoji: '🇲🇽' },
  { value: 'global', label: 'Global', emoji: '🌍' },
];

export const COUNTRY_TYPES: { value: CountryType; label: string }[] = [
  { value: 'bangladesh', label: 'Bangladesh' },
  { value: 'india', label: 'India' },
  { value: 'china', label: 'China' },
  { value: 'thailand', label: 'Thailand' },
  { value: 'south-korea', label: 'South Korea' },
  { value: 'japan', label: 'Japan' },
  { value: 'usa', label: 'USA' },
  { value: 'italy', label: 'Italy' },
  { value: 'mexico', label: 'Mexico' },
  { value: 'global', label: 'Global' },
];

export const FOOD_UNITS: { value: FoodUnit; label: string }[] = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'cup', label: 'Cup' },
  { value: 'tbsp', label: 'Tablespoon' },
  { value: 'tsp', label: 'Teaspoon' },
  { value: 'piece', label: 'Piece' },
  { value: 'slice', label: 'Slice' },
  { value: 'bowl', label: 'Bowl' },
  { value: 'plate', label: 'Plate' },
  { value: 'oz', label: 'Ounce (oz)' },
  { value: 'serving', label: 'Serving' },
];

export const FOOD_CATEGORIES = [
  'rice & grains',
  'bread & roti',
  'vegetables',
  'fruits',
  'meat & poultry',
  'fish & seafood',
  'eggs & dairy',
  'lentils & legumes',
  'noodles & pasta',
  'curry & gravy',
  'soup',
  'snacks & fried',
  'sweets & desserts',
  'beverages',
  'condiments & sauces',
  'nuts & seeds',
  'oils & fats',
] as const;

export const INGREDIENT_CATEGORIES = [
  'protein',
  'vegetable',
  'fruit',
  'grain',
  'dairy',
  'spice',
  'oil & fat',
  'sauce & condiment',
  'nut & seed',
  'other',
] as const;

export const HEALTH_SCORE_THRESHOLDS: Record<HealthScoreLevel, { min: number; max: number; label: string; color: string }> = {
  green: { min: 70, max: 100, label: 'Healthy', color: 'hsl(152, 69%, 45%)' },
  yellow: { min: 40, max: 69, label: 'Moderate', color: 'hsl(38, 92%, 50%)' },
  red: { min: 0, max: 39, label: 'Unhealthy', color: 'hsl(0, 72%, 51%)' },
};

export const DEFAULT_CALORIE_GOAL = 2000;

export const DAILY_NUTRIENT_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 65,
  fiber: 28,
};

export const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  ml: 1,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  piece: 100,
  slice: 30,
  bowl: 300,
  plate: 400,
  oz: 28.35,
  serving: 200,
};

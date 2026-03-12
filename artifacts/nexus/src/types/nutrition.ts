export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type CuisineType = 'bangladeshi' | 'indian' | 'chinese' | 'thai' | 'korean' | 'japanese' | 'western' | 'mediterranean' | 'mexican' | 'global';

export type CountryType = 'bangladesh' | 'india' | 'china' | 'thailand' | 'south-korea' | 'japan' | 'usa' | 'italy' | 'mexico' | 'global';

export type FoodUnit = 'g' | 'ml' | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'slice' | 'bowl' | 'plate' | 'oz' | 'serving';

export type HealthScoreLevel = 'green' | 'yellow' | 'red';

export type RoutinePeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface FoodItem {
  id: string;
  name: string;
  aliases?: string[];
  category: string;
  cuisine: CuisineType;
  per100g: NutritionInfo;
  defaultUnit: FoodUnit;
  defaultQuantity: number;
  unitWeightG?: Record<string, number>;
}

export interface NutritionLog {
  id: string;
  foodName: string;
  foodId?: string;
  quantity: number;
  unit: FoodUnit;
  mealType: MealType;
  nutrition: NutritionInfo;
  date: string;
  time: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: FoodUnit;
  category: string;
  cuisine?: CuisineType;
  addedAt: string;
}

export interface RecipeStep {
  step: number;
  instruction: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: FoodUnit;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: CuisineType;
  mealType: MealType;
  servings: number;
  prepTimeMin: number;
  cookTimeMin: number;
  calories: number;
  nutrition: NutritionInfo;
  healthScore: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: string[];
  imageEmoji: string;
}

export interface MealSlot {
  mealType: MealType;
  recipe?: Recipe;
  customFood?: string;
  calories: number;
  nutrition: NutritionInfo;
}

export interface DayPlan {
  date: string;
  dayLabel: string;
  meals: MealSlot[];
  totalCalories: number;
  totalNutrition: NutritionInfo;
}

export interface MealRoutine {
  id: string;
  name: string;
  period: RoutinePeriod;
  cuisine: CuisineType;
  country: CountryType;
  calorieGoal: number;
  days: DayPlan[];
  healthScore: number;
  createdAt: string;
}

export interface NutritionReport {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  totalMealsLogged: number;
  mealTypeBreakdown: Record<MealType, number>;
  healthScore: number;
  healthLevel: HealthScoreLevel;
  insights: string[];
  recommendations: string[];
  createdAt: string;
}

export interface HealthScore {
  score: number;
  level: HealthScoreLevel;
  label: string;
  details: string[];
}

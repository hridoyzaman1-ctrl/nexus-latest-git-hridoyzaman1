import type { MealRoutine, DayPlan, MealSlot, CuisineType, CountryType, RoutinePeriod, NutritionInfo, MealType, Recipe } from '@/types/nutrition';
import { RECIPE_DATABASE } from './recipeDatabase';
import { getCustomRecipes } from './storage';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sumNutrition(slots: MealSlot[]): NutritionInfo {
  return slots.reduce(
    (acc, s) => ({
      calories: acc.calories + s.nutrition.calories,
      protein: acc.protein + s.nutrition.protein,
      carbs: acc.carbs + s.nutrition.carbs,
      fat: acc.fat + s.nutrition.fat,
      fiber: acc.fiber + s.nutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

function getRecipesForMeal(
  mealType: MealType,
  cuisine: CuisineType,
  usedIds: Set<string>
): Recipe[] {
  const allRecipes = [...RECIPE_DATABASE, ...getCustomRecipes()];
  let pool = allRecipes.filter(r => r.mealType === mealType);
  if (cuisine !== 'global') {
    const cuisinePool = pool.filter(r => r.cuisine === cuisine);
    if (cuisinePool.length >= 3) pool = cuisinePool;
  }
  const unused = pool.filter(r => !usedIds.has(r.id));
  return unused.length > 0 ? shuffleArray(unused) : shuffleArray(pool);
}

function pickRecipeForCalories(
  recipes: Recipe[],
  targetCal: number
): Recipe {
  let best = recipes[0];
  let bestDiff = Math.abs(recipes[0].calories - targetCal);
  for (const r of recipes) {
    const diff = Math.abs(r.calories - targetCal);
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best;
}

function generateDayPlan(
  dayLabel: string,
  date: string,
  cuisine: CuisineType,
  calorieGoal: number,
  usedIds: Set<string>
): DayPlan {
  const mealCalories: Record<MealType, number> = {
    breakfast: calorieGoal * 0.25,
    lunch: calorieGoal * 0.35,
    dinner: calorieGoal * 0.30,
    snack: calorieGoal * 0.10,
  };

  const meals: MealSlot[] = (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(mt => {
    const recipes = getRecipesForMeal(mt, cuisine, usedIds);
    if (recipes.length === 0) {
      return {
        mealType: mt,
        calories: Math.round(mealCalories[mt]),
        nutrition: { calories: Math.round(mealCalories[mt]), protein: 0, carbs: 0, fat: 0, fiber: 0 },
      };
    }
    const recipe = pickRecipeForCalories(recipes, mealCalories[mt]);
    usedIds.add(recipe.id);
    return {
      mealType: mt,
      recipe,
      calories: recipe.calories,
      nutrition: { ...recipe.nutrition },
    };
  });

  const totalNutrition = sumNutrition(meals);
  return {
    date,
    dayLabel,
    meals,
    totalCalories: totalNutrition.calories,
    totalNutrition,
  };
}

function getDayCount(period: RoutinePeriod, customDays?: number): number {
  switch (period) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'monthly': return 30;
    case 'custom': return customDays || 7;
  }
}

export function generateRoutine(options: {
  name?: string;
  period: RoutinePeriod;
  cuisine: CuisineType;
  country: CountryType;
  calorieGoal: number;
  customDays?: number;
}): MealRoutine {
  const dayCount = getDayCount(options.period, options.customDays);
  const usedIds = new Set<string>();
  const today = new Date();
  const days: DayPlan[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = dayCount === 1 ? 'Today' : dayCount <= 7
      ? dayNames[d.getDay()]
      : `Day ${i + 1}`;
    days.push(generateDayPlan(label, dateStr, options.cuisine, options.calorieGoal, usedIds));
  }

  const avgScore = days.length > 0
    ? Math.round(days.reduce((s, d) => {
        const mealScores = d.meals.filter(m => m.recipe).map(m => m.recipe!.healthScore);
        return s + (mealScores.length > 0 ? mealScores.reduce((a, b) => a + b, 0) / mealScores.length : 50);
      }, 0) / days.length)
    : 50;

  return {
    id: `routine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: options.name || `${options.cuisine.charAt(0).toUpperCase() + options.cuisine.slice(1)} ${options.period} plan`,
    period: options.period,
    cuisine: options.cuisine,
    country: options.country,
    calorieGoal: options.calorieGoal,
    days,
    healthScore: avgScore,
    createdAt: new Date().toISOString(),
  };
}

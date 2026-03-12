import type { NutritionLog, NutritionReport, MealType } from '@/types/nutrition';
import { getLogsByDateRange } from './storage';
import { calculateDailyHealthScore } from './healthScore';
import { DAILY_NUTRIENT_TARGETS } from './constants';

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function generateReport(start: string, end: string, title?: string): NutritionReport {
  const logs = getLogsByDateRange(start, end);
  const dates = getDatesBetween(start, end);
  const totalDays = dates.length;
  const daysWithLogs = new Set(logs.map(l => l.date)).size;

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.nutrition.calories,
      protein: acc.protein + l.nutrition.protein,
      carbs: acc.carbs + l.nutrition.carbs,
      fat: acc.fat + l.nutrition.fat,
      fiber: acc.fiber + l.nutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const divisor = Math.max(daysWithLogs, 1);
  const avgCalories = Math.round(totals.calories / divisor);
  const avgProtein = Math.round(totals.protein / divisor * 10) / 10;
  const avgCarbs = Math.round(totals.carbs / divisor * 10) / 10;
  const avgFat = Math.round(totals.fat / divisor * 10) / 10;
  const avgFiber = Math.round(totals.fiber / divisor * 10) / 10;

  const mealTypeBreakdown: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  logs.forEach(l => { mealTypeBreakdown[l.mealType]++; });

  const avgNutrition = { calories: avgCalories, protein: avgProtein, carbs: avgCarbs, fat: avgFat, fiber: avgFiber };
  const hs = calculateDailyHealthScore(avgNutrition);

  const insights: string[] = [];
  const recommendations: string[] = [];

  if (daysWithLogs < totalDays * 0.5) {
    insights.push(`You logged meals on ${daysWithLogs} out of ${totalDays} days — try to log more consistently`);
  } else {
    insights.push(`Good consistency! Logged meals on ${daysWithLogs} of ${totalDays} days`);
  }

  const t = DAILY_NUTRIENT_TARGETS;
  if (avgCalories > t.calories * 1.2) {
    insights.push(`Average calorie intake (${avgCalories} kcal) exceeds recommended ${t.calories} kcal`);
    recommendations.push('Consider reducing portion sizes or choosing lower-calorie options');
  } else if (avgCalories < t.calories * 0.7) {
    insights.push(`Average calorie intake (${avgCalories} kcal) is below recommended ${t.calories} kcal`);
    recommendations.push('Make sure you are eating enough — undereating can be harmful');
  } else {
    insights.push(`Calorie intake is well-balanced at ${avgCalories} kcal/day`);
  }

  if (avgProtein < t.protein * 0.8) {
    recommendations.push('Increase protein intake — add eggs, chicken, fish, or lentils');
  }
  if (avgFiber < t.fiber * 0.6) {
    recommendations.push('Add more fiber — eat more vegetables, fruits, and whole grains');
  }
  if (avgFat > t.fat * 1.3) {
    recommendations.push('Reduce fat intake — use less oil and avoid fried foods');
  }

  const topMeal = (Object.entries(mealTypeBreakdown) as [MealType, number][]).sort((a, b) => b[1] - a[1])[0];
  if (topMeal && topMeal[1] > 0) {
    insights.push(`Most logged meal: ${topMeal[0]} (${topMeal[1]} entries)`);
  }

  if (mealTypeBreakdown.breakfast === 0 && logs.length > 0) {
    recommendations.push('You haven\'t logged any breakfasts — starting the day with a meal improves energy');
  }

  return {
    id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: title || `Nutrition Report (${start} to ${end})`,
    periodStart: start,
    periodEnd: end,
    totalDays,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    avgFiber,
    totalMealsLogged: logs.length,
    mealTypeBreakdown,
    healthScore: hs.score,
    healthLevel: hs.level,
    insights,
    recommendations,
    createdAt: new Date().toISOString(),
  };
}

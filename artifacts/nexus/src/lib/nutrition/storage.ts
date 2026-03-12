import { getLocalStorage, setLocalStorage } from '@/hooks/useLocalStorage';
import type { NutritionLog, Ingredient, MealRoutine, NutritionReport, Recipe } from '@/types/nutrition';

const KEYS = {
  logs: 'nutritionLogs',
  ingredients: 'nutritionIngredients',
  routines: 'nutritionRoutines',
  reports: 'nutritionReports',
  calorieGoal: 'nutritionCalorieGoal',
  customRecipes: 'nutritionCustomRecipes',
};

export function getNutritionLogs(): NutritionLog[] {
  return getLocalStorage<NutritionLog[]>(KEYS.logs, []);
}

export function saveNutritionLog(log: NutritionLog): void {
  const logs = getNutritionLogs();
  const idx = logs.findIndex(l => l.id === log.id);
  if (idx >= 0) logs[idx] = log;
  else logs.unshift(log);
  setLocalStorage(KEYS.logs, logs);
}

export function deleteNutritionLog(id: string): void {
  setLocalStorage(KEYS.logs, getNutritionLogs().filter(l => l.id !== id));
}

export function getLogsByDate(date: string): NutritionLog[] {
  return getNutritionLogs().filter(l => l.date === date);
}

export function getLogsByDateRange(start: string, end: string): NutritionLog[] {
  return getNutritionLogs().filter(l => l.date >= start && l.date <= end);
}

export function getIngredients(): Ingredient[] {
  return getLocalStorage<Ingredient[]>(KEYS.ingredients, []);
}

export function saveIngredient(ing: Ingredient): void {
  const list = getIngredients();
  const idx = list.findIndex(i => i.id === ing.id);
  if (idx >= 0) list[idx] = ing;
  else list.unshift(ing);
  setLocalStorage(KEYS.ingredients, list);
}

export function deleteIngredient(id: string): void {
  setLocalStorage(KEYS.ingredients, getIngredients().filter(i => i.id !== id));
}

export function getRoutines(): MealRoutine[] {
  return getLocalStorage<MealRoutine[]>(KEYS.routines, []);
}

export function saveRoutine(routine: MealRoutine): void {
  const list = getRoutines();
  const idx = list.findIndex(r => r.id === routine.id);
  if (idx >= 0) list[idx] = routine;
  else list.unshift(routine);
  setLocalStorage(KEYS.routines, list);
}

export function deleteRoutine(id: string): void {
  setLocalStorage(KEYS.routines, getRoutines().filter(r => r.id !== id));
}

export function getReports(): NutritionReport[] {
  return getLocalStorage<NutritionReport[]>(KEYS.reports, []);
}

export function saveReport(report: NutritionReport): void {
  const list = getReports();
  list.unshift(report);
  setLocalStorage(KEYS.reports, list);
}

export function deleteReport(id: string): void {
  setLocalStorage(KEYS.reports, getReports().filter(r => r.id !== id));
}

export function getCalorieGoal(): number {
  return getLocalStorage<number>(KEYS.calorieGoal, 2000);
}

export function setCalorieGoal(goal: number): void {
  setLocalStorage(KEYS.calorieGoal, goal);
}

export function getCustomRecipes(): Recipe[] {
  return getLocalStorage<Recipe[]>(KEYS.customRecipes, []);
}

export function saveCustomRecipe(recipe: Recipe): void {
  const list = getCustomRecipes();
  const idx = list.findIndex(r => r.id === recipe.id);
  if (idx >= 0) list[idx] = recipe;
  else list.unshift(recipe);
  setLocalStorage(KEYS.customRecipes, list);
}

export function deleteCustomRecipe(id: string): void {
  setLocalStorage(KEYS.customRecipes, getCustomRecipes().filter(r => r.id !== id));
}

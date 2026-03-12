import type { FoodItem, NutritionInfo, FoodUnit } from '@/types/nutrition';
import { FOOD_DATABASE } from './foodDatabase';
import { UNIT_TO_GRAMS } from './constants';

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function fuzzyMatch(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 80;
  const words = q.split(/\s+/);
  const matchedWords = words.filter(w => t.includes(w));
  if (matchedWords.length === words.length) return 75;
  if (matchedWords.length > 0) return 40 + (matchedWords.length / words.length) * 30;
  let lcs = 0;
  for (let i = 0, j = 0; i < q.length && j < t.length; j++) {
    if (q[i] === t[j]) { lcs++; i++; }
  }
  return (lcs / q.length) * 50;
}

export function searchFoods(query: string, limit = 20): FoodItem[] {
  if (!query.trim()) return FOOD_DATABASE.slice(0, limit);
  const scored = FOOD_DATABASE.map(food => {
    const nameScore = fuzzyMatch(query, food.name);
    const aliasScore = food.aliases ? Math.max(...food.aliases.map(a => fuzzyMatch(query, a)), 0) : 0;
    const catScore = fuzzyMatch(query, food.category) * 0.5;
    return { food, score: Math.max(nameScore, aliasScore, catScore) };
  }).filter(s => s.score > 25);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.food);
}

export function getFoodById(id: string): FoodItem | undefined {
  return FOOD_DATABASE.find(f => f.id === id);
}

export function getWeightInGrams(food: FoodItem, quantity: number, unit: FoodUnit): number {
  if (food.unitWeightG && food.unitWeightG[unit]) {
    return food.unitWeightG[unit] * quantity;
  }
  return (UNIT_TO_GRAMS[unit] || 100) * quantity;
}

export function calculateNutrition(food: FoodItem, quantity: number, unit: FoodUnit): NutritionInfo {
  const grams = getWeightInGrams(food, quantity, unit);
  const factor = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein: Math.round(food.per100g.protein * factor * 10) / 10,
    carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
    fat: Math.round(food.per100g.fat * factor * 10) / 10,
    fiber: Math.round(food.per100g.fiber * factor * 10) / 10,
  };
}

export function getAllCategories(): string[] {
  const cats = new Set(FOOD_DATABASE.map(f => f.category));
  return Array.from(cats).sort();
}

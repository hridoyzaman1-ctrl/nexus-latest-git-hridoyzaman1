import type { NutritionInfo, HealthScore, HealthScoreLevel } from '@/types/nutrition';
import { DAILY_NUTRIENT_TARGETS, HEALTH_SCORE_THRESHOLDS } from './constants';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getHealthLevel(score: number): HealthScoreLevel {
  if (score >= HEALTH_SCORE_THRESHOLDS.green.min) return 'green';
  if (score >= HEALTH_SCORE_THRESHOLDS.yellow.min) return 'yellow';
  return 'red';
}

export function getHealthLabel(level: HealthScoreLevel): string {
  return HEALTH_SCORE_THRESHOLDS[level].label;
}

export function getHealthColor(level: HealthScoreLevel): string {
  return HEALTH_SCORE_THRESHOLDS[level].color;
}

export function calculateFoodHealthScore(nutrition: NutritionInfo, perServing = true): HealthScore {
  let score = 50;
  const cal = nutrition.calories;
  if (perServing) {
    if (cal <= 200) score += 15;
    else if (cal <= 400) score += 5;
    else if (cal <= 600) score -= 5;
    else score -= 15;
  }
  if (nutrition.protein >= 15) score += 10;
  else if (nutrition.protein >= 8) score += 5;
  if (nutrition.fiber >= 5) score += 10;
  else if (nutrition.fiber >= 2) score += 5;
  if (nutrition.fat > 25) score -= 15;
  else if (nutrition.fat > 15) score -= 5;
  const carbRatio = nutrition.carbs / Math.max(cal, 1) * 100;
  if (carbRatio > 70) score -= 10;
  score = clamp(score, 0, 100);
  const level = getHealthLevel(score);
  return {
    score,
    level,
    label: getHealthLabel(level),
    details: generateDetails(nutrition, score),
  };
}

function generateDetails(n: NutritionInfo, score: number): string[] {
  const details: string[] = [];
  if (n.protein >= 15) details.push('Good protein source');
  if (n.fiber >= 5) details.push('High in fiber');
  if (n.fat > 20) details.push('High fat content');
  if (n.calories > 500) details.push('High calorie meal');
  if (n.calories <= 200) details.push('Light & low calorie');
  if (score >= 70) details.push('Overall healthy choice');
  if (score < 40) details.push('Consider healthier alternatives');
  return details;
}

export function calculateDailyHealthScore(totalNutrition: NutritionInfo): HealthScore {
  let score = 50;
  const t = DAILY_NUTRIENT_TARGETS;
  const calRatio = totalNutrition.calories / t.calories;
  if (calRatio >= 0.8 && calRatio <= 1.2) score += 20;
  else if (calRatio >= 0.6 && calRatio <= 1.4) score += 10;
  else score -= 10;
  const protRatio = totalNutrition.protein / t.protein;
  if (protRatio >= 0.8) score += 10;
  else score -= 5;
  const fiberRatio = totalNutrition.fiber / t.fiber;
  if (fiberRatio >= 0.7) score += 10;
  else score -= 5;
  const fatRatio = totalNutrition.fat / t.fat;
  if (fatRatio <= 1.2) score += 5;
  else score -= 10;
  score = clamp(score, 0, 100);
  const level = getHealthLevel(score);
  return {
    score,
    level,
    label: getHealthLabel(level),
    details: [],
  };
}

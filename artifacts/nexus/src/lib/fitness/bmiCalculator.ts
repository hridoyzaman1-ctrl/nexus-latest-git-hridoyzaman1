import type { BMICategory, Gender, FitnessGoal } from '@/types/fitness';

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function getBMIColor(category: BMICategory): string {
  switch (category) {
    case 'underweight': return 'text-blue-500';
    case 'normal': return 'text-green-500';
    case 'overweight': return 'text-yellow-500';
    case 'obese': return 'text-red-500';
  }
}

export function getBMIBgColor(category: BMICategory): string {
  switch (category) {
    case 'underweight': return 'bg-blue-500/20';
    case 'normal': return 'bg-green-500/20';
    case 'overweight': return 'bg-yellow-500/20';
    case 'obese': return 'bg-red-500/20';
  }
}

export function getIdealWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: Math.round(18.5 * heightM * heightM * 10) / 10,
    max: Math.round(24.9 * heightM * heightM * 10) / 10,
  };
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return Math.round(88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age));
  }
  return Math.round(447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age));
}

export function calculateTDEE(bmr: number, activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'): number {
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * multipliers[activityLevel]);
}

export function getRecommendedGoal(bmiCategory: BMICategory): FitnessGoal {
  switch (bmiCategory) {
    case 'underweight': return 'gain_muscle';
    case 'normal': return 'maintain';
    case 'overweight': return 'lose_weight';
    case 'obese': return 'lose_weight';
  }
}

export function getHealthInsights(bmi: number, category: BMICategory, gender: Gender, age: number): string[] {
  const insights: string[] = [];

  switch (category) {
    case 'underweight':
      insights.push('Focus on calorie-surplus meals with protein-rich foods');
      insights.push('Strength training helps build healthy muscle mass');
      insights.push('Eat 5-6 smaller meals throughout the day');
      insights.push('Include healthy fats: nuts, avocado, olive oil');
      break;
    case 'normal':
      insights.push('Great BMI! Maintain with balanced diet and regular exercise');
      insights.push('Mix cardio and strength training for optimal health');
      insights.push('Focus on improving strength, flexibility, or endurance');
      break;
    case 'overweight':
      insights.push('Focus on creating a moderate calorie deficit (300-500 cal/day)');
      insights.push('Combine cardio with strength training for best results');
      insights.push('Start with low-impact exercises and gradually increase intensity');
      insights.push('Aim for 150+ minutes of moderate exercise per week');
      break;
    case 'obese':
      insights.push('Start with gentle, low-impact exercises like walking or swimming');
      insights.push('Focus on consistency over intensity — every step counts');
      insights.push('Consult a healthcare professional before intense workouts');
      insights.push('Gradual weight loss (0.5-1 kg/week) is healthiest and most sustainable');
      break;
  }

  if (age > 40) {
    insights.push('Include joint-friendly exercises and adequate warm-up time');
  }
  if (gender === 'female') {
    insights.push('Include bone-strengthening exercises for long-term bone health');
  }

  return insights;
}

export function getWeightToLoseOrGain(weightKg: number, heightCm: number): { action: 'lose' | 'gain' | 'maintain'; amount: number } {
  const bmi = calculateBMI(weightKg, heightCm);
  const ideal = getIdealWeightRange(heightCm);

  if (bmi < 18.5) {
    return { action: 'gain', amount: Math.round((ideal.min - weightKg) * 10) / 10 };
  }
  if (bmi >= 25) {
    return { action: 'lose', amount: Math.round((weightKg - ideal.max) * 10) / 10 };
  }
  return { action: 'maintain', amount: 0 };
}

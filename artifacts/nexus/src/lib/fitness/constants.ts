import type { ExerciseCategory, DifficultyLevel, TimeOfDay, FitnessGoal, MuscleGroup, Gender, BMICategory } from '@/types/fitness';

export const EXERCISE_CATEGORIES: { value: ExerciseCategory; label: string; emoji: string }[] = [
  { value: 'warmup', label: 'Warm Up', emoji: '🔥' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'strength_upper', label: 'Upper Body', emoji: '💪' },
  { value: 'strength_lower', label: 'Lower Body', emoji: '🦵' },
  { value: 'strength_core', label: 'Core', emoji: '🎯' },
  { value: 'flexibility', label: 'Flexibility', emoji: '🧘' },
  { value: 'yoga', label: 'Yoga', emoji: '🕉️' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡' },
  { value: 'cooldown', label: 'Cool Down', emoji: '❄️' },
  { value: 'balance', label: 'Balance', emoji: '⚖️' },
];

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; emoji: string }[] = [
  { value: 'beginner', label: 'Beginner', emoji: '🟢' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🟡' },
  { value: 'advanced', label: 'Advanced', emoji: '🔴' },
];

export const TIMES_OF_DAY: { value: TimeOfDay; label: string; emoji: string; hours: string }[] = [
  { value: 'morning', label: 'Morning', emoji: '🌅', hours: '6:00 - 10:00 AM' },
  { value: 'afternoon', label: 'Afternoon', emoji: '☀️', hours: '12:00 - 3:00 PM' },
  { value: 'evening', label: 'Evening', emoji: '🌇', hours: '5:00 - 7:00 PM' },
  { value: 'night', label: 'Night', emoji: '🌙', hours: '8:00 - 10:00 PM' },
];

export const FITNESS_GOALS: { value: FitnessGoal; label: string; emoji: string; description: string }[] = [
  { value: 'lose_weight', label: 'Lose Weight', emoji: '🔻', description: 'Burn fat and reduce body weight' },
  { value: 'gain_muscle', label: 'Build Muscle', emoji: '💪', description: 'Increase muscle mass and strength' },
  { value: 'maintain', label: 'Stay Fit', emoji: '✅', description: 'Maintain current fitness level' },
  { value: 'improve_flexibility', label: 'Flexibility', emoji: '🧘', description: 'Improve range of motion and mobility' },
  { value: 'general_fitness', label: 'General Fitness', emoji: '🏋️', description: 'Overall health and wellness' },
];

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'forearms', label: 'Forearms' },
  { value: 'abs', label: 'Abs' },
  { value: 'obliques', label: 'Obliques' },
  { value: 'quads', label: 'Quadriceps' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
  { value: 'hip_flexors', label: 'Hip Flexors' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio_system', label: 'Cardiovascular' },
];

export const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male', label: 'Male', emoji: '♂️' },
  { value: 'female', label: 'Female', emoji: '♀️' },
];

export const BMI_CATEGORIES: { value: BMICategory; label: string; range: string; color: string }[] = [
  { value: 'underweight', label: 'Underweight', range: '< 18.5', color: 'text-blue-500' },
  { value: 'normal', label: 'Normal', range: '18.5 - 24.9', color: 'text-green-500' },
  { value: 'overweight', label: 'Overweight', range: '25.0 - 29.9', color: 'text-yellow-500' },
  { value: 'obese', label: 'Obese', range: '≥ 30.0', color: 'text-red-500' },
];

export const MEAL_EXERCISE_TIMING = {
  beforeMeal: 'Exercise 1-2 hours before eating for best fat burn',
  afterMeal: 'Wait at least 1.5-2 hours after a meal before exercising',
  morningFasted: 'Morning fasted cardio can boost fat burning by 20%',
  postWorkoutMeal: 'Eat protein within 30 minutes after workout for recovery',
};

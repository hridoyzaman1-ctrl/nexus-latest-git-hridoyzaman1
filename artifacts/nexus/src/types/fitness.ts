export type Gender = 'male' | 'female';
export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';
export type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_flexibility' | 'general_fitness';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type ExerciseCategory = 'warmup' | 'cardio' | 'strength_upper' | 'strength_lower' | 'strength_core' | 'flexibility' | 'yoga' | 'hiit' | 'cooldown' | 'balance';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'hip_flexors' | 'full_body' | 'cardio_system';
export type WorkoutPeriod = 'weekly' | 'monthly' | 'custom';

export interface UserFitnessProfile {
  id: string;
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  fitnessGoal: FitnessGoal;
  sessionsPerDay: number;
  preferredTimes: TimeOfDay[];
  bmi: number;
  bmiCategory: BMICategory;
  updatedAt: string;
}

export interface ExerciseStep {
  step: number;
  instruction: string;
  poseKey: string;
  durationSeconds?: number;
}

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  difficulty: DifficultyLevel;
  durationMin: number;
  sets: number;
  reps: number;
  restBetweenSetsSec: number;
  caloriesBurnedPerMin: number;
  steps: ExerciseStep[];
  suitableFor: {
    gender: Gender[];
    bmiCategories: BMICategory[];
    goals: FitnessGoal[];
  };
  tips: string[];
  tags: string[];
}

export interface ExerciseSlot {
  exerciseId: string;
  exercise: Exercise;
  timeOfDay: TimeOfDay;
  order: number;
  completed: boolean;
  actualDurationMin?: number;
}

export interface DayWorkout {
  date: string;
  dayLabel: string;
  slots: ExerciseSlot[];
  totalDurationMin: number;
  totalCalories: number;
  completed: boolean;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  period: WorkoutPeriod;
  fitnessGoal: FitnessGoal;
  days: DayWorkout[];
  sessionsPerDay: number;
  preferredTimes: TimeOfDay[];
  healthScore: number;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  date: string;
  timeOfDay: TimeOfDay;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    durationMin: number;
    setsCompleted: number;
    repsCompleted: number;
    completed: boolean;
  }[];
  totalDurationMin: number;
  caloriesBurned: number;
  completedAt: string;
  coachMessage: string;
}

export interface StopwatchState {
  isRunning: boolean;
  elapsedMs: number;
  targetMs: number;
  exerciseId?: string;
}

import type { Exercise, WorkoutRoutine, DayWorkout, ExerciseSlot, TimeOfDay, FitnessGoal, BMICategory, Gender, WorkoutPeriod } from '@/types/fitness';
import { EXERCISE_DATABASE } from './exerciseDatabase';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getExercisePool(goal: FitnessGoal, bmiCategory: BMICategory, gender: Gender): Exercise[] {
  return EXERCISE_DATABASE.filter(ex =>
    ex.suitableFor.goals.includes(goal) &&
    ex.suitableFor.bmiCategories.includes(bmiCategory) &&
    ex.suitableFor.gender.includes(gender)
  );
}

function getExercisesForTimeOfDay(
  timeOfDay: TimeOfDay,
  goal: FitnessGoal,
  bmiCategory: BMICategory,
  gender: Gender,
  usedIds: Set<string>,
  targetDuration: number
): ExerciseSlot[] {
  const MAX_MAIN_EXERCISES = 5;
  const pool = getExercisePool(goal, bmiCategory, gender);
  const slots: ExerciseSlot[] = [];
  let currentDuration = 0;
  let order = 0;

  const warmups = shuffleArray(pool.filter(e => e.category === 'warmup' && !usedIds.has(e.id)));
  if (warmups.length > 0) {
    const w = warmups[0];
    slots.push({ exerciseId: w.id, exercise: w, timeOfDay, order: order++, completed: false });
    currentDuration += w.durationMin;
    usedIds.add(w.id);
  }

  const mainCategories: Record<FitnessGoal, string[]> = {
    lose_weight: ['cardio', 'hiit', 'strength_lower', 'strength_core'],
    gain_muscle: ['strength_upper', 'strength_lower', 'strength_core'],
    maintain: ['cardio', 'strength_upper', 'strength_lower', 'strength_core'],
    improve_flexibility: ['flexibility', 'yoga', 'balance'],
    general_fitness: ['cardio', 'strength_upper', 'strength_lower', 'strength_core', 'hiit'],
  };

  const timeCategories: Record<TimeOfDay, string[]> = {
    morning: ['cardio', 'hiit', 'strength_upper'],
    afternoon: ['strength_lower', 'strength_core', 'hiit'],
    evening: ['strength_upper', 'strength_lower', 'cardio'],
    night: ['flexibility', 'yoga', 'balance', 'strength_core'],
  };

  const goalCats = mainCategories[goal];
  const timeCats = timeCategories[timeOfDay];
  const preferredCats = [...new Set([...timeCats, ...goalCats])];

  const mainExercises = shuffleArray(
    pool.filter(e =>
      preferredCats.includes(e.category) &&
      !usedIds.has(e.id) &&
      e.category !== 'warmup' &&
      e.category !== 'cooldown'
    )
  );

  let mainCount = 0;
  for (const ex of mainExercises) {
    if (currentDuration >= targetDuration - 3 || mainCount >= MAX_MAIN_EXERCISES) break;
    slots.push({ exerciseId: ex.id, exercise: ex, timeOfDay, order: order++, completed: false });
    currentDuration += ex.durationMin;
    mainCount++;
    usedIds.add(ex.id);
  }

  const cooldowns = shuffleArray(pool.filter(e => e.category === 'cooldown' && !usedIds.has(e.id)));
  if (cooldowns.length > 0) {
    const c = cooldowns[0];
    slots.push({ exerciseId: c.id, exercise: c, timeOfDay, order: order++, completed: false });
    currentDuration += c.durationMin;
    usedIds.add(c.id);
  }

  return slots;
}

function generateDayWorkout(
  dayLabel: string,
  date: string,
  times: TimeOfDay[],
  goal: FitnessGoal,
  bmiCategory: BMICategory,
  gender: Gender,
  targetDurationPerSession: number,
  globalUsedIds: Set<string>
): DayWorkout {
  const dayUsedIds = new Set(globalUsedIds);
  const allSlots: ExerciseSlot[] = [];

  for (const time of times) {
    const slots = getExercisesForTimeOfDay(time, goal, bmiCategory, gender, dayUsedIds, targetDurationPerSession);
    allSlots.push(...slots);
    slots.forEach(s => globalUsedIds.add(s.exerciseId));

    // Sanity limit: If we already have 20 exercises in one day, stop adding more sessions/exercises
    if (allSlots.length >= 20) break;
  }

  const totalDuration = allSlots.reduce((sum, s) => sum + s.exercise.durationMin, 0);
  const totalCalories = allSlots.reduce((sum, s) => sum + Math.round(s.exercise.caloriesBurnedPerMin * s.exercise.durationMin), 0);

  return {
    date,
    dayLabel,
    slots: allSlots,
    totalDurationMin: totalDuration,
    totalCalories,
    completed: false,
  };
}

function getDayCount(period: WorkoutPeriod, customDays?: number): number {
  switch (period) {
    case 'weekly': return 7;
    case 'monthly': return 30;
    case 'custom': return customDays || 7;
  }
}

function getSessionDuration(goal: FitnessGoal, bmiCategory: BMICategory): number {
  if (bmiCategory === 'obese') return 20;
  if (bmiCategory === 'overweight') return 25;
  switch (goal) {
    case 'lose_weight': return 30;
    case 'gain_muscle': return 35;
    case 'improve_flexibility': return 25;
    default: return 30;
  }
}

function getRestDays(period: WorkoutPeriod, dayCount: number): Set<number> {
  const restDays = new Set<number>();
  if (dayCount <= 3) return restDays;

  if (dayCount <= 7) {
    restDays.add(3);
    restDays.add(6);
  } else {
    for (let i = 0; i < dayCount; i++) {
      if ((i + 1) % 3 === 0) restDays.add(i);
    }
  }
  return restDays;
}

export function generateWorkoutRoutine(options: {
  name?: string;
  period: WorkoutPeriod;
  goal: FitnessGoal;
  bmiCategory: BMICategory;
  gender: Gender;
  sessionsPerDay: number;
  preferredTimes: TimeOfDay[];
  customDays?: number;
}): WorkoutRoutine {
  const dayCount = getDayCount(options.period, options.customDays);
  const restDays = getRestDays(options.period, dayCount);
  const sessionDuration = getSessionDuration(options.goal, options.bmiCategory);
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days: DayWorkout[] = [];
  const globalUsedIds = new Set<string>();

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = dayCount <= 7 ? dayNames[d.getDay()] : `Day ${i + 1}`;

    if (restDays.has(i)) {
      days.push({
        date: dateStr,
        dayLabel: `${label} (Rest)`,
        slots: [],
        totalDurationMin: 0,
        totalCalories: 0,
        completed: false,
      });
      globalUsedIds.clear();
      continue;
    }

    const times = options.preferredTimes.slice(0, options.sessionsPerDay);
    days.push(generateDayWorkout(label, dateStr, times, options.goal, options.bmiCategory, options.gender, sessionDuration, globalUsedIds));

    if (globalUsedIds.size > EXERCISE_DATABASE.length * 0.6) {
      globalUsedIds.clear();
    }
  }

  const activeDays = days.filter(d => d.slots.length > 0);
  const avgCalories = activeDays.length > 0
    ? Math.round(activeDays.reduce((s, d) => s + d.totalCalories, 0) / activeDays.length)
    : 0;
  const healthScore = Math.min(100, Math.round(
    (activeDays.length / Math.max(dayCount, 1)) * 60 +
    (options.sessionsPerDay >= 2 ? 15 : 5) +
    (avgCalories > 150 ? 20 : avgCalories > 80 ? 10 : 5)
  ));

  return {
    id: `routine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: options.name || `${options.goal.replace('_', ' ')} ${options.period} plan`,
    period: options.period,
    fitnessGoal: options.goal,
    days,
    sessionsPerDay: options.sessionsPerDay,
    preferredTimes: options.preferredTimes,
    healthScore,
    createdAt: new Date().toISOString(),
  };
}

export function findSimilarExercise(exerciseId: string, usedIds: Set<string>): Exercise | null {
  const current = EXERCISE_DATABASE.find(e => e.id === exerciseId);
  if (!current) return null;

  const candidates = EXERCISE_DATABASE.filter(e =>
    e.id !== exerciseId &&
    !usedIds.has(e.id) &&
    e.category === current.category &&
    e.muscleGroups.some(mg => current.muscleGroups.includes(mg))
  );

  if (candidates.length === 0) {
    const broader = EXERCISE_DATABASE.filter(e =>
      e.id !== exerciseId &&
      !usedIds.has(e.id) &&
      e.muscleGroups.some(mg => current.muscleGroups.includes(mg))
    );
    return broader.length > 0 ? broader[Math.floor(Math.random() * broader.length)] : null;
  }

  const sameDifficulty = candidates.filter(e => e.difficulty === current.difficulty);
  const pool = sameDifficulty.length > 0 ? sameDifficulty : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

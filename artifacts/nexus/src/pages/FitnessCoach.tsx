import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, Trash2, Edit3, ChevronDown, ChevronRight,
  Dumbbell, Heart, Timer as TimerIcon, Calendar, BarChart3, BookOpen,
  Play, Pause, RotateCcw, Check, X, RefreshCw, Clock, Users, Flame,
  Filter, Eye, Zap, Target, TrendingUp, Award, Volume2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import EmptyState from '@/components/EmptyState';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import ExercisePose from '@/components/fitness/ExercisePose';
import type {
  UserFitnessProfile, WorkoutRoutine, WorkoutSession, Exercise,
  ExerciseSlot, DayWorkout, Gender, FitnessGoal, TimeOfDay,
  WorkoutPeriod, ExerciseCategory, DifficultyLevel, MuscleGroup
} from '@/types/fitness';
import {
  EXERCISE_CATEGORIES, DIFFICULTY_LEVELS, TIMES_OF_DAY,
  FITNESS_GOALS, MUSCLE_GROUPS, GENDERS
} from '@/lib/fitness/constants';
import {
  getFitnessProfile, saveFitnessProfile,
  getWorkoutRoutines, saveWorkoutRoutine, deleteWorkoutRoutine,
  getActiveRoutineId, setActiveRoutineId,
  getWorkoutHistory, saveWorkoutSession, deleteWorkoutSession,
  getWorkoutStreak, updateWorkoutStreak
} from '@/lib/fitness/storage';
import {
  calculateBMI, getBMICategory, getBMIColor, getBMIBgColor,
  getIdealWeightRange, calculateBMR, getRecommendedGoal,
  getHealthInsights, getWeightToLoseOrGain
} from '@/lib/fitness/bmiCalculator';
import { generateWorkoutRoutine, findSimilarExercise } from '@/lib/fitness/routineGenerator';
import { EXERCISE_DATABASE } from '@/lib/fitness/exerciseDatabase';
import { getCoachMessage, getCoachMessageForStreak, getCoachMessageForBMI } from '@/lib/fitness/coach';

type TabId = 'home' | 'workouts' | 'planner' | 'library' | 'timer' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Heart },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'planner', label: 'Planner', icon: Calendar },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'timer', label: 'Timer', icon: TimerIcon },
  { id: 'history', label: 'History', icon: BarChart3 },
];

function defaultProfile(): UserFitnessProfile {
  return {
    id: `profile_${Date.now()}`,
    weight: 70, height: 170, age: 25, gender: 'male' as Gender,
    fitnessGoal: 'general_fitness' as FitnessGoal,
    sessionsPerDay: 1, preferredTimes: ['morning'] as TimeOfDay[],
    bmi: 0, bmiCategory: 'normal',
    updatedAt: new Date().toISOString(),
  };
}

export default function FitnessCoach() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const [profile, setProfile] = useState<UserFitnessProfile>(() => getFitnessProfile() || defaultProfile());
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => getWorkoutRoutines());
  const [activeRoutineId, setActiveRoutineIdState] = useState<string | null>(() => getActiveRoutineId());
  const [history, setHistory] = useState<WorkoutSession[]>(() => getWorkoutHistory());
  const [streak, setStreak] = useState(() => getWorkoutStreak());


  const activeRoutine = useMemo(() => routines.find(r => r.id === activeRoutineId) || null, [routines, activeRoutineId]);

  const refreshData = useCallback(() => {
    setProfile(getFitnessProfile() || defaultProfile());
    setRoutines(getWorkoutRoutines());
    setActiveRoutineIdState(getActiveRoutineId());
    setHistory(getWorkoutHistory());
    setStreak(getWorkoutStreak());
  }, []);



  return (
    <PageTransition>
      <PageOnboardingTooltips pageId="fitness" />
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-30 glass-strong border-b border-border/50 px-4 py-3" data-tour="fitness-header">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Dumbbell size={20} className="text-blue-500" /> Body & Fitness
              </h1>
            </div>

          </div>
          <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}>
                <tab.icon size={14} />{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {activeTab === 'home' && <div data-tour="fitness-profile"><HomeTab profile={profile} setProfile={setProfile} streak={streak} setActiveTab={setActiveTab} /></div>}
              {activeTab === 'workouts' && <WorkoutsTab activeRoutine={activeRoutine} onUpdate={refreshData} />}
              {activeTab === 'planner' && <div data-tour="fitness-planner"><PlannerTab profile={profile} onUpdate={refreshData} /></div>}
              {activeTab === 'library' && <div data-tour="fitness-library"><LibraryTab /></div>}
              {activeTab === 'timer' && <div data-tour="fitness-timer"><TimerTab onUpdate={refreshData} /></div>}
              {activeTab === 'history' && <HistoryTab history={history} onUpdate={refreshData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </PageTransition>
  );
}

function HomeTab({ profile, setProfile, streak, setActiveTab }: {
  profile: UserFitnessProfile;
  setProfile: (p: UserFitnessProfile) => void;
  streak: { current: number; lastDate: string };
  setActiveTab: (t: TabId) => void;
}) {
  const updateField = <K extends keyof UserFitnessProfile>(key: K, value: UserFitnessProfile[K]) => {
    const updated = { ...profile, [key]: value, updatedAt: new Date().toISOString() };
    if (key === 'weight' || key === 'height') {
      const w = key === 'weight' ? (value as number) : updated.weight;
      const h = key === 'height' ? (value as number) : updated.height;
      if (w > 0 && h > 0) {
        updated.bmi = calculateBMI(w, h);
        updated.bmiCategory = getBMICategory(updated.bmi);
      }
    }
    setProfile(updated);
    saveFitnessProfile(updated);
  };

  const bmi = profile.weight > 0 && profile.height > 0 ? calculateBMI(profile.weight, profile.height) : 0;
  const bmiCat = bmi > 0 ? getBMICategory(bmi) : 'normal';
  const idealRange = profile.height > 0 ? getIdealWeightRange(profile.height) : { min: 0, max: 0 };
  const bmr = profile.weight > 0 && profile.height > 0 && profile.age > 0
    ? calculateBMR(profile.weight, profile.height, profile.age, profile.gender)
    : 0;
  const insights = bmi > 0 ? getHealthInsights(bmi, bmiCat, profile.gender, profile.age) : [];
  const weightAction = profile.weight > 0 && profile.height > 0 ? getWeightToLoseOrGain(profile.weight, profile.height) : null;
  const coachMsg = getCoachMessageForBMI(bmiCat);
  const recommendedGoal = getRecommendedGoal(bmiCat);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Users size={16} /> Your Profile</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
            <input type="number" min={20} max={300} value={profile.weight} onChange={e => updateField('weight', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Height (cm)</label>
            <input type="number" min={80} max={250} value={profile.height} onChange={e => updateField('height', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Age</label>
            <input type="number" min={10} max={100} value={profile.age} onChange={e => updateField('age', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
            <select value={profile.gender} onChange={e => updateField('gender', e.target.value as Gender)}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {bmi > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Target size={16} /> BMI & Health</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className={`text-center p-4 rounded-xl w-full sm:w-auto ${getBMIBgColor(bmiCat)}`}>
              <p className={`text-3xl font-bold ${getBMIColor(bmiCat)}`}>{bmi}</p>
              <p className={`text-sm font-medium ${getBMIColor(bmiCat)} capitalize`}>{bmiCat}</p>
            </div>
            <div className="flex-1 w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ideal Weight</span>
                <span className="font-medium">{idealRange.min} - {idealRange.max} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BMR</span>
                <span className="font-medium">{bmr} kcal/day</span>
              </div>
              {weightAction && weightAction.action !== 'maintain' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{weightAction.action === 'lose' ? 'To lose' : 'To gain'}</span>
                  <span className="font-medium">{weightAction.amount} kg</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-muted/20 rounded-xl p-3">
            <p className="text-sm font-medium flex items-center gap-1 mb-1"><Zap size={14} className="text-yellow-500" /> Coach Says</p>
            <p className="text-xs text-muted-foreground">{coachMsg}</p>
          </div>

          {insights.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium flex items-center gap-1"><TrendingUp size={14} /> Health Insights</p>
              {insights.map((ins, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">•</span> {ins}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Award size={16} /> Fitness Goal</h2>
        <div className="grid grid-cols-1 gap-2">
          {FITNESS_GOALS.map(g => (
            <button key={g.value} onClick={() => updateField('fitnessGoal', g.value)}
              className={`text-left p-3 rounded-xl border transition-all ${profile.fitnessGoal === g.value ? 'border-primary bg-primary/10' : 'border-border/30 hover:bg-muted/30'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{g.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                </div>
                {recommendedGoal === g.value && bmi > 0 && (
                  <span className="ml-auto text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Recommended</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {streak.current > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={20} className="text-orange-500" />
            <span className="font-semibold">{streak.current} Day Streak!</span>
          </div>
          <p className="text-xs text-muted-foreground">{getCoachMessageForStreak(streak.current)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Start Workout', icon: Dumbbell, tab: 'workouts' as TabId, color: 'text-blue-500' },
          { label: 'Create Plan', icon: Calendar, tab: 'planner' as TabId, color: 'text-green-500' },
          { label: 'Exercise Library', icon: BookOpen, tab: 'library' as TabId, color: 'text-purple-500' },
          { label: 'Workout Timer', icon: TimerIcon, tab: 'timer' as TabId, color: 'text-orange-500' },
        ].map(a => (
          <button key={a.label} onClick={() => setActiveTab(a.tab)} className="glass rounded-xl p-4 text-left hover:bg-muted/30 transition-all group">
            <a.icon size={24} className={`${a.color} mb-2 group-hover:scale-110 transition-transform`} />
            <p className="text-sm font-medium">{a.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkoutsTab({ activeRoutine, onUpdate }: { activeRoutine: WorkoutRoutine | null; onUpdate: () => void }) {
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const todayWorkout = activeRoutine?.days.find(d => d.date === today) || null;
  const upcomingDays = activeRoutine?.days.filter(d => d.date > today).slice(0, 5) || [];

  const handleToggleComplete = (dayIdx: number, slotIdx: number) => {
    if (!activeRoutine) return;
    const updated = {
      ...activeRoutine, days: activeRoutine.days.map((d, di) =>
        di === dayIdx ? { ...d, slots: d.slots.map((s, si) => si === slotIdx ? { ...s, completed: !s.completed } : s) } : d
      )
    };
    const day = updated.days[dayIdx];
    day.completed = day.slots.length > 0 && day.slots.every(s => s.completed);
    saveWorkoutRoutine(updated);
    onUpdate();

    const wasPreviouslyComplete = activeRoutine.days[dayIdx].slots.length > 0 && activeRoutine.days[dayIdx].slots.every(s => s.completed);
    if (day.completed && !wasPreviouslyComplete) {
      const existingSessions = getWorkoutHistory();
      const alreadyLogged = existingSessions.some(s => s.routineId === activeRoutine.id && s.date === day.date);
      if (!alreadyLogged) {
        const session: WorkoutSession = {
          id: `session_${Date.now()}`,
          routineId: activeRoutine.id,
          date: day.date,
          timeOfDay: day.slots[0]?.timeOfDay || 'morning',
          exercises: day.slots.map(s => ({
            exerciseId: s.exerciseId,
            exerciseName: s.exercise.name,
            durationMin: s.exercise.durationMin,
            setsCompleted: s.exercise.sets,
            repsCompleted: s.exercise.reps,
            completed: s.completed,
          })),
          totalDurationMin: day.totalDurationMin,
          caloriesBurned: day.totalCalories,
          completedAt: new Date().toISOString(),
          coachMessage: getCoachMessage('workout_complete'),
        };
        saveWorkoutSession(session);
        const newStreak = updateWorkoutStreak();
        toast.success(getCoachMessage('workout_complete'));
        if (newStreak > 1) {
          setTimeout(() => toast.success(getCoachMessageForStreak(newStreak)), 1500);
        }
        onUpdate();
      }
    }
  };

  const handleSwap = (dayIdx: number, slotIdx: number) => {
    if (!activeRoutine) return;
    const slot = activeRoutine.days[dayIdx].slots[slotIdx];
    const usedIds = new Set<string>();
    activeRoutine.days.forEach(d => d.slots.forEach(s => usedIds.add(s.exerciseId)));
    const replacement = findSimilarExercise(slot.exerciseId, usedIds);
    if (!replacement) {
      toast.error('No similar exercise found');
      return;
    }
    const updated = {
      ...activeRoutine, days: activeRoutine.days.map((d, di) =>
        di === dayIdx ? {
          ...d, slots: d.slots.map((s, si) =>
            si === slotIdx ? { ...s, exerciseId: replacement.id, exercise: replacement } : s
          )
        } : d
      )
    };
    saveWorkoutRoutine(updated);
    toast.success(`Swapped to ${replacement.name}`);
    onUpdate();
  };

  if (!activeRoutine) {
    return <EmptyState icon={Dumbbell} title="No Active Routine" description="Go to Planner to create and activate a workout routine" />;
  }

  const renderSlot = (slot: ExerciseSlot, dayIdx: number, slotIdx: number) => {
    const isExpanded = expandedSlot === `${dayIdx}-${slotIdx}`;
    return (
      <div key={`${dayIdx}-${slotIdx}`} className="glass rounded-xl overflow-hidden">
        <button onClick={() => setExpandedSlot(isExpanded ? null : `${dayIdx}-${slotIdx}`)}
          className="w-full flex items-center gap-2 sm:gap-3 p-3 text-left">
          <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(dayIdx, slotIdx); }}
            className={`w-8 h-8 min-w-[32px] rounded-md border-2 flex items-center justify-center transition-colors ${slot.completed ? 'bg-green-500 border-green-500 text-white' : 'border-border/50'}`}>
            {slot.completed && <Check size={16} />}
          </button>
          <span className="text-lg">{slot.exercise.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${slot.completed ? 'line-through text-muted-foreground' : ''}`}>{slot.exercise.name}</p>
            <p className="text-xs text-muted-foreground truncate">{slot.exercise.sets}×{slot.exercise.reps} · {slot.exercise.durationMin}min · {TIMES_OF_DAY.find(t => t.value === slot.timeOfDay)?.emoji}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleSwap(dayIdx, slotIdx); }}
            className="p-2 min-w-[36px] min-h-[36px] rounded-lg hover:bg-muted/50 text-muted-foreground flex items-center justify-center"><RefreshCw size={16} /></button>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-3">
                <div className="flex gap-2 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-muted/50">{EXERCISE_CATEGORIES.find(c => c.value === slot.exercise.category)?.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted/50">{DIFFICULTY_LEVELS.find(d => d.value === slot.exercise.difficulty)?.emoji} {slot.exercise.difficulty}</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">{Math.round(slot.exercise.caloriesBurnedPerMin * slot.exercise.durationMin)} kcal</span>
                </div>
                {slot.exercise.steps.map(step => (
                  <div key={step.step} className="flex items-start gap-3">
                    <ExercisePose poseKey={step.poseKey} size={60} />
                    <div className="flex-1">
                      <p className="text-xs font-medium">Step {step.step}</p>
                      <p className="text-xs text-muted-foreground">{step.instruction}</p>
                    </div>
                  </div>
                ))}
                {slot.exercise.tips.length > 0 && (
                  <div className="bg-muted/20 rounded-lg p-2">
                    <p className="text-xs font-medium mb-1">💡 Tips</p>
                    {slot.exercise.tips.map((tip, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">{activeRoutine.name}</h2>
          <span className="text-xs text-muted-foreground capitalize">{activeRoutine.period}</span>
        </div>
        <p className="text-xs text-muted-foreground">{FITNESS_GOALS.find(g => g.value === activeRoutine.fitnessGoal)?.emoji} {FITNESS_GOALS.find(g => g.value === activeRoutine.fitnessGoal)?.label} · Score: {activeRoutine.healthScore}/100</p>
      </div>

      {todayWorkout ? (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Calendar size={14} /> Today — {todayWorkout.dayLabel}
            {todayWorkout.completed && <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Complete</span>}
          </h3>
          {todayWorkout.slots.length === 0 ? (
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">{getCoachMessage('rest_day')}</p>
            </div>
          ) : (
            todayWorkout.slots.map((slot, si) => {
              const dayIdx = activeRoutine.days.findIndex(d => d.date === today);
              return renderSlot(slot, dayIdx, si);
            })
          )}
        </div>
      ) : (
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">No workout scheduled for today</p>
        </div>
      )}

      {upcomingDays.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Clock size={14} /> Upcoming</h3>
          {upcomingDays.map((day, di) => {
            const dayIdx = activeRoutine.days.indexOf(day);
            return (
              <div key={day.date} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{day.dayLabel} — {day.date} {day.slots.length === 0 ? '(Rest)' : `(${day.slots.length} exercises)`}</p>
                {day.slots.map((slot, si) => renderSlot(slot, dayIdx, si))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlannerTab({ profile, onUpdate }: { profile: UserFitnessProfile; onUpdate: () => void }) {
  const [period, setPeriod] = useState<WorkoutPeriod>('weekly');
  const [sessionsPerDay, setSessionsPerDay] = useState(1);
  const [preferredTimes, setPreferredTimes] = useState<TimeOfDay[]>(['morning']);
  const [goal, setGoal] = useState<FitnessGoal>(profile.fitnessGoal);
  const [customDays, setCustomDays] = useState(7);
  const [preview, setPreview] = useState<WorkoutRoutine | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const toggleTime = (t: TimeOfDay) => {
    setPreferredTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleGenerate = () => {
    if (preferredTimes.length === 0) { toast.error('Select at least one time of day'); return; }
    if (preferredTimes.length < sessionsPerDay) {
      toast.error(`Select at least ${sessionsPerDay} time slots for ${sessionsPerDay} sessions/day`);
      return;
    }
    const bmiCat = profile.bmi > 0 ? getBMICategory(profile.bmi) : 'normal';
    const routine = generateWorkoutRoutine({
      period, goal, bmiCategory: bmiCat, gender: profile.gender,
      sessionsPerDay, preferredTimes, customDays: period === 'custom' ? customDays : undefined,
    });
    setPreview(routine);
    toast.success(getCoachMessage('start_workout'));
  };

  const handleSave = () => {
    if (!preview) return;
    saveWorkoutRoutine(preview);
    setActiveRoutineId(preview.id);
    toast.success('Routine saved and set as active!');
    setPreview(null);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><Calendar size={16} /> Create Workout Plan</h2>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Period</label>
          <div className="flex gap-2">
            {(['weekly', 'monthly', 'custom'] as WorkoutPeriod[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted/30 hover:bg-muted/50'}`}>
                {p}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="mt-2">
              <label className="text-xs text-muted-foreground mb-1 block">Number of Days</label>
              <input type="number" min={1} max={90} value={customDays} onChange={e => setCustomDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sessions per Day: {sessionsPerDay}</label>
          <input type="range" min={1} max={4} value={sessionsPerDay} onChange={e => setSessionsPerDay(Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>2</span><span>3</span><span>4</span></div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Preferred Times</label>
          <div className="grid grid-cols-2 gap-2">
            {TIMES_OF_DAY.map(t => (
              <button key={t.value} onClick={() => toggleTime(t.value)}
                className={`p-2 rounded-lg text-sm text-left transition-all ${preferredTimes.includes(t.value) ? 'bg-primary/20 border border-primary' : 'bg-muted/30 border border-transparent hover:bg-muted/50'}`}>
                <span>{t.emoji} {t.label}</span>
                <p className="text-xs text-muted-foreground">{t.hours}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fitness Goal</label>
          <select value={goal} onChange={e => setGoal(e.target.value as FitnessGoal)}
            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
            {FITNESS_GOALS.map(g => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
          </select>
        </div>

        <button onClick={handleGenerate}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
          <Zap size={16} /> Generate Routine
        </button>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{preview.name}</h3>
              <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Score: {preview.healthScore}/100</span>
            </div>
            <p className="text-xs text-muted-foreground">{preview.days.length} days · {preview.sessionsPerDay} session(s)/day</p>
          </div>

          {preview.days.map((day, di) => (
            <div key={di} className="glass rounded-xl overflow-hidden">
              <button onClick={() => setExpandedDay(expandedDay === di ? null : di)}
                className="w-full flex items-center justify-between p-3 text-left">
                <div>
                  <p className="text-sm font-medium">{day.dayLabel}</p>
                  <p className="text-xs text-muted-foreground">{day.date} · {day.slots.length} exercises · {day.totalDurationMin}min · {day.totalCalories} kcal</p>
                </div>
                {expandedDay === di ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <AnimatePresence>
                {expandedDay === di && day.slots.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                      {day.slots.map((slot, si) => (
                        <div key={si} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                          <span className="text-sm">{slot.exercise.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{slot.exercise.name}</p>
                            <p className="text-[10px] text-muted-foreground">{TIMES_OF_DAY.find(t => t.value === slot.timeOfDay)?.emoji} {slot.exercise.sets}×{slot.exercise.reps} · {slot.exercise.durationMin}min</p>
                          </div>
                          <span className="text-[10px] text-orange-500 font-medium">{Math.round(slot.exercise.caloriesBurnedPerMin * slot.exercise.durationMin)} kcal</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <div className="flex gap-2">
            <button onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium">Discard</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1">
              <Check size={16} /> Save & Activate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryTab() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExerciseCategory | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | ''>('');
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return EXERCISE_DATABASE.filter(ex => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase()) && !ex.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
      if (filterCategory && ex.category !== filterCategory) return false;
      if (filterDifficulty && ex.difficulty !== filterDifficulty) return false;
      if (filterMuscle && !ex.muscleGroups.includes(filterMuscle)) return false;
      return true;
    });
  }, [search, filterCategory, filterDifficulty, filterMuscle]);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><BookOpen size={16} /> Exercise Library</h2>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      <button onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Filter size={14} /> Filters {(filterCategory || filterDifficulty || filterMuscle) && '(active)'}
      </button>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass rounded-xl p-3 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as ExerciseCategory | '')}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                  <option value="">All Categories</option>
                  {EXERCISE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
                <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value as DifficultyLevel | '')}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                  <option value="">All Levels</option>
                  {DIFFICULTY_LEVELS.map(d => <option key={d.value} value={d.value}>{d.emoji} {d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Muscle Group</label>
                <select value={filterMuscle} onChange={e => setFilterMuscle(e.target.value as MuscleGroup | '')}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                  <option value="">All Muscles</option>
                  {MUSCLE_GROUPS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <button onClick={() => { setFilterCategory(''); setFilterDifficulty(''); setFilterMuscle(''); }}
                className="text-xs text-primary hover:underline">Clear Filters</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground">{filtered.length} exercises found</p>

      <div className="space-y-2">
        {filtered.map(ex => {
          const isExpanded = expandedId === ex.id;
          return (
            <div key={ex.id} className="glass rounded-xl overflow-hidden">
              <button onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                className="w-full flex items-center gap-3 p-3 text-left">
                <span className="text-xl">{ex.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {EXERCISE_CATEGORIES.find(c => c.value === ex.category)?.label} · {DIFFICULTY_LEVELS.find(d => d.value === ex.difficulty)?.emoji} · {ex.durationMin}min
                  </p>
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-3">
                      <div className="flex gap-2 flex-wrap text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-muted/50">{ex.sets} sets × {ex.reps} reps</span>
                        <span className="px-2 py-0.5 rounded-full bg-muted/50">Rest: {ex.restBetweenSetsSec}s</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">{Math.round(ex.caloriesBurnedPerMin * ex.durationMin)} kcal</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {ex.muscleGroups.map(mg => (
                          <span key={mg} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{MUSCLE_GROUPS.find(m => m.value === mg)?.label}</span>
                        ))}
                      </div>
                      {ex.steps.map(step => (
                        <div key={step.step} className="flex items-start gap-3">
                          <ExercisePose poseKey={step.poseKey} size={60} />
                          <div className="flex-1">
                            <p className="text-xs font-medium">Step {step.step}</p>
                            <p className="text-xs text-muted-foreground">{step.instruction}</p>
                          </div>
                        </div>
                      ))}
                      {ex.tips.length > 0 && (
                        <div className="bg-muted/20 rounded-lg p-2">
                          <p className="text-xs font-medium mb-1">💡 Tips</p>
                          {ex.tips.map((tip, i) => (
                            <p key={i} className="text-xs text-muted-foreground">• {tip}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimerTab({ onUpdate }: { onUpdate: () => void }) {
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [countdownTotal, setCountdownTotal] = useState(60);
  const [countdownRemaining, setCountdownRemaining] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [exerciseName, setExerciseName] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [halfwayShown, setHalfwayShown] = useState(false);
  const [almostDoneShown, setAlmostDoneShown] = useState(false);

  const activeRoutineId = getActiveRoutineId();
  const elapsedSecRef = useRef(0);
  const exerciseNameRef = useRef('');

  useEffect(() => {
    exerciseNameRef.current = exerciseName;
  }, [exerciseName]);

  const logTimerSession = useCallback((seconds: number, name: string) => {
    if (seconds >= 60) {
      const session: WorkoutSession = {
        id: `timer_${Date.now()}`,
        routineId: activeRoutineId || 'custom',
        date: new Date().toISOString().split('T')[0],
        timeOfDay: 'morning', // Default, could be refined based on actual time
        exercises: [{
          exerciseId: `custom_${Date.now()}`,
          exerciseName: name || 'Custom Exercise',
          durationMin: Math.round(seconds / 60),
          setsCompleted: 1,
          repsCompleted: 1,
          completed: true,
        }],
        totalDurationMin: Math.round(seconds / 60),
        caloriesBurned: Math.round((seconds / 60) * 5), // Rough estimate: 5 kcal/min
        completedAt: new Date().toISOString(),
        coachMessage: getCoachMessage('workout_complete'),
      };
      saveWorkoutSession(session);
      onUpdate();
    }
  }, [activeRoutineId, onUpdate]);

  // Handle unmount logging
  useEffect(() => {
    return () => {
      if (elapsedSecRef.current >= 60) {
        logTimerSession(elapsedSecRef.current, exerciseNameRef.current);
      }
    };
  }, [logTimerSession]);

  useEffect(() => {
    if (!isRunning) return;

    if (mode === 'countdown') {
      const interval = setInterval(() => {
        setCountdownRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            clearInterval(interval);
            elapsedSecRef.current += 1;

            logTimerSession(countdownTotal, exerciseNameRef.current);
            elapsedSecRef.current = 0; // Reset after logging

            toast.success(getCoachMessage('exercise_complete'));
            try { navigator.vibrate?.(500); } catch { }
            try {
              const audio = new Audio('/audio/notification.mp3');
              audio.play().catch(() => { });
            } catch { }
            return 0;
          }

          const next = prev - 1;
          elapsedSecRef.current = countdownTotal - next;
          if (!halfwayShown && next <= countdownTotal / 2 && next > countdownTotal / 2 - 2) {
            toast.success(getCoachMessage('timer_halfway'));
            setHalfwayShown(true);
          }
          if (!almostDoneShown && next <= 5 && next > 3) {
            toast.success(getCoachMessage('timer_almost_done'));
            setAlmostDoneShown(true);
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setStopwatchMs(prev => {
          const next = prev + 100;
          elapsedSecRef.current = Math.floor(next / 1000);
          return next;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRunning, mode, countdownTotal, halfwayShown, almostDoneShown, logTimerSession]);

  const resetTimer = () => {
    if (elapsedSecRef.current >= 60) {
      logTimerSession(elapsedSecRef.current, exerciseNameRef.current);
    }
    elapsedSecRef.current = 0;
    setIsRunning(false);
    setCountdownRemaining(countdownTotal);
    setStopwatchMs(0);
    setHalfwayShown(false);
    setAlmostDoneShown(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  const pct = mode === 'countdown' ? ((countdownTotal - countdownRemaining) / Math.max(countdownTotal, 1)) * 100 : 0;

  return (
    <div className="space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><TimerIcon size={16} /> Workout Timer</h2>

      <div className="flex gap-2">
        {(['countdown', 'stopwatch'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); resetTimer(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/30 hover:bg-muted/50'}`}>
            {m === 'countdown' ? '⏱️ Countdown' : '⏲️ Stopwatch'}
          </button>
        ))}
      </div>

      {mode === 'countdown' && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Exercise Name</label>
            <input value={exerciseName} onChange={e => setExerciseName(e.target.value)} placeholder="e.g. Plank Hold"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Current Step</label>
            <input value={currentStep} onChange={e => setCurrentStep(e.target.value)} placeholder="e.g. Hold position"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
          </div>
          {!isRunning && countdownRemaining === countdownTotal && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (seconds): {countdownTotal}s</label>
              <input type="range" min={10} max={300} step={5} value={countdownTotal}
                onChange={e => { setCountdownTotal(Number(e.target.value)); setCountdownRemaining(Number(e.target.value)); }}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>10s</span><span>5m</span></div>
            </div>
          )}

          <div className="flex flex-col items-center py-6">
            {exerciseName && <p className="text-sm font-medium mb-1">{exerciseName}</p>}
            {currentStep && <p className="text-xs text-muted-foreground mb-3">{currentStep}</p>}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" opacity={0.3} />
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - pct / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono">{formatTime(countdownRemaining)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={resetTimer}
              className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium flex items-center justify-center gap-1">
              <RotateCcw size={16} /> Reset
            </button>
            <button onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${isRunning ? 'bg-orange-500 text-white' : 'bg-primary text-primary-foreground'}`}>
              {isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
            </button>
          </div>
        </div>
      )}

      {mode === 'stopwatch' && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Exercise Name</label>
            <input value={exerciseName} onChange={e => setExerciseName(e.target.value)} placeholder="e.g. Free Run"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
          </div>

          <div className="flex flex-col items-center py-8">
            {exerciseName && <p className="text-sm font-medium mb-3">{exerciseName}</p>}
            <span className="text-4xl font-bold font-mono">{formatMs(stopwatchMs)}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={resetTimer}
              className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium flex items-center justify-center gap-1">
              <RotateCcw size={16} /> Reset
            </button>
            <button onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${isRunning ? 'bg-orange-500 text-white' : 'bg-primary text-primary-foreground'}`}>
              {isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history, onUpdate }: { history: WorkoutSession[]; onUpdate: () => void }) {
  const handleDelete = (id: string) => {
    deleteWorkoutSession(id);
    toast.success('Session deleted');
    onUpdate();
  };

  if (history.length === 0) {
    return <EmptyState icon={BarChart3} title="No Workout History" description="Complete a workout to see your history here" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><BarChart3 size={16} /> Workout History</h2>
      <p className="text-xs text-muted-foreground">{history.length} completed sessions</p>

      <div className="space-y-2">
        {history.map(session => (
          <div key={session.id} className="glass rounded-xl p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p className="text-xs text-muted-foreground">
                  {TIMES_OF_DAY.find(t => t.value === session.timeOfDay)?.emoji} {session.timeOfDay} · {session.exercises.length} exercises
                </p>
                <div className="flex gap-3 mt-1.5 text-xs">
                  <span className="flex items-center gap-1"><Clock size={12} /> {session.totalDurationMin}min</span>
                  <span className="flex items-center gap-1 text-orange-500"><Flame size={12} /> {session.caloriesBurned} kcal</span>
                </div>
                {session.coachMessage && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{session.coachMessage}"</p>
                )}
              </div>
              <button onClick={() => handleDelete(session.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {session.exercises.map((ex, i) => (
                <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${ex.completed ? 'bg-green-500/20 text-green-500' : 'bg-muted/50 text-muted-foreground'}`}>
                  {ex.exerciseName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Habit, GamificationState, HabitBadge, Reward } from '@/types';
import { exampleHabits } from '@/lib/examples';
import { ArrowLeft, Plus, Flame, X, Swords, Trophy, Star, ShoppingBag, Calendar, Zap, Shield, Crown, Target, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ALARM_SOUNDS, previewAlarmSound } from '@/lib/alarm';
import EmptyState from '@/components/EmptyState';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';

const XP_PER_COMPLETION = { daily: 10, weekly: 50 };
const XP_STREAK_BONUS = 5;
const POINTS_PER_LEVEL = 2;

function getLevel(xp: number) { return Math.floor(xp / 100) + 1; }
function xpForNextLevel(xp: number) { return ((getLevel(xp)) * 100) - xp; }
function xpProgress(xp: number) { return (xp % 100); }

const BADGE_DEFS = [
  { id: 'first_flame', name: 'First Flame', icon: '🔥', desc: 'Complete your first habit', check: (h: Habit) => h.xp >= 10 },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚔️', desc: '7-day streak', check: (h: Habit) => h.currentStreak >= 7 },
  { id: 'streak_30', name: 'Monthly Master', icon: '👑', desc: '30-day streak', check: (h: Habit) => h.currentStreak >= 30 },
  { id: 'xp_500', name: 'XP Hunter', icon: '💎', desc: 'Earn 500 XP on one habit', check: (h: Habit) => h.xp >= 500 },
  { id: 'streak_100', name: 'Centurion', icon: '🏛️', desc: '100-day streak', check: (h: Habit) => h.currentStreak >= 100 },
];

const REWARDS: Reward[] = [
  { id: 'title_hero', name: 'Hero Title', description: 'Unlock the "Hero" profile title', icon: '🦸', cost: 50, type: 'title' },
  { id: 'title_sage', name: 'Sage Title', description: 'Unlock the "Sage" profile title', icon: '🧙', cost: 100, type: 'title' },
  { id: 'icon_dragon', name: 'Dragon Icon', description: 'Unlock dragon avatar icon', icon: '🐉', cost: 75, type: 'icon' },
  { id: 'icon_phoenix', name: 'Phoenix Icon', description: 'Unlock phoenix avatar icon', icon: '🦅', cost: 120, type: 'icon' },
  { id: 'theme_gold', name: 'Golden Theme', description: 'Unlock the golden accent theme', icon: '✨', cost: 200, type: 'theme' },
];

export default function Habits() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('habits_init', false);
  const [habits, setHabits] = useLocalStorage<Habit[]>('habits', hasInit ? [] : exampleHabits);
  const [, setInit] = useLocalStorage('habits_init', true);
  const [gamification, setGamification] = useLocalStorage<GamificationState>('gamification', { totalXp: 0, level: 1, points: 0, unlockedRewards: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [view, setView] = useState<'quests' | 'heatmap' | 'badges' | 'shop'>('quests');

  // Editing
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly'>('daily');

  if (!hasInit) setInit(true);

  const totalXp = habits.reduce((s, h) => s + h.xp, 0);
  const level = getLevel(totalXp);

  const addHabit = () => {
    if (!title.trim()) return;
    const habit: Habit = {
      id: crypto.randomUUID(), title: title.trim(), frequency, color: 'hsl(245, 58%, 62%)',
      currentStreak: 0, longestStreak: 0, lastCompleted: null, xp: 0, completionDates: [],
      createdAt: new Date().toISOString(),
    };
    setHabits(prev => [habit, ...prev]);
    setTitle(''); setShowAdd(false);
  };

  const logCompletion = (id: string) => {
    const today = new Date().toDateString();
    const todayISO = new Date().toISOString().split('T')[0];
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const lastDay = h.lastCompleted ? new Date(h.lastCompleted).toDateString() : null;
      if (lastDay === today) return h;
      // Double-guard: also check completionDates array (prevents rapid double-click issues)
      if ((h.completionDates || []).includes(todayISO)) return h;
      const newStreak = h.currentStreak + 1;
      const xpBase = h.frequency === 'weekly' ? XP_PER_COMPLETION.weekly : XP_PER_COMPLETION.daily;
      const xpGain = xpBase + (newStreak >= 7 ? XP_STREAK_BONUS : 0);
      const newXp = (h.xp || 0) + xpGain;
      const dates = [...(h.completionDates || []), todayISO];

      // Check for new badges
      const updated = { ...h, currentStreak: newStreak, longestStreak: Math.max(newStreak, h.longestStreak), lastCompleted: new Date().toISOString(), xp: newXp, completionDates: dates };
      const existingBadgeIds = (h.badges || []).map(b => b.id);
      const newBadges: HabitBadge[] = [];
      BADGE_DEFS.forEach(bd => {
        if (!existingBadgeIds.includes(bd.id) && bd.check(updated)) {
          newBadges.push({ id: bd.id, name: bd.name, icon: bd.icon, description: bd.desc, unlockedAt: new Date().toISOString() });
          toast.success(`🏆 Badge unlocked: ${bd.name}!`);
        }
      });

      return { ...updated, badges: [...(h.badges || []), ...newBadges] };
    }));

    // Update global gamification
    setGamification(prev => {
      const h = habits.find(h => h.id === id);
      const xpGain = h?.frequency === 'weekly' ? XP_PER_COMPLETION.weekly : XP_PER_COMPLETION.daily;
      const newXp = prev.totalXp + xpGain;
      const newLevel = getLevel(newXp);
      const pointsGain = POINTS_PER_LEVEL;
      if (newLevel > prev.level) toast.success(`🎉 Level up! You're now level ${newLevel}!`);
      return { ...prev, totalXp: newXp, level: newLevel, points: prev.points + pointsGain };
    });
  };

  const buyReward = (reward: Reward) => {
    if (gamification.points < reward.cost) {
      toast.error('Not enough points!');
      return;
    }
    if (gamification.unlockedRewards.includes(reward.id)) {
      toast.info('Already owned!');
      return;
    }
    setGamification(prev => ({
      ...prev,
      points: prev.points - reward.cost,
      unlockedRewards: [...prev.unlockedRewards, reward.id],
    }));
    toast.success(`🎁 Unlocked: ${reward.name}!`);
  };

  const deleteHabit = (id: string) => {
    const backup = habits.find(h => h.id === id);
    const index = habits.findIndex(h => h.id === id);
    if (!backup) return;

    setHabits(prev => prev.filter(h => h.id !== id));
    toast.success('Habit deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setHabits(prev => {
            const newHabits = [...prev];
            newHabits.splice(index, 0, backup);
            return newHabits;
          });
        }
      }
    });
  };

  const startEditHabit = (h: Habit) => {
    setEditingHabitId(h.id);
    setEditTitle(h.title);
    setEditFrequency(h.frequency);
  };

  const saveEditHabit = () => {
    if (!editTitle.trim() || !editingHabitId) return;
    setHabits(prev => prev.map(h => h.id === editingHabitId ? {
      ...h,
      title: editTitle.trim(),
      frequency: editFrequency
    } : h));
    setEditingHabitId(null);
    toast.success('Habit updated');
  };

  const clearExamples = () => setHabits(prev => prev.filter(h => !h.isExample));

  // Heatmap data: last 12 weeks
  const heatmapData = useMemo(() => {
    const allDates = habits.flatMap(h => h.completionDates || []);
    const counts: Record<string, number> = {};
    allDates.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
    const weeks: { date: string; count: number }[][] = [];
    const today = new Date();
    for (let w = 11; w >= 0; w--) {
      const week: { date: string; count: number }[] = [];
      for (let d = 6; d >= 0; d--) {
        const dt = new Date(today);
        dt.setDate(today.getDate() - (w * 7 + d));
        const key = dt.toISOString().split('T')[0];
        week.push({ date: key, count: counts[key] || 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [habits]);

  const allBadges = habits.flatMap(h => (h.badges || []).map(b => ({ ...b, habitTitle: h.title })));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <PageOnboardingTooltips pageId="habits" />
      <div data-tour="habits-header" className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1">Habit Quests</h1>
        <Button data-tour="add-btn" size="sm" onClick={() => setShowAdd(!showAdd)} variant="ghost"><Plus className="w-5 h-5" /></Button>
      </div>

      {/* XP / Level Bar */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-bold">Level {level}</span>
              <p className="text-[10px] text-muted-foreground">{totalXp} XP total</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-warning">🪙 {gamification.points} pts</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Level {level}</span>
            <span>{xpForNextLevel(totalXp)} XP to next</span>
          </div>
          <Progress value={xpProgress(totalXp)} className="h-2" />
        </div>
      </div>

      {/* View Tabs */}
      <div data-tour="view-tabs" className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'quests', label: 'Quests', icon: Swords },
          { key: 'heatmap', label: 'Streaks', icon: Calendar },
          { key: 'badges', label: 'Badges', icon: Trophy },
          { key: 'shop', label: 'Shop', icon: ShoppingBag },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key as typeof view)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${view === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {habits.some(h => h.isExample) && view === 'quests' && (
        <button onClick={clearExamples} className="text-xs text-muted-foreground underline">Clear all examples</button>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Quest name" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-0" />
            <Select value={frequency} onValueChange={(v: 'daily' | 'weekly') => setFrequency(v)}>
              <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Quest</SelectItem>
                <SelectItem value="weekly">Weekly Quest</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={addHabit} className="flex-1" size="sm">Add Quest</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUESTS VIEW */}
      {view === 'quests' && (
        <div className="space-y-3">
          {habits.length === 0 && !showAdd && (
            <EmptyState
              icon={Swords}
              title="No quests yet"
              description="Start a habit to turn your daily routines into an RPG adventure."
              actionLabel="Add Quest"
              onAction={() => setShowAdd(true)}
            />
          )}

          {habits.map(habit => {
            const completedToday = habit.lastCompleted && new Date(habit.lastCompleted).toDateString() === new Date().toDateString();
            const habitLevel = getLevel(habit.xp || 0);
            return (
              <motion.div key={habit.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => logCompletion(habit.id)}
                    disabled={!!completedToday}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${completedToday ? 'bg-success/20' : 'bg-primary/15 active:scale-90'}`}
                  >
                    {completedToday ? <Star className="w-5 h-5 text-success" /> : <Swords className="w-5 h-5 text-primary" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{habit.title}</span>
                      {habit.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{habit.frequency}</span>
                      <span className="text-[10px] font-medium text-warning">🔥 {habit.currentStreak}d</span>
                      {habit.longestStreak > 0 && <span className="text-[10px] text-success">🏆 Best: {habit.longestStreak}d</span>}
                      <span className="text-[10px] text-primary">⚡ Lv.{habitLevel}</span>
                      <span className="text-[10px] text-muted-foreground">{habit.xp || 0} XP</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <button onClick={() => startEditHabit(habit)} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Edit</button>
                    <button onClick={() => deleteHabit(habit.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {editingHabitId === habit.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-3 space-y-3 border-t border-border/30 mt-3 overflow-hidden">
                      <Input placeholder="Habit name" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-secondary border-0 text-sm h-8" />
                      <Select value={editFrequency} onValueChange={(v: 'daily' | 'weekly') => setEditFrequency(v)}>
                        <SelectTrigger className="bg-secondary border-0 text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily Goal</SelectItem>
                          <SelectItem value="weekly">Weekly Goal</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button onClick={saveEditHabit} size="sm" className="flex-1 text-xs h-8">Save Changes</Button>
                        <Button onClick={() => setEditingHabitId(null)} variant="ghost" size="sm" className="text-xs h-8">Cancel</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Progress value={xpProgress(habit.xp || 0)} className="h-1.5" />
                {(habit.badges || []).length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {(habit.badges || []).map(b => (
                      <span key={b.id} className="text-xs bg-warning/15 text-warning px-2 py-0.5 rounded-full">{b.icon} {b.name}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* HEATMAP VIEW */}
      {view === 'heatmap' && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Streak Heatmap (12 weeks)</h2>
          <div className="flex gap-1 overflow-x-auto">
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(day => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} completions`}
                    className="w-4 h-4 rounded-sm transition-colors"
                    style={{
                      backgroundColor: day.count === 0
                        ? 'hsl(var(--secondary))'
                        : day.count === 1
                          ? 'hsl(var(--success) / 0.3)'
                          : day.count <= 3
                            ? 'hsl(var(--success) / 0.6)'
                            : 'hsl(var(--success))',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-secondary" />
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--success) / 0.3)' }} />
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--success) / 0.6)' }} />
            <div className="w-3 h-3 rounded-sm bg-success" />
            <span>More</span>
          </div>
        </div>
      )}

      {/* BADGES VIEW */}
      {view === 'badges' && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-warning" /> Badge Collection</h2>
          {allBadges.length === 0 && <p className="text-xs text-muted-foreground">Complete habits to earn badges!</p>}
          <div className="grid grid-cols-2 gap-2">
            {BADGE_DEFS.map(bd => {
              const earned = allBadges.find(b => b.id === bd.id);
              return (
                <div key={bd.id} className={`glass rounded-xl p-3 text-center space-y-1 ${earned ? '' : 'opacity-40'}`}>
                  <span className="text-2xl">{bd.icon}</span>
                  <p className="text-xs font-semibold">{bd.name}</p>
                  <p className="text-[10px] text-muted-foreground">{bd.desc}</p>
                  {earned && <p className="text-[10px] text-success">✓ Earned</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHOP VIEW */}
      {view === 'shop' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> Rewards Shop</h2>
            <span className="text-xs font-semibold text-warning">🪙 {gamification.points} pts</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {REWARDS.map(r => {
              const owned = gamification.unlockedRewards.includes(r.id);
              const canAfford = gamification.points >= r.cost;
              return (
                <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.description}</p>
                  </div>
                  {owned ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-success font-medium">Owned ✓</span>
                      <span className="text-[10px] text-primary">Active on Dashboard</span>
                    </div>
                  ) : (
                    <Button size="sm" variant={canAfford ? 'default' : 'secondary'} disabled={!canAfford} onClick={() => buyReward(r)} className="text-xs">
                      🪙 {r.cost}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

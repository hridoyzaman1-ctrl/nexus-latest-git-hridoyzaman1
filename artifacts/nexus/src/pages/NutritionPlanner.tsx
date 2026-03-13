import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, Trash2, Edit3, ChevronDown, ChevronRight,
  UtensilsCrossed, Apple, ChefHat, Calendar, BarChart3, ClipboardList,
  Flame, Beef, Wheat, Droplets, Leaf, X, Check, Download, RefreshCw,
  Clock, Users, Heart, Filter, Eye, BookOpen, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import EmptyState from '@/components/EmptyState';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import type {
  NutritionLog, Ingredient, MealRoutine, NutritionReport,
  FoodItem, FoodUnit, MealType, CuisineType, RoutinePeriod, CountryType, Recipe
} from '@/types/nutrition';
import { MEAL_TYPES, CUISINE_TYPES, FOOD_UNITS, INGREDIENT_CATEGORIES, DAILY_NUTRIENT_TARGETS } from '@/lib/nutrition/constants';
import { searchFoods, calculateNutrition } from '@/lib/nutrition/nutritionLookup';
import { findRecipesByIngredients, browseRecipes, type RecipeMatch } from '@/lib/nutrition/recipeEngine';
import { generateRoutine } from '@/lib/nutrition/routineGenerator';
import { generateReport } from '@/lib/nutrition/reportGenerator';
import { calculateFoodHealthScore, calculateDailyHealthScore, getHealthColor, getHealthLevel } from '@/lib/nutrition/healthScore';
import {
  getNutritionLogs, saveNutritionLog, deleteNutritionLog, getLogsByDate,
  getIngredients, saveIngredient, deleteIngredient,
  getRoutines, saveRoutine, deleteRoutine,
  getReports, saveReport, deleteReport,
  getCalorieGoal, setCalorieGoal,
  getCustomRecipes, saveCustomRecipe, deleteCustomRecipe
} from '@/lib/nutrition/storage';

type TabId = 'home' | 'log' | 'ingredients' | 'routine' | 'recipes' | 'reports' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: UtensilsCrossed },
  { id: 'log', label: 'Food Log', icon: ClipboardList },
  { id: 'ingredients', label: 'Pantry', icon: Apple },
  { id: 'routine', label: 'Planner', icon: Calendar },
  { id: 'recipes', label: 'Recipes', icon: ChefHat },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'history', label: 'History', icon: BookOpen },
];

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function NutritionRing({ value, max, size = 80, color = 'hsl(var(--primary))' }: { value: number; max: number; size?: number; color?: string }) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} opacity={0.3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
    </svg>
  );
}

function HealthMeter({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const level = getHealthLevel(score);
  const color = getHealthColor(level);
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${h} rounded-full bg-muted/30 overflow-hidden`}>
        <div className={`${h} rounded-full transition-all duration-500`} style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{score}</span>
    </div>
  );
}

function MacroBar({ label, value, target, color, icon: Icon }: { label: string; value: number; target: number; color: string; icon: React.ElementType }) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="flex items-center gap-1 text-muted-foreground"><Icon size={12} />{label}</span>
        <span className="font-medium">{Math.round(value)}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function NutritionPlanner() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const today = formatDate(new Date());

  const [logs, setLogs] = useState(() => getNutritionLogs());
  const [ingredients, setIngredients] = useState(() => getIngredients());
  const [routines, setRoutines] = useState(() => getRoutines());
  const [reports, setReports] = useState(() => getReports());
  const [calGoal, setCalGoal] = useState(() => getCalorieGoal());

  const todayLogs = useMemo(() => logs.filter(l => l.date === today), [logs, today]);
  const todayNutrition = useMemo(() => todayLogs.reduce(
    (a, l) => ({ calories: a.calories + l.nutrition.calories, protein: a.protein + l.nutrition.protein, carbs: a.carbs + l.nutrition.carbs, fat: a.fat + l.nutrition.fat, fiber: a.fiber + l.nutrition.fiber }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  ), [todayLogs]);
  const todayHealth = useMemo(() => todayLogs.length > 0 ? calculateDailyHealthScore(todayNutrition) : null, [todayLogs, todayNutrition]);


  const refreshData = () => {
    setLogs(getNutritionLogs());
    setIngredients(getIngredients());
    setRoutines(getRoutines());
    setReports(getReports());
    setCalGoal(getCalorieGoal());
  };



  return (
    <PageTransition>
      <PageOnboardingTooltips pageId="nutrition" />
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-30 glass-strong border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1" data-tour="nutrition-header">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-orange-500" /> Nutrition Planner
              </h1>
            </div>

          </div>
          <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}>
                <tab.icon size={14} />{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {activeTab === 'home' && <HomeTab todayNutrition={todayNutrition} todayLogs={todayLogs} todayHealth={todayHealth} calGoal={calGoal} setActiveTab={setActiveTab} />}
              {activeTab === 'log' && <div data-tour="nutrition-log"><FoodLogTab today={today} todayLogs={todayLogs} onUpdate={refreshData} /></div>}
              {activeTab === 'ingredients' && <IngredientsTab ingredients={ingredients} onUpdate={refreshData} />}
              {activeTab === 'routine' && <div data-tour="nutrition-planner"><RoutineTab calGoal={calGoal} setCalGoal={(g) => { setCalorieGoal(g); setCalGoal(g); }} onUpdate={refreshData} /></div>}
              {activeTab === 'recipes' && <div data-tour="nutrition-recipes"><RecipesTab ingredients={ingredients} onUpdate={refreshData} /></div>}
              {activeTab === 'reports' && <div data-tour="nutrition-reports"><ReportsTab reports={reports} onUpdate={refreshData} /></div>}
              {activeTab === 'history' && <HistoryTab routines={routines} reports={reports} onUpdate={refreshData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </PageTransition>
  );
}

function HomeTab({ todayNutrition, todayLogs, todayHealth, calGoal, setActiveTab }: {
  todayNutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  todayLogs: NutritionLog[]; todayHealth: ReturnType<typeof calculateDailyHealthScore> | null;
  calGoal: number; setActiveTab: (t: TabId) => void;
}) {
  const t = DAILY_NUTRIENT_TARGETS;
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Today's Intake</h2>
          <span className="text-xs text-muted-foreground">{todayLogs.length} meals logged</span>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <NutritionRing value={todayNutrition.calories} max={calGoal} size={90} color="hsl(25, 95%, 53%)" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{todayNutrition.calories}</span>
              <span className="text-[10px] text-muted-foreground">/ {calGoal}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <MacroBar label="Protein" value={todayNutrition.protein} target={t.protein} color="hsl(280, 65%, 60%)" icon={Beef} />
            <MacroBar label="Carbs" value={todayNutrition.carbs} target={t.carbs} color="hsl(38, 92%, 50%)" icon={Wheat} />
            <MacroBar label="Fat" value={todayNutrition.fat} target={t.fat} color="hsl(0, 72%, 51%)" icon={Droplets} />
            <MacroBar label="Fiber" value={todayNutrition.fiber} target={t.fiber} color="hsl(152, 69%, 45%)" icon={Leaf} />
          </div>
        </div>
        {todayHealth && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Health Score</span>
              <span className="font-semibold" style={{ color: getHealthColor(todayHealth.level) }}>{todayHealth.label}</span>
            </div>
            <HealthMeter score={todayHealth.score} size="md" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Log Food', icon: Plus, tab: 'log' as TabId, color: 'text-orange-500' },
          { label: 'Browse Recipes', icon: ChefHat, tab: 'recipes' as TabId, color: 'text-green-500' },
          { label: 'Create Plan', icon: Calendar, tab: 'routine' as TabId, color: 'text-blue-500' },
          { label: 'View Reports', icon: BarChart3, tab: 'reports' as TabId, color: 'text-purple-500' },
        ].map(a => (
          <button key={a.label} onClick={() => setActiveTab(a.tab)} className="glass rounded-xl p-4 text-left hover:bg-muted/30 transition-all group">
            <a.icon size={24} className={`${a.color} mb-2 group-hover:scale-110 transition-transform`} />
            <p className="text-sm font-medium">{a.label}</p>
          </button>
        ))}
      </div>

      {todayLogs.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm">Today's Meals</h3>
          <div className="space-y-2">
            {todayLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-sm font-medium">{log.foodName}</p>
                  <p className="text-xs text-muted-foreground">{MEAL_TYPES.find(m => m.value === log.mealType)?.emoji} {log.quantity} {log.unit}</p>
                </div>
                <span className="text-sm font-semibold text-orange-500">{log.nutrition.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FoodLogTab({ today, todayLogs, onUpdate }: { today: string; todayLogs: NutritionLog[]; onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<FoodUnit>('serving');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [editingId, setEditingId] = useState<string | null>(null);

  const searchResults = useMemo(() => search.length >= 2 ? searchFoods(search, 10) : [], [search]);

  const selectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setQuantity(food.defaultQuantity);
    setUnit(food.defaultUnit);
    setSearch(food.name);
  };

  const preview = selectedFood ? calculateNutrition(selectedFood, quantity, unit) : null;

  const handleSave = () => {
    if (!selectedFood || !preview) return;
    const log: NutritionLog = {
      id: editingId || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      foodName: selectedFood.name,
      foodId: selectedFood.id,
      quantity, unit, mealType,
      nutrition: preview,
      date: today,
      time: new Date().toTimeString().slice(0, 5),
      createdAt: new Date().toISOString(),
    };
    saveNutritionLog(log);
    toast.success(editingId ? 'Entry updated' : 'Food logged');
    resetForm();
    onUpdate();
  };

  const resetForm = () => {
    setShowAdd(false);
    setSearch('');
    setSelectedFood(null);
    setQuantity(1);
    setUnit('serving');
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteNutritionLog(id);
    toast.success('Entry deleted');
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Food Log</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add Food
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => { setSearch(e.target.value); setSelectedFood(null); }}
                  placeholder="Search food (e.g. rice, chicken, dal)..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              {search.length >= 2 && !selectedFood && searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border/30 divide-y divide-border/20">
                  {searchResults.map(food => (
                    <button key={food.id} onClick={() => selectFood(food)} className="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors">
                      <p className="text-sm font-medium">{food.name}</p>
                      <p className="text-xs text-muted-foreground">{food.per100g.calories} kcal/100g · {food.category}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedFood && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                      <input type="number" min={0.1} step={0.5} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                      <select value={unit} onChange={e => setUnit(e.target.value as FoodUnit)}
                        className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                        {FOOD_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Meal</label>
                      <select value={mealType} onChange={e => setMealType(e.target.value as MealType)}
                        className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                        {MEAL_TYPES.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {preview && (
                    <div className="bg-muted/20 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Nutrition Preview</span>
                        <span className="text-lg font-bold text-orange-500">{preview.calories} kcal</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div><p className="font-semibold text-purple-500">{preview.protein}g</p><p className="text-muted-foreground">Protein</p></div>
                        <div><p className="font-semibold text-yellow-500">{preview.carbs}g</p><p className="text-muted-foreground">Carbs</p></div>
                        <div><p className="font-semibold text-red-500">{preview.fat}g</p><p className="text-muted-foreground">Fat</p></div>
                        <div><p className="font-semibold text-green-500">{preview.fiber}g</p><p className="text-muted-foreground">Fiber</p></div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={resetForm} className="flex-1 py-2 rounded-xl border border-border/50 text-sm font-medium">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1">
                      <Check size={16} /> {editingId ? 'Update' : 'Log Food'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {todayLogs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No food logged today" description="Tap 'Add Food' to start tracking your meals" />
      ) : (
        <div className="space-y-2">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(mt => {
            const mealLogs = todayLogs.filter(l => l.mealType === mt);
            if (mealLogs.length === 0) return null;
            const mealInfo = MEAL_TYPES.find(m => m.value === mt)!;
            const totalCal = mealLogs.reduce((s, l) => s + l.nutrition.calories, 0);
            return (
              <div key={mt} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{mealInfo.emoji} {mealInfo.label}</span>
                  <span className="text-xs font-medium text-orange-500">{totalCal} kcal</span>
                </div>
                {mealLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between py-1.5 border-t border-border/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{log.foodName}</p>
                      <p className="text-xs text-muted-foreground">{log.quantity} {log.unit} · {log.nutrition.calories} kcal</p>
                    </div>
                    <button onClick={() => handleDelete(log.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IngredientsTab({ ingredients, onUpdate }: { ingredients: Ingredient[]; onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [iUnit, setIUnit] = useState<FoodUnit>('g');
  const [category, setCategory] = useState('other');
  const [filterCat, setFilterCat] = useState('');

  const filtered = filterCat ? ingredients.filter(i => i.category === filterCat) : ingredients;
  const categories = [...new Set(ingredients.map(i => i.category))].sort();

  const handleAdd = () => {
    if (!name.trim()) { toast.error('Enter ingredient name'); return; }
    const ing: Ingredient = {
      id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(), quantity: qty, unit: iUnit, category,
      addedAt: new Date().toISOString(),
    };
    saveIngredient(ing);
    toast.success('Ingredient added');
    setName(''); setQty(1); setShowAdd(false);
    onUpdate();
  };

  const handleRemove = (id: string) => {
    deleteIngredient(id);
    toast.success('Ingredient removed');
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ingredient Pantry</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass rounded-2xl p-4 space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ingredient name..."
                className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                  <input type="number" min={0.1} step={0.5} value={qty} onChange={e => setQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                  <select value={iUnit} onChange={e => setIUnit(e.target.value as FoodUnit)}
                    className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                    {FOOD_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
                    {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl border border-border/50 text-sm font-medium">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setFilterCat('')} className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${!filterCat ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}>All ({ingredients.length})</button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)} className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap capitalize ${filterCat === c ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Apple} title="No ingredients" description="Add ingredients to get recipe suggestions" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(ing => (
            <div key={ing.id} className="glass rounded-xl p-3 relative group">
              <button onClick={() => handleRemove(ing.id)} className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                <X size={14} />
              </button>
              <p className="text-sm font-medium truncate pr-6">{ing.name}</p>
              <p className="text-xs text-muted-foreground">{ing.quantity} {ing.unit}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground capitalize mt-1 inline-block">{ing.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoutineTab({ calGoal, setCalGoal, onUpdate }: { calGoal: number; setCalGoal: (g: number) => void; onUpdate: () => void }) {
  const [period, setPeriod] = useState<RoutinePeriod>('weekly');
  const [cuisine, setCuisine] = useState<CuisineType>('bangladeshi');
  const [country, setCountry] = useState<CountryType>('bangladesh');
  const [customDays, setCustomDays] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [previewRoutine, setPreviewRoutine] = useState<MealRoutine | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const routine = generateRoutine({ period, cuisine, country, calorieGoal: calGoal, customDays });
      setPreviewRoutine(routine);
      setGenerating(false);
      setExpandedDay(0);
    }, 500);
  };

  const handleSave = () => {
    if (!previewRoutine) return;
    saveRoutine(previewRoutine);
    toast.success('Routine saved!');
    setPreviewRoutine(null);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Meal Planner</h2>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Calorie Goal (daily)</label>
          <input type="number" min={1000} max={5000} step={100} value={calGoal} onChange={e => setCalGoal(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value as RoutinePeriod)}
              className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {period === 'custom' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Days</label>
              <input type="number" min={1} max={90} value={customDays} onChange={e => setCustomDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cuisine</label>
            <select value={cuisine} onChange={e => setCuisine(e.target.value as CuisineType)}
              className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm">
              {CUISINE_TYPES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {generating ? <><RefreshCw size={16} className="animate-spin" /> Generating...</> : <><Calendar size={16} /> Generate Plan</>}
        </button>
      </div>

      {previewRoutine && (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{previewRoutine.name}</h3>
              <HealthMeter score={previewRoutine.healthScore} />
            </div>
            <p className="text-xs text-muted-foreground mb-3">{previewRoutine.days.length} days · {previewRoutine.calorieGoal} kcal/day goal</p>
            <div className="flex gap-2">
              <button onClick={() => { setPreviewRoutine(null); handleGenerate(); }} className="flex-1 py-2 rounded-xl border border-border/50 text-sm font-medium flex items-center justify-center gap-1">
                <RefreshCw size={14} /> Regenerate
              </button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1">
                <Check size={14} /> Save Plan
              </button>
            </div>
          </div>

          {previewRoutine.days.map((day, di) => (
            <div key={di} className="glass rounded-xl overflow-hidden">
              <button onClick={() => setExpandedDay(expandedDay === di ? null : di)}
                className="w-full flex items-center justify-between p-3 text-left">
                <div>
                  <p className="text-sm font-semibold">{day.dayLabel}</p>
                  <p className="text-xs text-muted-foreground">{day.totalCalories} kcal</p>
                </div>
                {expandedDay === di ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <AnimatePresence>
                {expandedDay === di && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2">
                      {day.meals.map((meal, mi) => (
                        <div key={mi} className="bg-muted/20 rounded-lg p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium capitalize">{MEAL_TYPES.find(m => m.value === meal.mealType)?.emoji} {meal.mealType}</span>
                            <span className="text-xs text-orange-500 font-medium">{meal.calories} kcal</span>
                          </div>
                          {meal.recipe && (
                            <p className="text-sm mt-0.5">{meal.recipe.imageEmoji} {meal.recipe.name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeForm({ initial, onSave, onCancel }: {
  initial?: Recipe;
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [rCuisine, setRCuisine] = useState<CuisineType>(initial?.cuisine || 'global');
  const [rMealType, setRMealType] = useState<MealType>(initial?.mealType || 'lunch');
  const [servings, setServings] = useState(initial?.servings || 2);
  const [prepTime, setPrepTime] = useState(initial?.prepTimeMin || 15);
  const [cookTime, setCookTime] = useState(initial?.cookTimeMin || 30);
  const [calories, setCalories] = useState(initial?.calories || 300);
  const [protein, setProtein] = useState(initial?.nutrition.protein || 15);
  const [carbs, setCarbs] = useState(initial?.nutrition.carbs || 30);
  const [fat, setFat] = useState(initial?.nutrition.fat || 10);
  const [fiber, setFiber] = useState(initial?.nutrition.fiber || 3);
  const [healthScore, setHealthScore] = useState(initial?.healthScore || 65);
  const [emoji, setEmoji] = useState(initial?.imageEmoji || '🍽️');
  const [tags, setTags] = useState(initial?.tags.join(', ') || '');
  const [rIngredients, setRIngredients] = useState<{ name: string; quantity: number; unit: FoodUnit }[]>(
    initial?.ingredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })) || [{ name: '', quantity: 1, unit: 'g' as FoodUnit }]
  );
  const [steps, setSteps] = useState<string[]>(
    initial?.steps.map(s => s.instruction) || ['']
  );

  const addIngredient = () => setRIngredients([...rIngredients, { name: '', quantity: 1, unit: 'g' }]);
  const removeIngredient = (i: number) => setRIngredients(rIngredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: string, val: string | number) => {
    const updated = [...rIngredients];
    (updated[i] as any)[field] = val;
    setRIngredients(updated);
  };
  const addStep = () => setSteps([...steps, '']);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, val: string) => {
    const updated = [...steps];
    updated[i] = val;
    setSteps(updated);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Recipe name is required'); return; }
    const validIngredients = rIngredients.filter(i => i.name.trim());
    if (validIngredients.length === 0) { toast.error('Add at least one ingredient'); return; }
    const validSteps = steps.filter(s => s.trim());
    if (validSteps.length === 0) { toast.error('Add at least one step'); return; }

    const recipe: Recipe = {
      id: initial?.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      cuisine: rCuisine,
      mealType: rMealType,
      servings,
      prepTimeMin: prepTime,
      cookTimeMin: cookTime,
      calories,
      nutrition: { calories, protein, carbs, fat, fiber },
      healthScore,
      ingredients: validIngredients.map(i => ({ name: i.name.trim(), quantity: i.quantity, unit: i.unit })),
      steps: validSteps.map((s, i) => ({ step: i + 1, instruction: s.trim() })),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      imageEmoji: emoji || '🍽️',
    };
    onSave(recipe);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm";
  const labelCls = "text-xs text-muted-foreground mb-1 block";

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold text-sm">{initial ? 'Edit Recipe' : 'Create Custom Recipe'}</h3>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className={labelCls}>Recipe Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's Special Curry" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Emoji</label>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} className={`${inputCls} w-16 text-center text-lg`} maxLength={4} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Cuisine</label>
          <select value={rCuisine} onChange={e => setRCuisine(e.target.value as CuisineType)} className={inputCls}>
            {CUISINE_TYPES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Meal Type</label>
          <select value={rMealType} onChange={e => setRMealType(e.target.value as MealType)} className={inputCls}>
            {MEAL_TYPES.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Servings</label>
          <input type="number" min={1} value={servings} onChange={e => setServings(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Prep (min)</label>
          <input type="number" min={0} value={prepTime} onChange={e => setPrepTime(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cook (min)</label>
          <input type="number" min={0} value={cookTime} onChange={e => setCookTime(Number(e.target.value))} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Nutrition (per serving)</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          <div>
            <span className="text-[10px] text-muted-foreground">Cal</span>
            <input type="number" min={0} value={calories} onChange={e => setCalories(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
          </div>
          <div>
            <span className="text-[10px] text-purple-500">Protein</span>
            <input type="number" min={0} step={0.5} value={protein} onChange={e => setProtein(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
          </div>
          <div>
            <span className="text-[10px] text-yellow-500">Carbs</span>
            <input type="number" min={0} step={0.5} value={carbs} onChange={e => setCarbs(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
          </div>
          <div>
            <span className="text-[10px] text-red-500">Fat</span>
            <input type="number" min={0} step={0.5} value={fat} onChange={e => setFat(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
          </div>
          <div>
            <span className="text-[10px] text-green-500">Fiber</span>
            <input type="number" min={0} step={0.5} value={fiber} onChange={e => setFiber(Number(e.target.value))} className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Health Score (0-100)</label>
        <input type="range" min={0} max={100} value={healthScore} onChange={e => setHealthScore(Number(e.target.value))} className="w-full accent-primary" />
        <div className="flex justify-between text-xs"><span className="text-red-500">Unhealthy</span><span className="font-medium">{healthScore}</span><span className="text-green-500">Healthy</span></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>Ingredients</label>
          <button onClick={addIngredient} className="text-xs text-primary flex items-center gap-0.5"><Plus size={12} /> Add</button>
        </div>
        <div className="space-y-1.5">
          {rIngredients.map((ing, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient name"
                className="flex-1 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
              <input type="number" min={0.1} step={0.5} value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
              <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}
                className="w-16 px-1 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs">
                {FOOD_UNITS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
              {rIngredients.length > 1 && (
                <button onClick={() => removeIngredient(i)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>Steps</label>
          <button onClick={addStep} className="text-xs text-primary flex items-center gap-0.5"><Plus size={12} /> Add Step</button>
        </div>
        <div className="space-y-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="text-xs font-semibold mt-2 min-w-[20px]">{i + 1}.</span>
              <textarea value={step} onChange={e => updateStep(i, e.target.value)} placeholder={`Step ${i + 1}...`} rows={2}
                className="flex-1 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs resize-none" />
              {steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive mt-1"><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Tags (comma-separated)</label>
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. spicy, protein, comfort-food" className={inputCls} />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-border/50 text-sm font-medium">Cancel</button>
        <button onClick={handleSubmit} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1">
          <Check size={16} /> {initial ? 'Save Changes' : 'Create Recipe'}
        </button>
      </div>
    </div>
  );
}

function RecipesTab({ ingredients, onUpdate }: { ingredients: Ingredient[]; onUpdate: () => void }) {
  const [cuisine, setCuisine] = useState<CuisineType>('global');
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [searchQ, setSearchQ] = useState('');
  const [mode, setMode] = useState<'browse' | 'match'>('browse');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const customRecipeIds = useMemo(() => new Set(getCustomRecipes().map(r => r.id)), [refreshKey]);

  const recipes = useMemo(() => {
    if (mode === 'match' && ingredients.length > 0) {
      return findRecipesByIngredients(ingredients, {
        cuisine: cuisine !== 'global' ? cuisine : undefined,
        mealType: mealType || undefined,
      });
    }
    return browseRecipes({
      cuisine: cuisine !== 'global' ? cuisine : undefined,
      mealType: mealType || undefined,
      search: searchQ || undefined,
    }).map(r => ({ recipe: r, matchedIngredients: [], missingIngredients: [], matchPercentage: 0, isCustom: customRecipeIds.has(r.id) } as RecipeMatch));
  }, [mode, cuisine, mealType, searchQ, ingredients, refreshKey, customRecipeIds]);

  const handleSaveCustom = (recipe: Recipe) => {
    saveCustomRecipe(recipe);
    toast.success(editingRecipe ? 'Recipe updated' : 'Custom recipe created');
    setShowCreate(false);
    setEditingRecipe(null);
    setRefreshKey(k => k + 1);
    onUpdate();
  };

  const handleDeleteCustom = (id: string) => {
    deleteCustomRecipe(id);
    toast.success('Custom recipe deleted');
    setExpandedId(null);
    setRefreshKey(k => k + 1);
    onUpdate();
  };

  const handleEditCustom = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowCreate(true);
    setExpandedId(null);
  };

  if (showCreate) {
    return (
      <div className="space-y-4">
        <RecipeForm
          initial={editingRecipe || undefined}
          onSave={handleSaveCustom}
          onCancel={() => { setShowCreate(false); setEditingRecipe(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Recipes</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
            <button onClick={() => setMode('browse')} className={`px-2 py-1 rounded-md text-xs font-medium ${mode === 'browse' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Browse</button>
            <button onClick={() => setMode('match')} className={`px-2 py-1 rounded-md text-xs font-medium ${mode === 'match' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Match</button>
          </div>
          <button onClick={() => { setShowCreate(true); setEditingRecipe(null); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
            <Plus size={14} /> Create
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={cuisine} onChange={e => setCuisine(e.target.value as CuisineType)}
          className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs">
          <option value="global">All Cuisines</option>
          {CUISINE_TYPES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={mealType} onChange={e => setMealType(e.target.value as MealType | '')}
          className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs">
          <option value="">All Meals</option>
          {MEAL_TYPES.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
        </select>
        {mode === 'browse' && (
          <div className="relative flex-1 min-w-[120px]">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..."
              className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs" />
          </div>
        )}
      </div>

      {recipes.length === 0 ? (
        <EmptyState icon={ChefHat} title="No recipes found" description="Try different filters, add ingredients, or create a custom recipe" />
      ) : (
        <div className="space-y-3">
          {recipes.map(({ recipe, matchPercentage, missingIngredients, isCustom }) => {
            const isCustomRecipe = isCustom || customRecipeIds.has(recipe.id);
            return (
              <div key={recipe.id} className={`glass rounded-xl overflow-hidden ${isCustomRecipe ? 'ring-1 ring-primary/30' : ''}`}>
                <button onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)} className="w-full text-left p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{recipe.imageEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{recipe.name}</p>
                        {isCustomRecipe && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold shrink-0">CUSTOM</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5"><Clock size={10} />{recipe.prepTimeMin + recipe.cookTimeMin}m</span>
                        <span className="flex items-center gap-0.5"><Users size={10} />{recipe.servings}</span>
                        <span className="flex items-center gap-0.5"><Flame size={10} />{recipe.calories} kcal</span>
                      </div>
                      <div className="mt-1.5 w-32"><HealthMeter score={recipe.healthScore} /></div>
                      {mode === 'match' && matchPercentage > 0 && (
                        <p className="text-xs mt-1">
                          <span className="text-green-500 font-medium">{matchPercentage}% match</span>
                          {missingIngredients.length > 0 && <span className="text-muted-foreground"> · missing: {missingIngredients.slice(0, 3).join(', ')}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 capitalize">{recipe.cuisine}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 capitalize">{recipe.mealType}</span>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === recipe.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 border-t border-border/20 pt-2 space-y-3">
                        <div>
                          <p className="text-xs font-semibold mb-1.5">Ingredients</p>
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.ingredients.map((ing, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted/40">{ing.quantity} {ing.unit} {ing.name}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1.5">Steps</p>
                          <ol className="space-y-1.5">
                            {recipe.steps.map(s => (
                              <li key={s.step} className="text-xs text-muted-foreground flex gap-2">
                                <span className="font-semibold text-foreground min-w-[16px]">{s.step}.</span>
                                {s.instruction}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs bg-muted/20 rounded-lg p-2">
                          <div><p className="font-semibold text-purple-500">{recipe.nutrition.protein}g</p><p className="text-muted-foreground">Protein</p></div>
                          <div><p className="font-semibold text-yellow-500">{recipe.nutrition.carbs}g</p><p className="text-muted-foreground">Carbs</p></div>
                          <div><p className="font-semibold text-red-500">{recipe.nutrition.fat}g</p><p className="text-muted-foreground">Fat</p></div>
                          <div><p className="font-semibold text-green-500">{recipe.nutrition.fiber}g</p><p className="text-muted-foreground">Fiber</p></div>
                        </div>
                        {recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.map((tag, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">#{tag}</span>
                            ))}
                          </div>
                        )}
                        {isCustomRecipe && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleEditCustom(recipe)}
                              className="flex-1 py-1.5 rounded-lg border border-border/50 text-xs font-medium flex items-center justify-center gap-1 hover:bg-muted/30">
                              <Edit3 size={12} /> Edit
                            </button>
                            <button onClick={() => handleDeleteCustom(recipe.id)}
                              className="flex-1 py-1.5 rounded-lg border border-destructive/30 text-xs font-medium flex items-center justify-center gap-1 text-destructive hover:bg-destructive/10">
                              <Trash2 size={12} /> Delete
                            </button>
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
      )}
    </div>
  );
}

function ReportsTab({ reports, onUpdate }: { reports: NutritionReport[]; onUpdate: () => void }) {
  const [rangeType, setRangeType] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [generating, setGenerating] = useState(false);
  const [viewReport, setViewReport] = useState<NutritionReport | null>(null);

  const handleGenerate = () => {
    let start = startDate;
    let end = endDate;
    const now = new Date();
    if (rangeType === 'week') {
      const s = new Date(now); s.setDate(s.getDate() - 7);
      start = formatDate(s); end = formatDate(now);
    } else if (rangeType === 'month') {
      const s = new Date(now); s.setMonth(s.getMonth() - 1);
      start = formatDate(s); end = formatDate(now);
    }
    setGenerating(true);
    setTimeout(() => {
      const report = generateReport(start, end);
      saveReport(report);
      setViewReport(report);
      setGenerating(false);
      onUpdate();
      toast.success('Report generated');
    }, 400);
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    if (viewReport?.id === id) setViewReport(null);
    toast.success('Report deleted');
    onUpdate();
  };

  if (viewReport) {
    return <ReportView report={viewReport} onBack={() => setViewReport(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Nutrition Reports</h2>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {(['week', 'month', 'custom'] as const).map(r => (
            <button key={r} onClick={() => setRangeType(r)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize ${rangeType === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{r === 'week' ? 'Last Week' : r === 'month' ? 'Last Month' : 'Custom'}</button>
          ))}
        </div>
        {rangeType === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-2 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm" />
            </div>
          </div>
        )}
        <button onClick={handleGenerate} disabled={generating}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {generating ? <><RefreshCw size={16} className="animate-spin" /> Generating...</> : <><BarChart3 size={16} /> Generate Report</>}
        </button>
      </div>

      {reports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Saved Reports</h3>
          {reports.map(report => (
            <div key={report.id} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewReport(report)}>
                  <p className="text-sm font-medium truncate">{report.title}</p>
                  <p className="text-xs text-muted-foreground">{report.totalMealsLogged} meals · Score: {report.healthScore}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewReport(report)} className="p-1.5 rounded-lg hover:bg-muted/50"><Eye size={14} /></button>
                  <button onClick={() => handleDelete(report.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportView({ report, onBack }: { report: NutritionReport; onBack: () => void }) {
  const t = DAILY_NUTRIENT_TARGETS;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted/50"><ArrowLeft size={18} /></button>
        <h2 className="font-semibold text-sm flex-1 truncate">{report.title}</h2>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">{report.periodStart} to {report.periodEnd}</p>
            <p className="text-xs text-muted-foreground">{report.totalMealsLogged} meals over {report.totalDays} days</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: getHealthColor(report.healthLevel) }}>{report.healthScore}</p>
            <p className="text-xs text-muted-foreground">Health Score</p>
          </div>
        </div>
        <HealthMeter score={report.healthScore} size="md" />
      </div>

      <div className="glass rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-semibold">Daily Averages</h3>
        <MacroBar label="Calories" value={report.avgCalories} target={t.calories} color="hsl(25, 95%, 53%)" icon={Flame} />
        <MacroBar label="Protein" value={report.avgProtein} target={t.protein} color="hsl(280, 65%, 60%)" icon={Beef} />
        <MacroBar label="Carbs" value={report.avgCarbs} target={t.carbs} color="hsl(38, 92%, 50%)" icon={Wheat} />
        <MacroBar label="Fat" value={report.avgFat} target={t.fat} color="hsl(0, 72%, 51%)" icon={Droplets} />
        <MacroBar label="Fiber" value={report.avgFiber} target={t.fiber} color="hsl(152, 69%, 45%)" icon={Leaf} />
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-2">Meal Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {MEAL_TYPES.map(m => (
            <div key={m.value}>
              <p className="text-lg font-bold">{report.mealTypeBreakdown[m.value]}</p>
              <p className="text-xs text-muted-foreground">{m.emoji} {m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {report.insights.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-2">Insights</h3>
          <ul className="space-y-1.5">
            {report.insights.map((ins, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-primary">•</span>{ins}</li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Heart size={14} className="text-red-500" /> Recommendations</h3>
          <ul className="space-y-1.5">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-green-500">✓</span>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ routines, reports, onUpdate }: { routines: MealRoutine[]; reports: NutritionReport[]; onUpdate: () => void }) {
  const [view, setView] = useState<'routines' | 'reports'>('routines');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDeleteRoutine = (id: string) => {
    deleteRoutine(id);
    toast.success('Routine deleted');
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">History</h2>

      <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
        <button onClick={() => setView('routines')} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${view === 'routines' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
          Saved Routines ({routines.length})
        </button>
        <button onClick={() => setView('reports')} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${view === 'reports' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
          Reports ({reports.length})
        </button>
      </div>

      {view === 'routines' && (
        routines.length === 0 ? (
          <EmptyState icon={Calendar} title="No saved routines" description="Generate a meal plan in the Planner tab" />
        ) : (
          <div className="space-y-2">
            {routines.map(r => (
              <div key={r.id} className="glass rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.days.length} days · {r.cuisine} · {r.calorieGoal} kcal/day</p>
                    <div className="w-24 mt-1"><HealthMeter score={r.healthScore} /></div>
                  </div>
                  <button onClick={() => handleDeleteRoutine(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
                <AnimatePresence>
                  {expandedId === r.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2">
                        {r.days.map((day, di) => (
                          <div key={di} className="bg-muted/20 rounded-lg p-2.5">
                            <p className="text-xs font-semibold mb-1">{day.dayLabel} — {day.totalCalories} kcal</p>
                            {day.meals.map((meal, mi) => (
                              <p key={mi} className="text-xs text-muted-foreground">
                                {MEAL_TYPES.find(m => m.value === meal.mealType)?.emoji} {meal.recipe ? meal.recipe.name : 'Custom'} ({meal.calories} kcal)
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )
      )}

      {view === 'reports' && (
        reports.length === 0 ? (
          <EmptyState icon={BarChart3} title="No reports" description="Generate a report in the Reports tab" />
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="glass rounded-xl p-3">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.totalMealsLogged} meals · Score: {r.healthScore} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

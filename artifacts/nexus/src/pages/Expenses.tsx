import { useState, useEffect } from 'react';
import PageOnboardingTooltips from '@/components/PageOnboardingTooltips';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Expense } from '@/types';
import { exampleExpenses } from '@/lib/examples';
import { ArrowLeft, Plus, Trash2, X, PieChart, TrendingUp, Settings2, Receipt, DollarSign, FileText, Edit2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetDonutChart from '@/components/BudgetDonutChart';
import ExpenseReportDialog from '@/components/ExpenseReportDialog';
import CategoryBudgetLimits from '@/components/CategoryBudgetLimits';
import MonthlyTrendsChart from '@/components/MonthlyTrendsChart';
import { getLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import EmptyState from '@/components/EmptyState';

const catIcons: Record<string, { emoji: string; color: string }> = {
  food: { emoji: '🍔', color: 'hsl(38, 92%, 50%)' },
  transport: { emoji: '🚗', color: 'hsl(199, 89%, 48%)' },
  entertainment: { emoji: '🎬', color: 'hsl(291, 64%, 42%)' },
  shopping: { emoji: '🛍️', color: 'hsl(340, 82%, 52%)' },
  bills: { emoji: '📄', color: 'hsl(0, 84%, 60%)' },
  other: { emoji: '📦', color: 'hsl(220, 10%, 55%)' },
};

export default function Expenses() {
  const navigate = useNavigate();
  const [hasInit] = useLocalStorage('expenses_init', false);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', hasInit ? [] : exampleExpenses);
  const [monthlyIncome, setMonthlyIncome] = useLocalStorage<number>('monthly_income', 0);
  const [historicalIncome, setHistoricalIncome] = useLocalStorage<Record<string, number>>('historical_income', {});
  const [, setInit] = useLocalStorage('expenses_init', true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('food');
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => { if (!hasInit) setInit(true); }, [hasInit, setInit]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const addExpense = () => {
    if (!title.trim() || !amount) return;
    const newAmount = parseFloat(amount);
    const newExpense: Expense = { id: crypto.randomUUID(), title: title.trim(), amount: newAmount, category, date: new Date().toISOString(), createdAt: new Date().toISOString() };

    // Read fresh from localStorage to avoid stale cross-tab state
    const budgets = getLocalStorage<Record<string, number>>('category_budgets', {});
    const catLimit = budgets[category] || 0;
    if (catLimit > 0) {
      const currentSpent = expenses.filter(e => e.category === category).reduce((s, e) => s + e.amount, 0);
      const afterSpent = currentSpent + newAmount;
      if (afterSpent > catLimit) {
        toast({ title: `⚠️ ${category.charAt(0).toUpperCase() + category.slice(1)} budget exceeded!`, description: `Spent $${afterSpent.toFixed(2)} of $${catLimit.toFixed(2)} limit`, variant: 'destructive' });
      } else if (afterSpent >= catLimit * 0.8) {
        toast({ title: `⚠️ Approaching ${category} limit`, description: `$${afterSpent.toFixed(2)} of $${catLimit.toFixed(2)} (${((afterSpent / catLimit) * 100).toFixed(0)}%)` });
      }
    }

    setExpenses(prev => [newExpense, ...prev]);
    setTitle(''); setAmount(''); setShowAdd(false);
  };

  const deleteExpense = (id: string) => {
    const backup = expenses.find(e => e.id === id);
    const index = expenses.findIndex(e => e.id === id);
    if (!backup) return;

    setExpenses(prev => prev.filter(e => e.id !== id));
    sonnerToast.success('Expense deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setExpenses(prev => {
            const newExpenses = [...prev];
            newExpenses.splice(index, 0, backup);
            return newExpenses;
          });
        }
      }
    });
  };

  const startEditIncome = () => {
    setIncomeInput(monthlyIncome > 0 ? monthlyIncome.toString() : '');
    setEditingIncome(true);
  };

  const saveIncome = () => {
    const val = parseFloat(incomeInput);
    if (!isNaN(val) && val >= 0) setMonthlyIncome(val);
    setEditingIncome(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 pt-12 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold font-display flex-1" data-tour="expenses-header">Expenses</h1>
        <Button size="sm" onClick={() => setShowReport(true)} variant="ghost"><FileText className="w-5 h-5" /></Button>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} variant="ghost" data-tour="add-btn"><Plus className="w-5 h-5" /></Button>
      </div>

      <PageOnboardingTooltips pageId="expenses" />

      {/* Monthly Income Card */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Monthly Income</p>
          {!editingIncome ? (
            <button onClick={startEditIncome} className="text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
          ) : (
            <button onClick={saveIncome} className="text-primary"><Check className="w-4 h-4" /></button>
          )}
        </div>
        {editingIncome ? (
          <Input
            type="number" step="0.01" placeholder="Enter monthly income"
            value={incomeInput} onChange={e => setIncomeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveIncome()}
            className="bg-secondary border-0 text-lg font-bold"
            autoFocus
          />
        ) : (
          <p className="text-2xl font-bold font-display" style={{ color: 'hsl(142, 71%, 45%)' }}>
            ${monthlyIncome.toFixed(2)}
          </p>
        )}
      </div>

      {/* Budget Donut Chart */}
      <div className="glass rounded-2xl p-4 relative flex justify-center">
        <BudgetDonutChart income={monthlyIncome} expenditure={total} size={180} />
      </div>

      {/* Total Spent & Savings */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold font-display text-destructive">${total.toFixed(2)}</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {monthlyIncome > total ? 'Savings' : 'Overspent'}
          </p>
          <p className={`text-2xl font-bold font-display ${monthlyIncome >= total ? 'text-primary' : 'text-destructive'}`}>
            ${Math.abs(monthlyIncome - total).toFixed(2)}
          </p>
          {monthlyIncome > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {monthlyIncome >= total
                ? `${((1 - total / monthlyIncome) * 100).toFixed(0)}% saved`
                : `${(((total - monthlyIncome) / monthlyIncome) * 100).toFixed(0)}% over`}
            </p>
          )}
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <MonthlyTrendsChart expenses={expenses} monthlyIncome={monthlyIncome} historicalIncome={historicalIncome} onHistoricalIncomeChange={setHistoricalIncome} />

      {/* Category Budget Limits */}
      <CategoryBudgetLimits expenses={expenses} />

      {/* Add Expense Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-4 space-y-3 overflow-hidden">
            <Input placeholder="Expense title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-0" />
            <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="bg-secondary border-0" />
            <Select value={category} onValueChange={(v: Expense['category']) => setCategory(v)}>
              <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(catIcons).map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={addExpense} className="flex-1" size="sm">Add Expense</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      <div className="space-y-2">
        {expenses.length === 0 && !showAdd && (
          <EmptyState
            icon={Receipt}
            title="No expenses"
            description="Track your spending by adding your first expense."
            actionLabel="Add Expense"
            onAction={() => setShowAdd(true)}
          />
        )}
        {expenses.map(exp => {
          const cat = catIcons[exp.category] || catIcons.other;
          return (
            <motion.div key={exp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: expenses.indexOf(exp) * 0.03 }} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: cat.color + '18' }}>{cat.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{exp.title}</span>
                  {exp.isExample && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">Example</span>}
                </div>
                <span className="text-[10px] text-muted-foreground">{exp.category}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: cat.color }}>${exp.amount.toFixed(2)}</span>
              <button onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </motion.div>
          );
        })}
      </div>

      {/* Report Dialog */}
      <ExpenseReportDialog expenses={expenses} income={monthlyIncome} open={showReport} onClose={() => setShowReport(false)} />
    </motion.div>
  );
}

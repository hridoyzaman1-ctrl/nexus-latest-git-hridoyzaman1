import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Expense } from '@/types';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Edit2, Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

export type CategoryBudgets = Record<string, number>;

const catMeta: Record<string, { emoji: string; color: string }> = {
  food: { emoji: '🍔', color: 'hsl(38, 92%, 50%)' },
  transport: { emoji: '🚗', color: 'hsl(199, 89%, 48%)' },
  entertainment: { emoji: '🎬', color: 'hsl(291, 64%, 42%)' },
  shopping: { emoji: '🛍️', color: 'hsl(340, 82%, 52%)' },
  bills: { emoji: '📄', color: 'hsl(0, 84%, 60%)' },
  other: { emoji: '📦', color: 'hsl(220, 10%, 55%)' },
};

interface Props {
  expenses: Expense[];
}

export default function CategoryBudgetLimits({ expenses }: Props) {
  const [budgets, setBudgets] = useLocalStorage<CategoryBudgets>('category_budgets', {});
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const spentByCategory = useMemo(() => {
    return expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
  }, [expenses]);

  const startEdit = (cat: string) => {
    setEditValue(budgets[cat]?.toString() || '');
    setEditingCat(cat);
  };

  const saveEdit = (cat: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      setBudgets(prev => ({ ...prev, [cat]: val }));
      if (val > 0) {
        toast({ title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} budget set`, description: `Limit: $${val.toFixed(2)}` });
      }
    }
    setEditingCat(null);
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-primary" />
        Category Budget Limits
      </h3>
      <div className="space-y-2.5">
        {Object.keys(catMeta).map(cat => {
          const meta = catMeta[cat];
          const spent = spentByCategory[cat] || 0;
          const limit = budgets[cat] || 0;
          const ratio = limit > 0 ? spent / limit : 0;
          const pct = Math.min(ratio * 100, 100);
          const isWarning = ratio >= 0.8 && ratio < 1;
          const isOver = ratio >= 1;

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-xs font-medium capitalize flex-1">{cat}</span>
                {editingCat === cat ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Limit"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(cat)}
                      className="h-7 w-20 text-xs bg-secondary border-0"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(cat)} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      ${spent.toFixed(0)}{limit > 0 ? ` / $${limit.toFixed(0)}` : ''}
                    </span>
                    {isOver && <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />}
                    {isWarning && <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'hsl(48, 96%, 53%)' }} />}
                    <button onClick={() => startEdit(cat)} className="text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {limit > 0 && (
                <div className="relative">
                  <Progress
                    value={pct}
                    className="h-1.5"
                  />
                  {/* Color overlay */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full h-1.5 transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: isOver
                        ? 'hsl(0, 84%, 60%)'
                        : isWarning
                        ? 'hsl(48, 96%, 53%)'
                        : 'hsl(142, 71%, 45%)',
                    }}
                  />
                </div>
              )}
              {isOver && limit > 0 && (
                <p className="text-[10px] text-destructive font-medium animate-pulse">
                  ⚠ Over by ${(spent - limit).toFixed(2)}!
                </p>
              )}
              {isWarning && limit > 0 && (
                <p className="text-[10px] font-medium" style={{ color: 'hsl(48, 96%, 53%)' }}>
                  ⚠ {pct.toFixed(0)}% of limit reached
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">Tap ✏️ to set a spending cap per category</p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Expense } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Edit2, Check } from 'lucide-react';

interface MonthlyTrendsChartProps {
  expenses: Expense[];
  monthlyIncome: number;
  historicalIncome: Record<string, number>;
  onHistoricalIncomeChange: (updated: Record<string, number>) => void;
}

export default function MonthlyTrendsChart({ expenses, monthlyIncome, historicalIncome, onHistoricalIncomeChange }: MonthlyTrendsChartProps) {
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
  }, []);

  const data = useMemo(() => {
    return months.map(month => {
      const key = format(month, 'yyyy-MM');
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const spent = expenses
        .filter(e => isWithinInterval(new Date(e.date), { start, end }))
        .reduce((s, e) => s + e.amount, 0);

      const income = historicalIncome[key] ?? monthlyIncome;
      const savings = Math.round((income - spent) * 100) / 100;

      return {
        month: format(month, 'MMM'),
        key,
        income,
        expenses: Math.round(spent * 100) / 100,
        savings,
      };
    });
  }, [expenses, monthlyIncome, historicalIncome, months]);

  const startEdit = (key: string, currentIncome: number) => {
    setEditingMonth(key);
    setEditValue(currentIncome.toString());
  };

  const saveEdit = () => {
    if (!editingMonth) return;
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      onHistoricalIncomeChange({ ...historicalIncome, [editingMonth]: val });
    }
    setEditingMonth(null);
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">6-Month Trends</h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barGap={4} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Savings';
                return [`$${value.toFixed(2)}`, label];
              }}
            />
            <Legend
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value: string) => value === 'income' ? 'Income' : value === 'expenses' ? 'Expenses' : 'Savings'}
            />
            <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(217, 91%, 60%)' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Historical income editor */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Income per month (tap to edit)</p>
        <div className="grid grid-cols-3 gap-2">
          {data.map(d => (
            <div key={d.key} className="bg-secondary/50 rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{d.month}</span>
              {editingMonth === d.key ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Input
                    type="number" step="0.01"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    className="h-6 text-xs bg-background border-0 px-1 text-center"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-primary shrink-0"><Check className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => startEdit(d.key, d.income)} className="text-xs font-semibold text-foreground flex items-center justify-center gap-0.5 w-full mt-0.5">
                  ${d.income.toFixed(0)}
                  <Edit2 className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';

interface BudgetDonutChartProps {
  income: number;
  expenditure: number;
  size?: number;
}

export default function BudgetDonutChart({ income, expenditure, size = 200 }: BudgetDonutChartProps) {
  const { percentage, color, label, strokeDash } = useMemo(() => {
    if (income <= 0) return { percentage: 0, color: 'hsl(var(--muted-foreground))', label: 'No income set', strokeDash: '0 100' };

    const ratio = expenditure / income;
    const pct = Math.min(ratio * 100, 100);

    // green → yellow → red transition
    let c: string;
    if (ratio <= 0.5) {
      c = 'hsl(142, 71%, 45%)'; // green
    } else if (ratio <= 0.75) {
      c = 'hsl(48, 96%, 53%)'; // yellow
    } else if (ratio <= 1) {
      c = 'hsl(25, 95%, 53%)'; // orange
    } else {
      c = 'hsl(0, 84%, 60%)'; // red
    }

    const l = ratio > 1 ? `Over budget!` : `${(100 - pct).toFixed(0)}% remaining`;

    return { percentage: pct, color: c, label: l, strokeDash: `${pct} ${100 - pct}` };
  }, [income, expenditure]);

  const r = 40;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted) / 0.3)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold font-display" style={{ color }}>
          {income > 0 ? `${Math.min(percentage, 100).toFixed(0)}%` : '—'}
        </span>
        <span className="text-[10px] text-muted-foreground">spent</span>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {expenditure > income && income > 0 && (
        <p className="text-xs text-destructive font-semibold animate-pulse">
          ⚠ Overspent by ${(expenditure - income).toFixed(2)}
        </p>
      )}
      <div className="flex gap-4 text-xs mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(142, 71%, 45%)' }} />
          Income: ${income.toFixed(2)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(0, 84%, 60%)' }} />
          Spent: ${expenditure.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

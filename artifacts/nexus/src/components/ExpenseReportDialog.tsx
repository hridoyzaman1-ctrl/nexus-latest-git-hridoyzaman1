import { useState, useMemo } from 'react';
import { Expense } from '@/types';
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, X, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  expenses: Expense[];
  income: number;
  open: boolean;
  onClose: () => void;
}

type RangeMode = 'this-month' | 'all-time' | 'custom';

const catIcons: Record<string, string> = {
  food: '🍔', transport: '🚗', entertainment: '🎬',
  shopping: '🛍️', bills: '📄', other: '📦',
};

export default function ExpenseReportDialog({ expenses, income, open, onClose }: Props) {
  const [mode, setMode] = useState<RangeMode>('this-month');
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

  const filtered = useMemo(() => {
    if (mode === 'all-time') return expenses;
    const start = mode === 'this-month' ? startOfMonth(new Date()) : fromDate;
    const end = mode === 'this-month' ? endOfMonth(new Date()) : toDate;
    if (!start || !end) return expenses;
    return expenses.filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start, end });
    });
  }, [expenses, mode, fromDate, toDate]);

  const totalSpent = filtered.reduce((s, e) => s + e.amount, 0);
  const byCategory = filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const getPeriodLabel = () => {
    if (mode === 'this-month') return format(new Date(), 'MMMM yyyy');
    if (mode === 'all-time') return 'All Time';
    return `${fromDate ? format(fromDate, 'dd MMM yyyy') : '?'} – ${toDate ? format(toDate, 'dd MMM yyyy') : '?'}`;
  };

  const downloadReport = () => {
    const period = getPeriodLabel();
    let text = `EXPENSE REPORT — ${period}\n${'═'.repeat(40)}\n\n`;
    text += `Monthly Income: $${income.toFixed(2)}\nTotal Expenditure: $${totalSpent.toFixed(2)}\n`;
    text += `Balance: $${(income - totalSpent).toFixed(2)}\n\n`;
    text += `BREAKDOWN BY CATEGORY\n${'-'.repeat(30)}\n`;
    Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      text += `${catIcons[cat] || '📦'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}: $${amt.toFixed(2)}\n`;
    });
    text += `\nDETAILED EXPENSES\n${'-'.repeat(30)}\n`;
    filtered.forEach(e => {
      text += `${format(parseISO(e.date), 'dd MMM yyyy')} | ${e.title} | ${e.category} | $${e.amount.toFixed(2)}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `expense-report-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const period = getPeriodLabel();
    const rows: string[][] = [
      ['Expense Report', period],
      ['Income', income.toFixed(2)],
      ['Total Expenditure', totalSpent.toFixed(2)],
      ['Balance', (income - totalSpent).toFixed(2)],
      [],
      ['Date', 'Title', 'Category', 'Amount'],
    ];
    filtered.forEach(e => {
      rows.push([format(parseISO(e.date), 'yyyy-MM-dd'), e.title, e.category, e.amount.toFixed(2)]);
    });
    rows.push([]);
    rows.push(['Category', 'Total']);
    Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      rows.push([cat.charAt(0).toUpperCase() + cat.slice(1), amt.toFixed(2)]);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `expense-report-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-background rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-display">Expense Report</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Period selector */}
            <div className="flex gap-2 flex-wrap">
              {(['this-month', 'all-time', 'custom'] as RangeMode[]).map(m => (
                <Button key={m} size="sm" variant={mode === m ? 'default' : 'outline'} onClick={() => setMode(m)} className="text-xs capitalize">
                  {m.replace('-', ' ')}
                </Button>
              ))}
            </div>

            {mode === 'custom' && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs flex-1", !fromDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />{fromDate ? format(fromDate, 'dd MMM yy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs flex-1", !toDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />{toDate ? format(toDate, 'dd MMM yy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={toDate} onSelect={setToDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Summary */}
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-semibold" style={{ color: 'hsl(142, 71%, 45%)' }}>${income.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenditure</span>
                <span className="font-semibold text-destructive">${totalSpent.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Balance</span>
                <span style={{ color: income - totalSpent >= 0 ? 'hsl(142, 71%, 45%)' : undefined }} className={income - totalSpent < 0 ? 'text-destructive' : ''}>
                  ${(income - totalSpent).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">By Category</h3>
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2 text-sm">
                  <span>{catIcons[cat] || '📦'}</span>
                  <span className="flex-1 capitalize">{cat}</span>
                  <span className="font-medium">${amt.toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs">({totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(0) : 0}%)</span>
                </div>
              ))}
              {Object.keys(byCategory).length === 0 && (
                <p className="text-xs text-muted-foreground">No expenses in this period</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadReport} className="flex-1" size="sm" variant="outline">
                <FileText className="w-4 h-4 mr-1" /> TXT
              </Button>
              <Button onClick={downloadCSV} className="flex-1" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimePickerProps {
  value: string; // HH:mm or ''
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatDisplay(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Generate time slots every 15 minutes
const timeSlots: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

export function TimePicker({ value, onChange, placeholder = 'Pick time', className, disabled }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && activeRef.current) {
      setTimeout(() => activeRef.current?.scrollIntoView({ block: 'center' }), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          {value ? formatDisplay(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-0 z-[60]" align="start">
        <ScrollArea className="h-[220px]">
          <div className="p-1 space-y-0.5">
            {timeSlots.map(slot => {
              const isActive = value === slot;
              return (
                <button
                  key={slot}
                  ref={isActive ? activeRef : undefined}
                  onClick={() => { onChange(slot); setOpen(false); }}
                  className={cn(
                    'w-full text-left text-xs px-3 py-1.5 rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary text-foreground'
                  )}
                >
                  {formatDisplay(slot)}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

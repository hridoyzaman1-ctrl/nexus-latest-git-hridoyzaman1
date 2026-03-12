import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center glass rounded-2xl border-dashed border-2 border-border/50"
        >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-muted-foreground/50 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} size="sm" variant="secondary" className="rounded-xl font-medium">
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    );
}

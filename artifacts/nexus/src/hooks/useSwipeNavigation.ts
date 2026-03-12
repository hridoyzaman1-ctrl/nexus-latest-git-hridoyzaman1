import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const MODULES = [
    '/goals',
    '/habits',
    '/tasks',
    '/todos',
    '/notes',
    '/books',
    '/study',
    '/focus',
    '/time-tracking',
    '/wellness',
    '/expenses'
];

export function useSwipeNavigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartRef.current) return;

            const target = e.target as HTMLElement;
            // Skip swipe logic if we're interacting with inputs, sliders, or horizontally scrollable areas
            if (
                target.closest('.overflow-x-auto') ||
                target.closest('[data-orientation="horizontal"]') ||
                ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) ||
                target.closest('button') || // Also ignore button wrappers
                target.closest('.noscroll') // Custom class escape hatch
            ) {
                return;
            }

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = touchStartRef.current.x - endX;
            const diffY = touchStartRef.current.y - endY;

            // Ensure the swipe is mostly horizontal and meets a distance threshold
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 100) {
                const currentIndex = MODULES.indexOf(location.pathname);
                if (currentIndex !== -1) {
                    if (diffX > 0 && currentIndex < MODULES.length - 1) {
                        // Swiped left => go next
                        navigate(MODULES[currentIndex + 1]);
                    } else if (diffX < 0 && currentIndex > 0) {
                        // Swiped right => go prev
                        navigate(MODULES[currentIndex - 1]);
                    }
                }
            }
            touchStartRef.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [location.pathname, navigate]);
}

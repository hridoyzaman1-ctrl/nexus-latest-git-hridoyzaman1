// Custom rotate screen icon - phone with curved rotation arrows
export default function RotateIcon({ active, size = 16 }: { active?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Phone body */}
      <rect x="7" y="4" width="10" height="16" rx="2" style={{ transform: active ? 'rotate(90deg)' : 'none', transformOrigin: '12px 12px', transition: 'transform 0.3s ease' }} />
      {/* Curved arrow top-right */}
      <path d="M19 8 C 21 10, 21 14, 19 16" strokeDasharray={active ? '0' : '0'} />
      <polyline points="19 8 21.5 8.5 19.5 6" />
      {/* Curved arrow bottom-left */}
      <path d="M5 16 C 3 14, 3 10, 5 8" />
      <polyline points="5 16 2.5 15.5 4.5 18" />
    </svg>
  );
}

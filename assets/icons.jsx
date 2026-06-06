/* ============================================================
   Vibe — SVG Icon Set
   All icons used across the app. No emoji.
   Each is a function returning JSX with currentColor stroke/fill.
   ============================================================ */

const Icon = ({ d, size = 18, fill = 'none', stroke = 'currentColor', strokeWidth = 2, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d}/> : children}
  </svg>
);

const Icons = {
  Hand: ({ size = 18 }) => (
    <Icon size={size}>
      <path d="M18 11V6.5a2 2 0 0 0-4 0V11"/>
      <path d="M14 10V4.5a2 2 0 0 0-4 0V11"/>
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </Icon>
  ),
  Mic: ({ size = 18 }) => (
    <Icon size={size}>
      <rect x="9" y="2" width="6" height="13" rx="3"/>
      <path d="M19 11a7 7 0 0 1-14 0"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </Icon>
  ),
  MicOff: ({ size = 18 }) => (
    <Icon size={size}>
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M18.89 13.23A7 7 0 0 0 19 11"/>
      <path d="M5 11a7 7 0 0 0 11.18 5.63"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
      <path d="M15 9.34V5a3 3 0 0 0-5.94-.6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </Icon>
  ),
  Band: ({ size = 18 }) => (
    <Icon size={size}>
      <path d="M12 17.5V3"/>
      <path d="M16 6V3"/>
      <path d="M8 9V3"/>
      <circle cx="6" cy="17.5" r="3"/>
      <circle cx="16" cy="17.5" r="3"/>
    </Icon>
  ),
  Play: ({ size = 18 }) => (
    <Icon size={size} fill="currentColor" stroke="none">
      <polygon points="6,4 20,12 6,20"/>
    </Icon>
  ),
  Pause: ({ size = 18 }) => (
    <Icon size={size} fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </Icon>
  ),
  Stop: ({ size = 18 }) => (
    <Icon size={size} fill="currentColor" stroke="none">
      <rect x="5" y="5" width="14" height="14" rx="2"/>
    </Icon>
  ),
  Arrow: ({ size = 18 }) => (
    <Icon size={size}>
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </Icon>
  ),
  Back: ({ size = 14 }) => (
    <Icon size={size} strokeWidth={2.5}>
      <path d="M15 18l-6-6 6-6"/>
    </Icon>
  ),
  Note: ({ size = 18 }) => (
    <Icon size={size}>
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </Icon>
  ),
  Sparkle: ({ size = 16 }) => (
    <Icon size={size}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
      <circle cx="12" cy="12" r="2.5"/>
    </Icon>
  ),
  Star: ({ size = 14 }) => (
    <Icon size={size} fill="currentColor" stroke="currentColor">
      <polygon points="12 2 15 9 22 9.5 16.5 14 18 21 12 17 6 21 7.5 14 2 9.5 9 9"/>
    </Icon>
  ),
  Wave: ({ size = 18 }) => (
    <Icon size={size}>
      <path d="M2 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 12 4 12 2-4 4-4"/>
    </Icon>
  ),
  Lock: ({ size = 14 }) => (
    <Icon size={size}>
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </Icon>
  ),
  Unlock: ({ size = 14 }) => (
    <Icon size={size}>
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 7.5-2"/>
    </Icon>
  ),
  Ear: ({ size = 14 }) => (
    <Icon size={size}>
      <path d="M6 8a6 6 0 0 1 12 0c0 2.3-1.1 3.4-2.2 4.5-1 1-2.1 2-2.8 4 -.6 1.5-1.7 3-3.5 3-1.3 0-2.5-1-2.5-2.5 0-1.5 1-2 1-3.5 0-1.6-2-2.4-2-5z"/>
    </Icon>
  ),
  Drum: ({ size = 18 }) => (
    <Icon size={size}>
      <ellipse cx="12" cy="8" rx="9" ry="3"/>
      <path d="M3 8v6c0 1.7 4 3 9 3s9-1.3 9-3V8"/>
      <line x1="7" y1="3" x2="4" y2="9" strokeWidth="1.5"/>
      <line x1="17" y1="3" x2="20" y2="9" strokeWidth="1.5"/>
    </Icon>
  ),
  Slider: ({ size = 18 }) => (
    <Icon size={size}>
      <line x1="4" y1="6" x2="20" y2="6"/>
      <circle cx="9" cy="6" r="2" fill="currentColor"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <circle cx="15" cy="12" r="2" fill="currentColor"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
      <circle cx="7" cy="18" r="2" fill="currentColor"/>
    </Icon>
  ),
  Chevron: ({ size = 12 }) => (
    <Icon size={size} strokeWidth={3}>
      <path d="M9 18l6-6-6-6"/>
    </Icon>
  ),
  Power: ({ size = 18 }) => (
    <Icon size={size}>
      <path d="M18.36 6.64a9 9 0 1 1-12.72 0"/>
      <line x1="12" y1="2" x2="12" y2="12"/>
    </Icon>
  ),
};

Object.assign(window, { Icons });

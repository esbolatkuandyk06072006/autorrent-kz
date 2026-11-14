/**
 * Авторские SVG-иконки интерфейса AutoRent KZ.
 *
 * Единый стиль: viewBox 24×24, обводка currentColor, stroke-width 1.8,
 * скруглённые концы — иконки наследуют цвет текста, масштабируются через
 * пропорцию width/height. Никаких эмодзи и внешних наборов иконок.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true'
}

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} {...base} {...rest}>
      {children}
    </svg>
  )
}

/* ---------- Навигация ---------- */

export const IconCatalog = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="8" height="7" rx="1.6" />
    <rect x="13" y="4" width="8" height="7" rx="1.6" />
    <rect x="3" y="13" width="8" height="7" rx="1.6" />
    <rect x="13" y="13" width="8" height="7" rx="1.6" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" />
  </Svg>
)

export const IconCompare = (p) => (
  <Svg {...p}>
    <path d="M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5" />
    <path d="M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5" />
  </Svg>
)

export const IconHeart = ({ filled = false, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1C19 15.6 12 20 12 20Z" />
  </Svg>
)

export const IconAssistant = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.4 8 18 9.5 13.4 11 12 15.5 10.6 11 6 9.5 10.6 8 12 3.5Z" />
    <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </Svg>
)

export const IconRoutes = (p) => (
  <Svg {...p}>
    <path d="M6 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path d="M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path d="M15.5 6.5H10a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7H8.5" />
  </Svg>
)

export const IconBusiness = (p) => (
  <Svg {...p}>
    <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H13v15" />
    <path d="M13 10h5.5A1.5 1.5 0 0 1 20 11.5V20" />
    <path d="M3 20h18" />
    <path d="M7 9h2M7 13h2M7 17h2M16 14h1.5" />
  </Svg>
)

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    <path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2" />
  </Svg>
)

export const IconAdmin = (p) => (
  <Svg {...p}>
    <path d="M14.7 6.3a4 4 0 0 0 5.1 5.1L21 13l-8 8-2-2 8-8 1.6-1.2A4 4 0 0 0 15.5 4.7l-2.2 2.2-1.8-1.8 2.2-2.2" transform="translate(-1.5 -0.5)" />
    <path d="M6.5 13.5 4 16l4 4 2.5-2.5" />
  </Svg>
)

/* ---------- Шапка: логотип, тема, меню ---------- */

/** Фирменный минималистичный логотип: монограмма «A» в щитке-скруглении. */
export const BrandMark = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="brand-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#60a5fa" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="url(#brand-g)" />
    <path
      d="M9 23.5 16 8l7 15.5"
      fill="none"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12.4 18.2h7.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="16" cy="26" r="1.4" fill="#fff" opacity="0.85" />
  </svg>
)

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
  </Svg>
)

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5Z" />
  </Svg>
)

/* ---------- Голос и чат ---------- */

export const IconVolume = (p) => (
  <Svg {...p}>
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
    <path d="M15.2 8.6a4.8 4.8 0 0 1 0 6.8M17.8 6a8.4 8.4 0 0 1 0 12" />
  </Svg>
)

export const IconVolumeOff = (p) => (
  <Svg {...p}>
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
    <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
  </Svg>
)

export const IconMic = (p) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
  </Svg>
)

export const IconSend = (p) => (
  <Svg {...p}>
    <path d="m3.5 11.5 17-7.5-5.5 16-4-6.5-7.5-2Z" />
    <path d="m11 13.5 5-5" />
  </Svg>
)

/* ---------- Карточка техники ---------- */

export const IconPin = (p) => (
  <Svg {...p}>
    <path d="M12 21s6.5-5.6 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.4" />
  </Svg>
)

export const IconTag = (p) => (
  <Svg {...p}>
    <path d="M3.5 11.2V5a1.5 1.5 0 0 1 1.5-1.5h6.2a2 2 0 0 1 1.4.6l7.3 7.3a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0L4.1 12.6a2 2 0 0 1-.6-1.4Z" />
    <circle cx="8.4" cy="8.4" r="1.3" />
  </Svg>
)

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.9c1.9.7 3.2 2.4 3.2 4.6" />
  </Svg>
)

export const IconWeight = (p) => (
  <Svg {...p}>
    <path d="M6.5 8h11l2 12.5h-15L6.5 8Z" />
    <path d="M9 8a3 3 0 0 1 6 0" />
    <path d="M12 12v3.5M10.4 13.8h3.2" />
  </Svg>
)

export const IconLicense = (p) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M5.8 15.4c.5-1.3 1.5-2 2.7-2s2.2.7 2.7 2M14 10h4M14 13.5h4" />
  </Svg>
)

export const IconOperator = (p) => (
  <Svg {...p}>
    <path d="M5 18.5a7 7 0 0 1 14 0" />
    <path d="M10 5.6a3.4 3.4 0 0 1 4 0l.6 1.4H9.4l.6-1.4Z" />
    <path d="M4 18.5h16M12 5.6V3.5" />
  </Svg>
)

export const IconStar = ({ filled = true, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6L12 16.7l-5 2.6.9-5.6-4-4 5.6-.8L12 3.8Z" />
  </Svg>
)

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M4 10.8 12 4l8 6.8V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.2Z" />
    <path d="M9.5 20.5v-6h5v6" />
  </Svg>
)

export const IconKey = (p) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="4" />
    <path d="m11 11 8.5 8.5M16.5 16.5l2-2M14 14l2-2" />
  </Svg>
)

export const IconDoc = (p) => (
  <Svg {...p}>
    <path d="M6 3.5h7l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20.5v-15A1.5 1.5 0 0 1 6.5 3.5Z" transform="translate(0.5 -0.5)" />
    <path d="M13 3v5h5M8.5 13h7M8.5 16.5h5" />
  </Svg>
)

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10v3Z" />
    <path d="m14 7.5 3 3" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    <path d="M10.5 11v5.5M13.5 11v5.5" />
  </Svg>
)

export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconRuler = (p) => (
  <Svg {...p}>
    <rect x="2.8" y="8" width="18.4" height="8" rx="1.5" transform="rotate(-8 12 12)" />
    <path d="m7 10.5 1 3M11 10l1 3M15 9.5l1 3" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

export const IconLake = (p) => (
  <Svg {...p}>
    <path d="M3 8.5c2.2 0 2.2 1.6 4.4 1.6s2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6" />
    <path d="M3 13.5c2.2 0 2.2 1.6 4.4 1.6s2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6" />
    <path d="M3 18.5c2.2 0 2.2 1.6 4.4 1.6s2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6" />
  </Svg>
)

export const IconMosque = (p) => (
  <Svg {...p}>
    <path d="M4 20h16M6 20v-6a6 6 0 0 1 12 0v6" />
    <path d="M12 8V5M10.5 6.5 12 5l1.5 1.5" />
  </Svg>
)

/* ---------- Экраны авторизации и KYC ---------- */

export const IconPhone = (p) => (
  <Svg {...p}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M10.5 5.5h3M11 18.5h2" />
  </Svg>
)

export const IconSms = (p) => (
  <Svg {...p}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-7Z" />
    <path d="M8 8.5h8M8 11.5h5" />
  </Svg>
)

export const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 3 5 5.8v5.4c0 4.2 2.9 7.6 7 9.3 4.1-1.7 7-5.1 7-9.3V5.8L12 3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
)

export const IconCamera = (p) => (
  <Svg {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="12.8" r="3.2" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
)

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4.5 12h15m0 0-5.5-5.5M19.5 12 14 17.5" />
  </Svg>
)

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.5" />
  </Svg>
)

export const IconRestore = (p) => (
  <Svg {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4 4.5V9h4.5" />
  </Svg>
)

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6" />
  </Svg>
)

export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M14 5.5H6.5A1.5 1.5 0 0 0 5 7v10a1.5 1.5 0 0 0 1.5 1.5H14" />
    <path d="M11 12h9m0 0-3.2-3.2M20 12l-3.2 3.2" />
  </Svg>
)

/* ---------- Умные подборки на главной ---------- */

export const IconConstruction = (p) => (
  <Svg {...p}>
    <path d="M4 20h16M6 20V9.5L12 5l6 4.5V20" />
    <path d="M9.5 20v-5h5v5M9.5 10.5h5" />
  </Svg>
)

export const IconWedding = (p) => (
  <Svg {...p}>
    <path d="m12 6.5 2.6 2.6L12 11.7 9.4 9.1 12 6.5Z" />
    <circle cx="12" cy="15" r="5" />
  </Svg>
)

export const IconMountains = (p) => (
  <Svg {...p}>
    <path d="M3 19 9 8l4 6.5L15.5 10 21 19H3Z" />
    <path d="m7.4 11.6 1.6 1.4 1.6-1.4" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconWallet = (p) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18" />
    <path d="M15.5 14.5h2" />
  </Svg>
)

export const IconTrafficLight = ({ size = 64 }) => (
  <svg width={size} height={size * 1.7} viewBox="0 0 40 68" aria-hidden="true">
    <rect x="6" y="2" width="28" height="64" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="2" />
    <circle cx="20" cy="16" r="7" fill="#ef4444" opacity="0.9" />
    <circle cx="20" cy="34" r="7" fill="#f59e0b" opacity="0.35" />
    <circle cx="20" cy="52" r="7" fill="#22c55e" opacity="0.35" />
  </svg>
)

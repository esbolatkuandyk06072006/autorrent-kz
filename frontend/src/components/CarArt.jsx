import { CATEGORY_LABELS } from '../utils.js'

/**
 * Deterministic color from brand+model so every car gets its own paint.
 */
function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

const PAINTS = [
  ['#3b82f6', '#1d4ed8'],
  ['#ef4444', '#b91c1c'],
  ['#10b981', '#047857'],
  ['#8b5cf6', '#6d28d9'],
  ['#f59e0b', '#b45309'],
  ['#0ea5e9', '#0369a1'],
  ['#111827', '#374151'],
  ['#ec4899', '#be185d']
]

const SCENES = {
  ECONOMY: { sky: ['#dbeafe', '#eff6ff'], ground: '#94a3b8', accent: '#2563eb' },
  COMFORT: { sky: ['#e0e7ff', '#f5f3ff'], ground: '#818cf8', accent: '#4f46e5' },
  SUV: { sky: ['#fef3c7', '#fffbeb'], ground: '#d97706', accent: '#b45309' },
  BUSINESS: { sky: ['#f1f5f9', '#e2e8f0'], ground: '#475569', accent: '#0f172a' },
  ELECTRIC: { sky: ['#ccfbf1', '#f0fdfa'], ground: '#0d9488', accent: '#0f766e' },
  // Грузовые
  LIGHT_TRUCK: { sky: ['#fef9c3', '#fefce8'], ground: '#a16207', accent: '#854d0e' },
  MEDIUM_TRUCK: { sky: ['#ffedd5', '#fff7ed'], ground: '#c2410c', accent: '#9a3412' },
  HEAVY_TRUCK: { sky: ['#fee2e2', '#fef2f2'], ground: '#b91c1c', accent: '#991b1b' },
  DUMP_TRUCK: { sky: ['#ede9fe', '#f5f3ff'], ground: '#6d28d9', accent: '#5b21b6' },
  // Спецтехника
  EXCAVATOR: { sky: ['#dcfce7', '#f0fdf4'], ground: '#15803d', accent: '#166534' },
  CRANE: { sky: ['#e0f2fe', '#f0f9ff'], ground: '#0369a1', accent: '#075985' },
  BULLDOZER: { sky: ['#fde68a', '#fffbeb'], ground: '#b45309', accent: '#92400e' },
  LOADER: { sky: ['#d1fae5', '#ecfdf5'], ground: '#047857', accent: '#065f46' },
  CONCRETE_MIXER: { sky: ['#e5e7eb', '#f9fafb'], ground: '#4b5563', accent: '#374151' }
}

// Силуэт грузовика (борт/фургон/самосвал).
function TruckBody({ uid, paint }) {
  return (
    <>
      {/* cargo box / cab */}
      <path
        d="M40 150 L40 120 Q40 112 50 112 L150 112 L150 150 Z"
        fill={`url(#${uid}-paint)`}
      />
      {/* cab */}
      <path
        d="M156 150 L156 116 Q156 108 166 108 L232 108 Q244 108 250 120 L262 140 L262 150 Z"
        fill={`url(#${uid}-paint)`}
      />
      {/* windshield */}
      <path d="M170 116 L228 116 Q236 116 240 124 L246 136 L170 136 Z" fill={`url(#${uid}-glass)`} />
      {/* chassis */}
      <rect x="40" y="150" width="230" height="10" rx="3" fill="#0f172a" />
      {/* wheels (dual rear) */}
      <circle cx="90" cy="162" r="22" fill="#0f172a" />
      <circle cx="90" cy="162" r="10" fill="#e2e8f0" />
      <circle cx="210" cy="162" r="22" fill="#0f172a" />
      <circle cx="210" cy="162" r="10" fill="#e2e8f0" />
      <circle cx="250" cy="162" r="22" fill="#0f172a" />
      <circle cx="250" cy="162" r="10" fill="#e2e8f0" />
    </>
  )
}

// Силуэт спецтехники (экскаватор/кран/бульдозер — обобщённый).
function SpecialBody({ uid, paint }) {
  return (
    <>
      {/* tracks */}
      <rect x="52" y="150" width="240" height="24" rx="12" fill="#0f172a" />
      <circle cx="80" cy="162" r="7" fill="#94a3b8" />
      <circle cx="264" cy="162" r="7" fill="#94a3b8" />
      {/* cab / superstructure */}
      <path
        d="M96 150 L96 108 Q96 100 106 100 L176 100 Q186 100 186 110 L186 150 Z"
        fill={`url(#${uid}-paint)`}
      />
      {/* cab glass */}
      <path d="M112 112 L170 112 L170 134 L112 134 Z" fill={`url(#${uid}-glass)`} />
      {/* boom / arm */}
      <path d="M186 120 L300 84 L312 96 L200 138 Z" fill={`url(#${uid}-paint)`} />
      <path d="M300 84 L332 108 L316 120 L296 100 Z" fill="#0f172a" />
    </>
  )
}

/**
 * Branded vector illustration of a vehicle — no external images needed.
 * Gradient sky by category; silhouette chosen by group (легковая/грузовая/спецтехника).
 */
export default function CarArt({ car, big = false }) {
  const scene = SCENES[car.category] || SCENES.COMFORT
  const paint = PAINTS[hashCode(`${car.brand}${car.model}`) % PAINTS.length]
  const uid = `art-${car.id}`
  const group = car.type || 'PASSENGER'
  const silhouette = group === 'PASSENGER' ? 'car' : group === 'CARGO' ? 'truck' : 'special'

  return (
    <svg
      className={`car-art ${big ? 'car-art-lg' : ''}`}
      viewBox="0 0 400 220"
      role="img"
      aria-label={`${car.brand} ${car.model}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.sky[0]} />
          <stop offset="100%" stopColor={scene.sky[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-paint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={paint[0]} />
          <stop offset="100%" stopColor={paint[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="400" height="220" fill={`url(#${uid}-sky)`} />

      {/* sun */}
      <circle cx="336" cy="46" r="24" fill="#ffffff" opacity="0.75" />
      <circle cx="336" cy="46" r="34" fill="#ffffff" opacity="0.35" />

      {/* distant mountains */}
      <path d="M0 150 L70 96 L128 148 L180 108 L250 152 L310 116 L400 156 L400 170 L0 170 Z" fill={scene.accent} opacity="0.18" />

      {/* road */}
      <rect x="0" y="170" width="400" height="50" fill={scene.ground} opacity="0.35" />
      <rect x="0" y="170" width="400" height="4" fill={scene.accent} opacity="0.5" />
      <g fill="#ffffff" opacity="0.8">
        <rect x="24" y="194" width="34" height="5" rx="2.5" />
        <rect x="94" y="194" width="34" height="5" rx="2.5" />
        <rect x="164" y="194" width="34" height="5" rx="2.5" />
        <rect x="234" y="194" width="34" height="5" rx="2.5" />
        <rect x="304" y="194" width="34" height="5" rx="2.5" />
        <rect x="374" y="194" width="26" height="5" rx="2.5" />
      </g>

      {/* car shadow */}
      <ellipse cx="200" cy="176" rx="150" ry="9" fill="#0f172a" opacity="0.22" />

      {silhouette === 'car' && (
        <>
          {/* body */}
          <path
            d="M58 158
               C54 142 62 130 82 126
               L120 118
               C134 96 156 84 186 82
               L240 82
               C268 84 288 94 302 116
               L336 126
               C356 131 364 140 364 152
               L364 162
               C364 166 361 168 356 168
               L66 168
               C61 168 58 165 58 160 Z"
            fill={`url(#${uid}-paint)`}
          />

          {/* roof highlight */}
          <path d="M132 116 C146 94 166 86 192 85 L236 85 C260 86 278 95 291 114" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.5" />

          {/* windows */}
          <path d="M144 116 L166 94 C172 90 178 88 186 88 L198 88 L198 116 Z" fill={`url(#${uid}-glass)`} />
          <path d="M206 88 L238 88 C256 89 270 96 280 112 L206 116 Z" fill={`url(#${uid}-glass)`} />

          {/* door line + handle */}
          <path d="M202 118 L202 164" stroke="#0f172a" strokeWidth="2" opacity="0.35" />
          <rect x="176" y="130" width="22" height="5" rx="2.5" fill="#0f172a" opacity="0.45" />
          <rect x="232" y="130" width="22" height="5" rx="2.5" fill="#0f172a" opacity="0.45" />

          {/* lights */}
          <rect x="348" y="132" width="16" height="12" rx="4" fill="#fde047" />
          <rect x="348" y="132" width="16" height="12" rx="4" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <rect x="58" y="134" width="12" height="10" rx="3" fill="#fca5a5" />

          {/* wheels */}
          <g>
            <circle cx="126" cy="164" r="26" fill="#0f172a" />
            <circle cx="126" cy="164" r="13" fill="#e2e8f0" />
            <circle cx="126" cy="164" r="5" fill="#94a3b8" />
            <circle cx="300" cy="164" r="26" fill="#0f172a" />
            <circle cx="300" cy="164" r="13" fill="#e2e8f0" />
            <circle cx="300" cy="164" r="5" fill="#94a3b8" />
          </g>

          {/* plate */}
          <g>
            <rect x="168" y="146" width="64" height="16" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
            <text x="200" y="158" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" fontFamily="monospace">
              {car.licensePlate}
            </text>
          </g>
        </>
      )}

      {silhouette === 'truck' && <TruckBody uid={uid} paint={paint} />}
      {silhouette === 'special' && <SpecialBody uid={uid} paint={paint} />}

      {/* plate (for truck/special) */}
      {silhouette !== 'car' && (
        <g>
          <rect x="150" y="150" width="64" height="16" rx="3" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
          <text x="182" y="162" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" fontFamily="monospace">
            {car.licensePlate}
          </text>
        </g>
      )}

      {/* category chip */}
      <g transform="translate(16 16)">
        <rect width="118" height="26" rx="13" fill="#ffffff" opacity="0.85" />
        <text x="59" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fill={scene.accent}>
          {CATEGORY_LABELS[car.category] || car.category} · {car.brand}
        </text>
      </g>
    </svg>
  )
}

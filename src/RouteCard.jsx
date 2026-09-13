export function RouteCard({ route, airlines, onClose }) {
  const airline = airlines[route.airlineId];

  // Great-circle distance
  const R    = 6371;
  const dLat = ((route.dst.lat - route.src.lat) * Math.PI) / 180;
  const dLon = ((route.dst.lng - route.src.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((route.src.lat * Math.PI) / 180) *
      Math.cos((route.dst.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

  const hours  = Math.floor(dist / 800);
  const mins   = Math.round(((dist / 800) - hours) * 60);
  const timeStr = `${hours}h${String(mins).padStart(2, '0')}`;

  const { label, color } =
    dist < 800  ? { label: 'Court courrier',  color: '#34d399' } :
    dist < 3000 ? { label: 'Moyen courrier',  color: '#fbbf24' } :
                  { label: 'Long courrier',   color: '#f472b6' };

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[min(420px,calc(100vw-2rem))]">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
        style={{ background: 'rgba(11,28,48,0.97)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Color accent bar */}
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />

        <div className="p-5">
          {/* Airline row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-white font-bold text-base leading-snug">
                {airline?.name || route.airlineCode}
              </p>
              {airline?.country && (
                <p className="text-white/30 text-xs mt-0.5">{airline.country}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {/* Range badge */}
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${color}18`, color }}
              >
                {label}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/35 hover:text-white transition-all cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Main IATA display */}
          <div className="flex items-center gap-3">
            {/* Departure */}
            <div className="flex-1">
              <div className="text-5xl font-black font-mono text-white tracking-widest leading-none">
                {route.src.iata}
              </div>
              <div className="text-sm text-white/55 mt-2 font-medium leading-snug">
                {route.src.city}
              </div>
              <div className="text-xs text-white/25 mt-0.5">{route.src.country}</div>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 px-1">
              <span className="text-xs font-bold text-white/50 tabular-nums">
                {dist.toLocaleString()} km
              </span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-px rounded-full" style={{ background: `${color}55` }} />
                <svg className="w-5 h-5" fill="currentColor" style={{ color }} viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div className="w-6 h-px rounded-full" style={{ background: `${color}55` }} />
              </div>
              <span className="text-xs text-white/30 font-mono">~{timeStr}</span>
            </div>

            {/* Arrival */}
            <div className="flex-1 text-right">
              <div className="text-5xl font-black font-mono text-white tracking-widest leading-none">
                {route.dst.iata}
              </div>
              <div className="text-sm text-white/55 mt-2 font-medium leading-snug">
                {route.dst.city}
              </div>
              <div className="text-xs text-white/25 mt-0.5">{route.dst.country}</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              ['Escales',   route.stops === 0 ? 'Direct' : `${route.stops} escale${route.stops > 1 ? 's' : ''}`],
              ['Code IATA', airline?.iata || '—'],
              ['Vol est.',  `~${timeStr}`],
            ].map(([lbl, val]) => (
              <div key={lbl} className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] text-white/25 uppercase tracking-wider">{lbl}</p>
                <p className="text-sm font-bold text-white mt-1 font-mono">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

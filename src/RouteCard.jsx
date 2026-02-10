export default function RouteCard({ route, airlines, onClose }) {
  const airline = airlines[route.airlineId];

  const R = 6371;
  const dLat = ((route.dst.lat - route.src.lat) * Math.PI) / 180;
  const dLon = ((route.dst.lng - route.src.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((route.src.lat * Math.PI) / 180) *
      Math.cos((route.dst.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

  const hours = Math.floor(distance / 800);
  const minutes = Math.round(((distance / 800) - hours) * 60);
  const timeStr = `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-8 w-[360px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden z-20">
      <div className="p-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors cursor-pointer text-sm"
        >
          ×
        </button>

        {/* Airline */}
        <div className="mb-4">
          <p className="text-white text-sm font-medium">{airline?.name || route.airlineCode}</p>
          {airline?.country && (
            <p className="text-[11px] text-white/40 mt-0.5">{airline.country}</p>
          )}
        </div>

        {/* Route */}
        <div className="flex items-center gap-4">
          {/* Departure */}
          <div className="flex-1">
            <div className="text-2xl font-mono font-semibold text-white tracking-wider">{route.src.iata}</div>
            <div className="text-xs text-white/50 mt-1 leading-tight">{route.src.city}</div>
            <div className="text-[11px] text-white/25 leading-tight">{route.src.country}</div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-[11px] text-white/40 font-mono">{distance.toLocaleString()} km</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-px bg-white/20"></div>
              <svg className="w-3.5 h-3.5 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              <div className="w-6 h-px bg-white/20"></div>
            </div>
            <span className="text-[11px] text-white/40 font-mono">~{timeStr}</span>
          </div>

          {/* Arrival */}
          <div className="flex-1 text-right">
            <div className="text-2xl font-mono font-semibold text-white tracking-wider">{route.dst.iata}</div>
            <div className="text-xs text-white/50 mt-1 leading-tight">{route.dst.city}</div>
            <div className="text-[11px] text-white/25 leading-tight">{route.dst.country}</div>
          </div>
        </div>

        {/* Details */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-white/10 text-[11px]">
          <div>
            <span className="text-white/30">IATA</span>
            <span className="text-white/60 ml-1.5">{airline?.iata || '—'}</span>
          </div>
          <div>
            <span className="text-white/30">ICAO</span>
            <span className="text-white/60 ml-1.5">{airline?.icao || '—'}</span>
          </div>
          <div>
            <span className="text-white/30">Type</span>
            <span className="text-white/60 ml-1.5">{route.stops === 0 ? 'Direct' : `${route.stops} escale(s)`}</span>
          </div>
          {airline?.active !== undefined && (
            <div className="ml-auto">
              <span className={airline.active ? 'text-white/60' : 'text-white/25'}>
                {airline.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

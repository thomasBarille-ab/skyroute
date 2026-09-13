import { useState, useEffect, useRef, useMemo } from 'react';

const MANUFACTURERS = [
  {
    id: 'airbus', label: 'Airbus',
    codes: [
      // A220 (ex-Bombardier C Series)
      '221','223',
      // A320 family — neo first, then classic
      '32N','32A','32Q','31N',
      '320','319','321','318',
      // A330 / A340
      '332','333','330','343','346','340',
      // A350 / A380
      '359','351','388',
    ],
  },
  {
    id: 'boeing', label: 'Boeing',
    codes: [
      // 737 MAX (new generation)
      '7M8','7M9','7M7','7MJ',
      // 737 classic / NG
      '738','73H','73W','73G','739','737','733','735',
      // 787 (Dreamliner) — -10 first
      '781','789','787',
      // 777
      '77W','772','777',
      // 767 / 757 / 747
      '763','752','757','744',
    ],
  },
  {
    id: 'embraer', label: 'Embraer',
    codes: [
      // E-Jet E2
      '290','295',
      // E-Jet classic
      'E90','E95','E75','E70','E45','ERJ','ER4',
    ],
  },
  {
    id: 'bombardier', label: 'Bombardier',
    codes: ['CRJ','CR7','CR9','DH4','DH8','DH3','DH1'],
  },
  {
    id: 'atr', label: 'ATR',
    codes: ['AT7','AT5','AT4','ATR'],
  },
  {
    id: 'comac', label: 'Comac',
    codes: ['919'],
  },
];

export function AircraftPicker({ planes, planesByIata, selectedPlane, onSelect, onClose }) {
  const defaultTab = selectedPlane
    ? (MANUFACTURERS.find(m => m.codes.includes(selectedPlane.iata))?.id ?? 'airbus')
    : 'airbus';

  const [tab, setTab]       = useState(defaultTab);
  const [search, setSearch] = useState('');
  const inputRef = useRef();

  useEffect(() => {
    // slight delay so the slide-in animation plays first
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const displayed = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      return planes
        .filter(p => p.name.toLowerCase().includes(q) || p.iata.toLowerCase().includes(q))
        .slice(0, 60);
    }
    const mfr = MANUFACTURERS.find(m => m.id === tab);
    return mfr ? mfr.codes.map(c => planesByIata[c]).filter(Boolean) : planes.slice(0, 60);
  }, [tab, search, planes, planesByIata]);

  return (
    /* Overlay */
    <div
      className="absolute inset-0 z-20 flex items-end justify-center"
      style={{ background: 'rgba(4,10,20,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-xl bg-[#0b1c30] border border-white/10 rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '72vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile hint) */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3">
          <h2 className="text-white font-bold text-xl">Choisir un avion</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/35 hover:text-white transition-all cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher un avion..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-white/22 outline-none focus:border-blue-400/40 focus:bg-white/7 transition-all"
            />
          </div>
        </div>

        {/* Manufacturer tabs */}
        {!search && (
          <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto scrollbar-none">
            {MANUFACTURERS.map(m => (
              <button
                key={m.id}
                onClick={() => setTab(m.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  tab === m.id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/65'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Aircraft grid */}
        <div className="overflow-y-auto px-5 pb-6">
          {displayed.length === 0 ? (
            <p className="text-center text-white/22 py-10 text-sm">Aucun résultat</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {displayed.map((plane, i) => {
                const active = selectedPlane?.iata === plane.iata;
                return (
                  <button
                    key={i}
                    onClick={() => onSelect(plane)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      active
                        ? 'bg-blue-500/18 border-blue-400/45 shadow shadow-blue-500/15'
                        : 'bg-white/3 border-white/6 hover:bg-white/7 hover:border-white/15'
                    }`}
                  >
                    <div className={`text-sm font-semibold leading-snug ${active ? 'text-blue-200' : 'text-white/80 group-hover:text-white'}`}>
                      {plane.name}
                    </div>
                    <div className="text-[10px] font-mono mt-1 text-white/28">{plane.iata}</div>
                    {active && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] text-blue-400 font-semibold">Actif</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

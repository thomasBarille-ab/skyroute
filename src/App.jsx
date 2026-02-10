import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { loadPlanes, loadAirports, loadAirlines, loadRoutes } from './dataLoader';
import RouteCard from './RouteCard';

const GLOBE_IMAGE = '//unpkg.com/three-globe/example/img/earth-night.jpg';
const BUMP_IMAGE = '//unpkg.com/three-globe/example/img/earth-topology.png';

// Top aircraft models grouped by manufacturer, ordered by route count
const FEATURED = [
  {
    manufacturer: 'Airbus',
    models: ['320', '319', '321', '332', '333', '388', '359', '330', '310', '318', '32N', '31N', '32Q', '340', '343', '346', '351'],
  },
  {
    manufacturer: 'Boeing',
    models: ['738', '73H', '737', '73W', '73G', '733', '763', '757', '777', '77W', '739', '735', '744', '789', '787', '772', '753'],
  },
  {
    manufacturer: 'Embraer',
    models: ['E90', 'E70', 'E75', 'ERJ', 'ER4', 'E95', 'E45'],
  },
  {
    manufacturer: 'Bombardier',
    models: ['CRJ', 'CR7', 'CR9', 'DH4', 'DH8', 'DH3', 'DH1'],
  },
  {
    manufacturer: 'ATR',
    models: ['AT7', 'AT5', 'AT4', 'ATR'],
  },
];

export default function App() {
  const globeRef = useRef();
  const [planes, setPlanes] = useState([]);
  const [airports, setAirports] = useState({});
  const [airlines, setAirlines] = useState({});
  const [allRoutes, setAllRoutes] = useState([]);
  const [selectedPlane, setSelectedPlane] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredArc, setHoveredArc] = useState(null);

  // Menu state: 'main' = featured list, 'all' = full searchable list, 'manufacturer' = models of one manufacturer
  const [menuView, setMenuView] = useState('main');
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([loadPlanes(), loadAirports(), loadAirlines(), loadRoutes()])
      .then(([p, ap, al, r]) => {
        setPlanes(p);
        setAirports(ap);
        setAirlines(al);
        setAllRoutes(r);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      globeRef.current.pointOfView({ lat: 46.2, lng: 2.2, altitude: 2.5 });
    }
  }, [loading]);

  // Build a map of iata -> plane for quick lookup
  const planesByIata = useMemo(() => {
    const map = {};
    for (const p of planes) map[p.iata] = p;
    return map;
  }, [planes]);

  // Models for selected manufacturer
  const manufacturerModels = useMemo(() => {
    if (!selectedManufacturer) return [];
    const group = FEATURED.find(f => f.manufacturer === selectedManufacturer);
    if (!group) return [];
    return group.models.map(code => planesByIata[code]).filter(Boolean);
  }, [selectedManufacturer, planesByIata]);

  // Filtered planes for search in "all" view
  const filteredPlanes = useMemo(() => {
    if (!search) return planes;
    const q = search.toLowerCase();
    return planes.filter(p =>
      p.name.toLowerCase().includes(q) || p.iata.toLowerCase().includes(q)
    );
  }, [planes, search]);

  const filteredRoutes = useMemo(() => {
    if (!selectedPlane) return [];
    const seen = new Set();
    return allRoutes
      .filter(r => r.equipment.includes(selectedPlane.iata))
      .filter(r => {
        const src = airports[r.srcAirportId] || airports[r.srcAirportCode];
        const dst = airports[r.dstAirportId] || airports[r.dstAirportCode];
        if (!src || !dst || isNaN(src.lat) || isNaN(dst.lat)) return false;
        const a = src.iata < dst.iata ? src.iata : dst.iata;
        const b = src.iata < dst.iata ? dst.iata : src.iata;
        const key = `${a}-${b}-${r.airlineCode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 800);
  }, [selectedPlane, allRoutes, airports]);

  const arcsData = useMemo(() => {
    return filteredRoutes.map((r, i) => {
      const src = airports[r.srcAirportId] || airports[r.srcAirportCode];
      const dst = airports[r.dstAirportId] || airports[r.dstAirportCode];
      return { ...r, src, dst, idx: i };
    });
  }, [filteredRoutes, airports]);

  const routeAirports = useMemo(() => {
    const set = new Map();
    for (const arc of arcsData) {
      if (arc.src) set.set(arc.src.iata, arc.src);
      if (arc.dst) set.set(arc.dst.iata, arc.dst);
    }
    return Array.from(set.values());
  }, [arcsData]);

  const handlePlaneSelect = useCallback((plane) => {
    setSelectedPlane(plane);
    setSelectedRoute(null);
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false;
    }
  }, []);

  const handleArcClick = useCallback((arc) => {
    setSelectedRoute(arc);
    const midLat = (arc.src.lat + arc.dst.lat) / 2;
    const midLng = (arc.src.lng + arc.dst.lng) / 2;
    globeRef.current?.pointOfView({ lat: midLat, lng: midLng, altitude: 1.8 }, 1000);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedPlane(null);
    setSelectedRoute(null);
    setMenuView('main');
    setSelectedManufacturer(null);
    setSearch('');
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.pointOfView({ lat: 46.2, lng: 2.2, altitude: 2.5 }, 1000);
    }
  }, []);

  const handleGlobeClick = useCallback(() => {
    if (selectedRoute) setSelectedRoute(null);
  }, [selectedRoute]);

  const handleMenuBack = useCallback(() => {
    if (menuView === 'manufacturer' || menuView === 'all') {
      setMenuView('main');
      setSelectedManufacturer(null);
      setSearch('');
    }
  }, [menuView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-lg tracking-wide">Chargement</p>
        </div>
      </div>
    );
  }

  // Determine menu title and whether to show back arrow
  const showBackArrow = menuView !== 'main';
  let menuTitle = 'Choisir un avion';
  if (menuView === 'manufacturer') menuTitle = selectedManufacturer;
  if (menuView === 'all') menuTitle = 'Tous les avions';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <Globe
        ref={globeRef}
        globeImageUrl={GLOBE_IMAGE}
        bumpImageUrl={BUMP_IMAGE}
        backgroundColor="#000000"
        atmosphereColor="#ffffff"
        atmosphereAltitude={0.2}
        arcsData={arcsData}
        arcStartLat={d => d.src.lat}
        arcStartLng={d => d.src.lng}
        arcEndLat={d => d.dst.lat}
        arcEndLng={d => d.dst.lng}
        arcColor={d => {
          if (selectedRoute && d.idx === selectedRoute.idx) return ['#ffffff', '#ffffff'];
          if (hoveredArc && d.idx === hoveredArc.idx) return ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.9)'];
          return ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.25)'];
        }}
        arcStroke={d => {
          if (selectedRoute && d.idx === selectedRoute.idx) return 1.5;
          if (hoveredArc && d.idx === hoveredArc.idx) return 1;
          return 0.3;
        }}
        arcDashLength={0.5}
        arcDashGap={0.3}
        arcDashAnimateTime={2000}
        onArcClick={handleArcClick}
        onArcHover={setHoveredArc}
        arcLabel={d => {
          const airline = airlines[d.airlineId];
          return `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);font-family:system-ui;font-size:13px;color:#fff">
            <b>${d.src.iata} → ${d.dst.iata}</b><br/>
            <span style="color:rgba(255,255,255,0.5)">${airline?.name || d.airlineCode}</span>
          </div>`;
        }}
        pointsData={routeAirports}
        pointLat={d => d.lat}
        pointLng={d => d.lng}
        pointAltitude={0.01}
        pointRadius={0.12}
        pointColor={() => '#ffffff'}
        pointLabel={d => `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:4px;border:1px solid rgba(255,255,255,0.15);font-family:system-ui;font-size:13px;color:#fff">
          <b>${d.iata}</b> ${d.name}<br/>
          <span style="color:rgba(255,255,255,0.5)">${d.city}, ${d.country}</span>
        </div>`}
        onGlobeClick={handleGlobeClick}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-8 py-5 flex items-start justify-between pointer-events-none z-10" onClick={e => e.stopPropagation()}>
        <div className="pointer-events-auto">
          <h1 className="text-xl font-medium tracking-tight text-white">SkyRoute</h1>
          {selectedPlane && (
            <p className="text-xs text-white/40 mt-1 font-mono">
              {selectedPlane.name} / {filteredRoutes.length} routes
            </p>
          )}
        </div>
      </div>

      {/* Aircraft Selector */}
      {!selectedPlane && (
        <div className="absolute top-16 left-8 w-72 max-h-[calc(100vh-100px)] bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg flex flex-col overflow-hidden z-10">
          {/* Menu header with back arrow */}
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            {showBackArrow && (
              <button
                onClick={handleMenuBack}
                className="w-6 h-6 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 12L6 8l4-4" />
                </svg>
              </button>
            )}
            <span className="text-sm text-white/70">{menuTitle}</span>
          </div>

          {/* Search bar only in "all" view */}
          {menuView === 'all' && (
            <div className="p-3 border-b border-white/10">
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* Main view: manufacturer groups + "all" button */}
            {menuView === 'main' && (
              <>
                {FEATURED.map(group => (
                  <button
                    key={group.manufacturer}
                    onClick={() => {
                      setSelectedManufacturer(group.manufacturer);
                      setMenuView('manufacturer');
                    }}
                    className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span className="text-sm text-white/90">{group.manufacturer}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-white/25 font-mono">{group.models.length}</span>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                        <path d="M6 4l4 4-4 4" />
                      </svg>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setMenuView('all')}
                  className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-white/40">Tous les avions</span>
                  <span className="text-[11px] text-white/20 font-mono ml-2">{planes.length}</span>
                </button>
              </>
            )}

            {/* Manufacturer view: models of one manufacturer */}
            {menuView === 'manufacturer' && manufacturerModels.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePlaneSelect(p)}
                className="w-full text-left px-4 py-2.5 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="text-sm text-white/90">{p.name}</div>
                <div className="text-[11px] text-white/30 font-mono mt-0.5">{p.iata}</div>
              </button>
            ))}

            {/* All view: full searchable list */}
            {menuView === 'all' && (
              <>
                {filteredPlanes.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handlePlaneSelect(p)}
                    className="w-full text-left px-4 py-2.5 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="text-sm text-white/90">{p.name}</div>
                    <div className="text-[11px] text-white/30 font-mono mt-0.5">{p.iata} / {p.icao}</div>
                  </button>
                ))}
                {filteredPlanes.length === 0 && (
                  <p className="text-sm text-white/30 text-center py-6">Aucun resultat</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Route Card */}
      {selectedRoute && (
        <div onClick={e => e.stopPropagation()}>
          <RouteCard
            route={selectedRoute}
            airlines={airlines}
            onClose={() => setSelectedRoute(null)}
          />
        </div>
      )}

      {/* Routes list */}
      {selectedPlane && (
        <div className="absolute top-16 left-8 w-72 max-h-[calc(100vh-100px)] flex flex-col z-10" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleReset}
            className="mb-2 flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer self-start"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Retour
          </button>
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="p-3 border-b border-white/10">
            <p className="text-sm text-white/90">{selectedPlane.name}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{filteredRoutes.length} routes</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {arcsData.map((arc, i) => {
              const airline = airlines[arc.airlineId];
              const isActive = selectedRoute && selectedRoute.idx === arc.idx;
              return (
                <button
                  key={i}
                  ref={isActive ? el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
                  onClick={() => handleArcClick(arc)}
                  className={`w-full text-left px-3 py-2 border-b border-white/5 transition-colors cursor-pointer flex items-center gap-2 ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}
                >
                  <span className={`text-sm font-mono ${isActive ? 'text-white' : 'text-white/90'}`}>{arc.src.iata}</span>
                  <span className="text-white/20 text-xs">—</span>
                  <span className={`text-sm font-mono ${isActive ? 'text-white' : 'text-white/90'}`}>{arc.dst.iata}</span>
                  <span className="text-[11px] text-white/30 ml-auto truncate max-w-[100px]">
                    {airline?.name || arc.airlineCode}
                  </span>
                </button>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import { loadPlanes, loadAirports, loadAirlines, loadRoutes } from './dataLoader';
import { RouteCard } from './RouteCard';
import { AircraftPicker } from './AircraftPicker';

// Land color palette — varied greens for a cartoon map look
const LAND_PALETTE = ['#3a9d68', '#2d8f5c', '#52b788', '#40916c', '#2d6a4f'];

// Arc distance in km
function arcDist(arc) {
  const R = 6371;
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(arc.dst.lat - arc.src.lat);
  const dLon = toRad(arc.dst.lng - arc.src.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(arc.src.lat)) * Math.cos(toRad(arc.dst.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Color by range category
function arcBaseColor(dist) {
  if (dist < 800)  return '#34d399'; // court  – emerald
  if (dist < 3000) return '#fbbf24'; // moyen  – amber
  return '#f472b6';                  // long   – fuchsia
}

// Arc altitude scales with distance so long routes arc higher
function arcAltitude(dist) {
  if (dist < 1000) return 0.08;
  if (dist < 4000) return 0.18;
  return 0.32;
}

export function App() {
  const globeRef = useRef();
  const [countries, setCountries]   = useState([]);
  const [planes, setPlanes]         = useState([]);
  const [airports, setAirports]     = useState({});
  const [airlines, setAirlines]     = useState({});
  const [allRoutes, setAllRoutes]   = useState([]);
  const [loading, setLoading]       = useState(true);

  const [selectedPlane, setSelectedPlane] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [hoveredArc, setHoveredArc]       = useState(null);
  const [showPicker, setShowPicker]       = useState(false);

  // Solid ocean material — applied instead of the photorealistic texture
  const oceanMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: '#16548a', shininess: 6 }),
    []
  );

  // Load world countries TopoJSON → GeoJSON features
  useEffect(() => {
    fetch('/data/countries-110m.json')
      .then(r => r.json())
      .then(topo => setCountries(feature(topo, topo.objects.countries).features));
  }, []);

  // Load flight data
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
      const ctrl = globeRef.current.controls();
      ctrl.autoRotate      = true;
      ctrl.autoRotateSpeed = 0.4;
      globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 });
    }
  }, [loading]);

  const planesByIata = useMemo(() => {
    const map = {};
    for (const p of planes) map[p.iata] = p;
    return map;
  }, [planes]);

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

  const arcsData = useMemo(() =>
    filteredRoutes.map((r, i) => {
      const src = airports[r.srcAirportId] || airports[r.srcAirportCode];
      const dst = airports[r.dstAirportId] || airports[r.dstAirportCode];
      const dist = arcDist({ src, dst });
      return { ...r, src, dst, idx: i, dist };
    }),
  [filteredRoutes, airports]);

  const routeAirports = useMemo(() => {
    const map = new Map();
    for (const arc of arcsData) {
      if (arc.src) map.set(arc.src.iata, arc.src);
      if (arc.dst) map.set(arc.dst.iata, arc.dst);
    }
    return Array.from(map.values());
  }, [arcsData]);

  const handlePlaneSelect = useCallback((plane) => {
    setSelectedPlane(plane);
    setSelectedRoute(null);
    setShowPicker(false);
    if (globeRef.current) globeRef.current.controls().autoRotate = false;
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
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 1000);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-[#060e1a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-200/40 text-xs tracking-widest uppercase">Chargement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#060e1a]">

      {/* ── Cartoon globe ──────────────────────────────────────── */}
      <Globe
        ref={globeRef}
        globeImageUrl=""
        bumpImageUrl=""
        globeMaterial={oceanMaterial}
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#4da6ff"
        atmosphereAltitude={0.22}

        /* Country polygons */
        polygonsData={countries}
        polygonCapColor={d => LAND_PALETTE[parseInt(d.id ?? 0) % LAND_PALETTE.length]}
        polygonSideColor={() => '#1e6e45'}
        polygonStrokeColor={() => '#a8f0c0'}
        polygonAltitude={0.008}

        /* Flight arcs */
        arcsData={arcsData}
        arcStartLat={d => d.src.lat}
        arcStartLng={d => d.src.lng}
        arcEndLat={d => d.dst.lat}
        arcEndLng={d => d.dst.lng}
        arcAltitude={d => arcAltitude(d.dist)}
        arcColor={d => {
          const c = arcBaseColor(d.dist);
          if (selectedRoute?.idx === d.idx) return ['#ffffff', '#ffffff'];
          if (hoveredArc?.idx  === d.idx)  return [c, c];
          return [`${c}cc`, `${c}cc`];
        }}
        arcStroke={d => {
          if (selectedRoute?.idx === d.idx) return 2.5;
          if (hoveredArc?.idx  === d.idx)  return 1.4;
          return 0.55;
        }}
        arcDashLength={0.65}
        arcDashGap={0.2}
        arcDashAnimateTime={2200}
        onArcClick={handleArcClick}
        onArcHover={setHoveredArc}
        arcLabel={d => {
          const al  = airlines[d.airlineId];
          const col = arcBaseColor(d.dist);
          return `<div style="background:rgba(6,14,26,0.96);padding:8px 12px;border-radius:10px;border:1px solid rgba(77,166,255,0.25);font-family:system-ui;font-size:12px;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.6)">
            <div style="font-size:14px;font-weight:700;letter-spacing:0.06em">${d.src.iata} → ${d.dst.iata}</div>
            <div style="color:rgba(255,255,255,0.45);margin-top:3px">${al?.name || d.airlineCode}</div>
            <div style="color:${col};margin-top:5px;font-size:11px;font-weight:700">${Math.round(d.dist).toLocaleString()} km</div>
          </div>`;
        }}

        /* Airport dots */
        pointsData={routeAirports}
        pointLat={d => d.lat}
        pointLng={d => d.lng}
        pointAltitude={0.012}
        pointRadius={0.22}
        pointColor={() => '#ffffffcc'}
        pointLabel={d => `<div style="background:rgba(6,14,26,0.96);padding:6px 10px;border-radius:8px;border:1px solid rgba(77,166,255,0.2);font-family:system-ui;font-size:12px;color:#fff">
          <strong>${d.iata}</strong> — ${d.city}<br/>
          <span style="color:rgba(255,255,255,0.4)">${d.country}</span>
        </div>`}

        onGlobeClick={() => setSelectedRoute(null)}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 px-5 py-4 flex items-center justify-between z-10 pointer-events-none">
        {/* Logo */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/25 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SkyRoute</span>
        </div>

        {/* Active plane pill */}
        {selectedPlane && (
          <div className="pointer-events-auto flex items-center gap-3 bg-black/55 backdrop-blur-xl border border-white/12 rounded-full pl-4 pr-2 py-2">
            <span className="text-[11px] text-white/35 font-mono">{arcsData.length} routes</span>
            <div className="w-px h-3.5 bg-white/12" />
            <span className="text-white text-sm font-semibold">{selectedPlane.name}</span>
            <button
              onClick={handleReset}
              className="w-6 h-6 rounded-full bg-white/8 hover:bg-red-400/25 flex items-center justify-center text-white/35 hover:text-red-300 transition-all cursor-pointer text-lg leading-none"
              title="Désélectionner"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* ── Distance legend ─────────────────────────────────────── */}
      {selectedPlane && (
        <div className="absolute top-[72px] right-5 z-10 bg-black/60 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/8">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2.5 font-semibold">Portée</p>
          {[
            ['#34d399', '< 800 km',      'Court courrier'],
            ['#fbbf24', '800–3 000 km',  'Moyen courrier'],
            ['#f472b6', '> 3 000 km',    'Long courrier'],
          ].map(([color, range, label]) => (
            <div key={color} className="flex items-center gap-2.5 mb-2 last:mb-0">
              <div className="w-7 h-2 rounded-full shrink-0" style={{ background: color }} />
              <div>
                <p className="text-[11px] text-white/55 leading-none">{label}</p>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{range}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Route detail card ──────────────────────────────────── */}
      {selectedRoute && (
        <div onClick={e => e.stopPropagation()}>
          <RouteCard
            route={selectedRoute}
            airlines={airlines}
            onClose={() => setSelectedRoute(null)}
          />
        </div>
      )}

      {/* ── Bottom action button ────────────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        {!selectedPlane ? (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2.5 bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold px-7 py-3.5 rounded-full shadow-xl shadow-blue-500/35 transition-all cursor-pointer tracking-wide text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            Choisir un avion
          </button>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/18 backdrop-blur border border-white/12 text-white/75 hover:text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all cursor-pointer"
          >
            Changer d&apos;avion
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Aircraft picker modal ───────────────────────────────── */}
      {showPicker && (
        <AircraftPicker
          planes={planes}
          planesByIata={planesByIata}
          selectedPlane={selectedPlane}
          onSelect={handlePlaneSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

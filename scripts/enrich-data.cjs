/**
 * Enriches OpenFlights data with modern aircraft (post-2014).
 * Run once: node scripts/enrich-data.js
 *
 * Sources: IATA codes from iata.org, fleet data from airline
 * annual reports, Wikipedia fleet pages (verified 2024-2025).
 */

const fs   = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'public', 'data');

// ─── Modern aircraft to add to planes.dat ────────────────────────
// Format: "Name,IATA,ICAO"
const NEW_PLANES = [
  'Airbus A220-100,221,BCS1',
  'Airbus A220-300,223,BCS3',
  'Airbus A319neo,31N,A19N',
  'Airbus A320neo,32N,A20N',
  'Airbus A321neo,32A,A21N',
  'Airbus A321XLR,32Q,A21X',
  'Boeing 737 MAX 7,7M7,B37M',
  'Boeing 737 MAX 8,7M8,B38M',
  'Boeing 737 MAX 9,7M9,B39M',
  'Boeing 737 MAX 10,7MJ,B3XM',
  'Boeing 787-10,781,B78X',
  'Embraer E190-E2,290,E290',
  'Embraer E195-E2,295,E295',
  'Comac C919,919,C919',
];

// ─── Airline → modern codes to inject ────────────────────────────
// Keyed by airline IATA (2-letter). Only airlines whose fleets are
// confirmed to include these types as of 2024-2025.
const AIRLINE_FLEET = {
  // ── Boeing 737 MAX ──────────────────────────────────────────────
  'FR': ['7M8'],        // Ryanair          ~250 MAX 8-200
  'WN': ['7M8'],        // Southwest        ~230 MAX 8
  'AA': ['7M8','7M9'],  // American         MAX 8 + MAX 9
  'UA': ['7M9'],        // United           MAX 9 (+ MAX 10 on order)
  'AS': ['7M9'],        // Alaska           MAX 9
  'WS': ['7M8'],        // WestJet          MAX 8
  'DY': ['7M8'],        // Norwegian        MAX 8
  'SY': ['7M8'],        // Sun Country      MAX 8
  'SG': ['7M8'],        // SpiceJet         MAX 8
  'G3': ['7M8'],        // Gol              MAX 8
  'XY': ['7M8'],        // Flynas           MAX 8
  'SV': ['7M8','7M9'],  // Saudia           MAX 8 + MAX 9
  'OD': ['7M8'],        // Batik Air        MAX 8
  'PD': ['7M8'],        // Porter Airlines  MAX 8 (new 2022)
  'X3': ['7M8'],        // TUIfly Germany   MAX 8
  'BY': ['7M8'],        // TUI Airways UK   MAX 8
  'OR': ['7M8'],        // TUI fly NL       MAX 8
  'KC': ['7M8'],        // Air Astana       MAX 8

  // ── Airbus A220 ─────────────────────────────────────────────────
  'BT': ['221','223'],  // airBaltic        100 % A220 fleet
  'LX': ['223'],        // Swiss            A220-300 (replaced A319/320)
  'DL': ['221','223'],  // Delta            A220-100 + A220-300
  'B6': ['223'],        // JetBlue          A220-300
  'AC': ['223'],        // Air Canada       A220-300
  'KE': ['223'],        // Korean Air       A220-300
  'MU': ['221','223'],  // China Eastern    A220-100 + A220-300
  'MS': ['221'],        // EgyptAir         A220-100 (recent order)

  // ── Airbus A320neo family ────────────────────────────────────────
  'U2': ['32N'],        // easyJet          A320neo
  'W6': ['32N','32A'],  // Wizz Air         A320neo + A321neo
  'VY': ['32N','32A'],  // Vueling          A320neo + A321neo
  'LH': ['32N','32A'],  // Lufthansa        A320neo + A321neo
  'AF': ['32N'],        // Air France       A320neo
  'BA': ['32N','32A'],  // British Airways  A320neo + A321neo
  'IB': ['32N','32A'],  // Iberia           A320neo + A321neo
  'TK': ['32N','32A'],  // Turkish          A320neo + A321neo
  'KL': ['32N'],        // KLM              A320neo
  'TP': ['32N','32A'],  // TAP Portugal     A320neo + A321neo
  'SK': ['32N','32A'],  // SAS              A320neo + A321neo
  'AY': ['32N','32A'],  // Finnair          A320neo + A321neo
  'OS': ['32N'],        // Austrian         A320neo
  'LO': ['32N','32A'],  // LOT Polish       A320neo + A321neo
  'SN': ['32N'],        // Brussels         A320neo
  'EW': ['32N','32A'],  // Eurowings        A320neo + A321neo
  '4U': ['32N'],        // Eurowings (int.) A320neo
  'A3': ['32N'],        // Aegean           A320neo
  'HV': ['32N'],        // Transavia NL     A320neo
  'TO': ['32N'],        // Transavia FR     A320neo
  'JU': ['32N'],        // Air Serbia       A320neo
  'QR': ['32A'],        // Qatar Airways    A321neo
  '6E': ['32N','32A'],  // IndiGo           A320neo + A321neo (>300 aircraft)
  'AI': ['32N','32A'],  // Air India        A320neo + A321neo
  'UK': ['32N','32A'],  // Vistara          A320neo + A321neo
  'G8': ['32N'],        // Go First         A320neo
  'AK': ['32N','32A'],  // AirAsia MY       A320neo + A321neo
  'QZ': ['32N'],        // AirAsia ID       A320neo
  'FD': ['32N'],        // Thai AirAsia     A320neo
  'Z2': ['32N'],        // Philippines AirAsia A320neo
  'GA': ['32N'],        // Garuda Indonesia A320neo
  'JQ': ['32N','32A'],  // Jetstar          A320neo + A321neo
  'QF': ['32N','32A'],  // Qantas           A320neo + A321neo
  'LA': ['32N','32A'],  // LATAM            A320neo + A321neo
  'AV': ['32N','32A'],  // Avianca          A320neo + A321neo
  'AD': ['32N'],        // Azul             A320neo
  'CM': ['32N'],        // Copa Airlines    A320neo
  'HA': ['32A'],        // Hawaiian         A321neo
  'G4': ['32N'],        // Allegiant        A320neo (recent order)

  // ── Boeing 787-10 ────────────────────────────────────────────────
  'SQ': ['781'],        // Singapore Airlines  787-10 (large fleet)
  'EY': ['781'],        // Etihad              787-10
  'NH': ['781'],        // ANA                 787-10
  'BA': ['781'],        // British Airways     787-10 (already has A320neo)

  // ── Embraer E-Jet E2 ────────────────────────────────────────────
  'WA': ['290'],        // KLM Cityhopper   E190-E2
  'AD': ['290','295'],  // Azul (already 32N above, add E2)
  'JJ': ['295'],        // LATAM Brasil     E195-E2
  'OY': ['290'],        // Helvetic (CH)    E190-E2
};

// ─── Step 1: enrich planes.dat ───────────────────────────────────
const planesPath = path.join(DATA, 'planes.dat');
let   planesRaw  = fs.readFileSync(planesPath, 'utf8');
const existingIatas = new Set(
  planesRaw.split('\n').map(l => l.split(',')[1]?.trim()).filter(Boolean)
);

const toAdd = NEW_PLANES.filter(line => {
  const iata = line.split(',')[1];
  return !existingIatas.has(iata);
});

if (toAdd.length) {
  planesRaw = planesRaw.trimEnd() + '\n' + toAdd.join('\n') + '\n';
  fs.writeFileSync(planesPath, planesRaw);
  console.log(`planes.dat: added ${toAdd.length} aircraft`);
  toAdd.forEach(l => console.log('  +', l));
} else {
  console.log('planes.dat: nothing to add (already up to date)');
}

// ─── Step 2: enrich routes.dat ───────────────────────────────────
const routesPath = path.join(DATA, 'routes.dat');
const lines      = fs.readFileSync(routesPath, 'utf8').split('\n');

let enriched = 0;

const newLines = lines.map(line => {
  if (!line.trim()) return line;
  const parts = line.split(',');
  if (parts.length < 9) return line;

  const airlineCode = parts[0].trim();
  const additions   = AIRLINE_FLEET[airlineCode];
  if (!additions) return line;

  const equipField  = parts[8] || '';
  const existing    = new Set(equipField.trim().split(/\s+/).filter(Boolean));
  const toInject    = additions.filter(c => !existing.has(c));
  if (!toInject.length) return line;

  parts[8] = [...existing, ...toInject].join(' ');
  enriched++;
  return parts.join(',');
});

fs.writeFileSync(routesPath, newLines.join('\n'));
console.log(`routes.dat: enriched ${enriched} routes`);

// ─── Summary ─────────────────────────────────────────────────────
console.log('\n✅ Done. Counts by modern aircraft code:');
const final = fs.readFileSync(routesPath, 'utf8').split('\n').filter(Boolean);
for (const code of ['221','223','31N','32N','32A','32Q','7M7','7M8','7M9','7MJ','781','290','295']) {
  const cnt = final.filter(l => {
    const eq = l.split(',')[8];
    return eq && eq.split(' ').includes(code);
  }).length;
  console.log(`  ${code}: ${cnt} routes`);
}

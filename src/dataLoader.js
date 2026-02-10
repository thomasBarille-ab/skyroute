import Papa from 'papaparse';

async function fetchAndParse(url) {
  const res = await fetch(url);
  const text = await res.text();
  return Papa.parse(text, { skipEmptyLines: true }).data;
}

export async function loadPlanes() {
  const rows = await fetchAndParse('/data/planes.dat');
  return rows
    .map(r => ({
      name: r[0],
      iata: r[1],
      icao: r[2],
    }))
    .filter(p => p.iata && p.iata !== '\\N');
}

export async function loadAirports() {
  const rows = await fetchAndParse('/data/airports.dat');
  const map = {};
  for (const r of rows) {
    const id = r[0];
    const iata = r[4];
    if (!iata || iata === '\\N') continue;
    map[id] = {
      id,
      name: r[1],
      city: r[2],
      country: r[3],
      iata,
      icao: r[5],
      lat: parseFloat(r[6]),
      lng: parseFloat(r[7]),
    };
    // Also index by IATA for quick lookup
    map[iata] = map[id];
  }
  return map;
}

export async function loadAirlines() {
  const rows = await fetchAndParse('/data/airlines.dat');
  const map = {};
  for (const r of rows) {
    const id = r[0];
    map[id] = {
      id,
      name: r[1],
      iata: r[3],
      icao: r[4],
      country: r[6],
      active: r[7] === 'Y',
    };
  }
  return map;
}

export async function loadRoutes() {
  const rows = await fetchAndParse('/data/routes.dat');
  return rows.map(r => ({
    airlineCode: r[0],
    airlineId: r[1],
    srcAirportCode: r[2],
    srcAirportId: r[3],
    dstAirportCode: r[4],
    dstAirportId: r[5],
    codeshare: r[6],
    stops: parseInt(r[7]) || 0,
    equipment: r[8] ? r[8].split(' ') : [],
  }));
}

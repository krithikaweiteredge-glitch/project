// Talks to the IVHM live server (/api via the dev proxy). When a vehicle type has no aircraft in the live
// fleet, the page uses demo values instead, made up per part and always labelled "Demo data" in the UI.
import { partInfo, VEHICLES } from './data';

const get = async (path) => {
  const r = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};

export async function fetchFleet() {
  try { return (await get('/api/fleet')).aircraft || []; } catch { return null; }   // null = server not reachable
}
export async function fetchAircraft(id) { return get(`/api/aircraft/${encodeURIComponent(id)}`); }
export async function fetchHistory(aid, cid) {
  try { return await get(`/api/aircraft/${encodeURIComponent(aid)}/${encodeURIComponent(cid)}/history`); } catch { return null; }
}

/** the live aircraft (if any) whose 3D look is this vehicle type */
export const liveFor = (fleet, look) => (fleet || []).find((a) => a.look === look || a.type_id === look);

/** one part's live record -> the shape the panel draws */
export function fromLive(cid, c, hist) {
  const cond = c.condition || {}, as = c.assessment || {}, info = partInfo(cid);
  const status = hist?.status || [];
  const readings = hist?.readings || [];
  const channels = {};
  for (const r of readings.slice(-240)) for (const [k, v] of Object.entries(r.channels || {})) (channels[k] = channels[k] || []).push(v);
  return {
    id: cid, name: info.name, live: true, pack: c.pack_name || info.pack, maturity: c.maturity, serial: c.serial,
    verdict: as.verdict || cond.suggest || 'UNKNOWN', health: as.health ?? cond.health, subparts: cond.parts || {},
    rul: as.rul || cond.rul, reason: cond.reason, evidence: cond.evidence || [], why: as.why || [],
    sensors: cond.sensor_status || {}, plan: as.plan || [], usage: c.usage, note: cond.note, watches: info.watches,
    series: status.filter((s) => s.health != null).map((s) => ({ t: s.t, h: s.health, lo: s.assessment?.rul?.lo, mean: s.assessment?.rul?.mean, hi: s.assessment?.rul?.hi })),
    channels,
  };
}

// ---------- demo values (deterministic per vehicle + part) ----------
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const SUB = {
  'Electric motor': ['bearing', 'winding', 'magnets'], Engine: ['compressor', 'turbine', 'oil system'], Battery: ['capacity', 'resistance'],
  'Hydraulic system': ['pump', 'valve', 'accumulator', 'cooler'], 'Landing gear': ['retraction', 'shock strut', 'brakes'], 'Skid landing gear': ['cross tubes', 'skid shoes', 'fittings'],
  'Main gearbox': ['gears', 'bearings', 'oil'], Propeller: ['balance', 'blades'], 'Speed controller': ['switches', 'capacitors'],
};

export function demoPart(look, cid, pick) {
  const r = rng(look + ':' + cid), info = partInfo(cid, look), unit = VEHICLES[look]?.unit || 'hours';
  // one part per vehicle is the interesting one: the picked part shows a developing fault
  let health = 0.72 + r() * 0.26;
  if (pick === 'caution') health = 0.42 + r() * 0.1;
  if (pick === 'nogo') health = 0.12 + r() * 0.08;
  const verdict = pick === 'nogo' ? 'NO-GO' : pick === 'caution' ? 'CAUTION' : 'SAFE';
  const life = Math.round((health * 300 + r() * 60) * (unit === 'days' ? 12 : 1));
  const span = 0.25 + r() * 0.2;
  const subs = (SUB[info.label] || []).reduce((o, k, i) => ({ ...o, [k]: i === 0 ? health : Math.min(1, health + 0.1 + r() * 0.3) }), {});
  const N = 60, series = [];
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1), h = 1 - (1 - health) * Math.pow(x, 1.6) + (r() - 0.5) * 0.025;
    const m = life + (1 - x) * life * 0.9;
    series.push({ t: i, h: Math.max(0, Math.min(1, h)), mean: m, lo: m * (1 - span * (1.4 - x * 0.6)), hi: m * (1 + span * (1.1 - x * 0.5)) });
  }
  const channels = {};
  info.sensors.slice(0, 4).forEach((s, k) => {
    const base = 20 + r() * 80, drift = k === 0 && pick ? 0.3 : 0.04;
    channels[s] = Array.from({ length: 120 }, (_, i) => base * (1 + drift * (i / 120) + (r() - 0.5) * 0.06 + 0.03 * Math.sin(i / 6 + k)));
  });
  const sensors = Object.fromEntries(info.sensors.map((s, k) => [s, pick === 'caution' && k === info.sensors.length - 1 ? 'drifting' : 'ok']));
  const evidence = pick === 'nogo'
    ? [`${info.label}: damage indicator past its limit (1.08 of 1.00)`, 'Trend confirmed over the last 3 runs, not a one-off', 'Grounded until inspected']
    : pick === 'caution'
      ? [`${info.label}: change from new is ${Math.round((1 - health) * 60)}% of the way to the limit`, 'Rising for 12 runs in a row', 'Inspect at the next stop']
      : [`Within its learned normal (anomaly score ${(8 + r() * 8).toFixed(1)}, watch at 22.4)`, 'No trend in the last 50 runs'];
  return {
    id: cid, name: info.name, live: false, pack: info.pack, maturity: 'Demo', serial: `${cid.toUpperCase().replace(/_/g, '-')}-${Math.floor(1000 + r() * 8999)}`,
    verdict, health, subparts: subs, rul: { mean: life, lo: Math.round(life * (1 - span)), hi: Math.round(life * (1 + span * 0.8)), unit, coverage: 0.95 },
    reason: pick ? `Weakest: ${Object.keys(subs)[0] || info.label.toLowerCase()} (health ${Math.round(health * 100)}%)` : 'Within learned normal',
    evidence, why: pick ? [evidence[0]] : [], sensors,
    plan: [
      pick && { what: pick === 'nogo' ? `Replace ${info.label.toLowerCase()}` : `Inspect ${info.label.toLowerCase()}`, urgency: pick === 'nogo' ? 'Before the next run' : `Within ${Math.round(5 + r() * 10)} ${unit}`, basis: 'condition', required: true },
      { what: 'Scheduled inspection', urgency: `Routine: due in ${Math.round(20 + r() * 200)} ${unit}`, basis: 'interval', required: false },
    ].filter(Boolean),
    usage: { runs: Math.round(80 + r() * 400), run_unit: unit }, note: 'Demo data: made up for this page, not from a live twin.',
    watches: info.watches, series, channels,
  };
}

/**
 * demo record for every part of a vehicle: one NO-GO, one CAUTION, the rest SAFE (NO-GO only for 6+ parts).
 * calm: all SAFE - used to fill the parts a live aircraft does not report, so made-up faults never
 * appear on a real aircraft.
 */
export function demoVehicle(look, ids, calm = false) {
  const r = rng(look);
  const order = [...ids].sort(() => r() - 0.5);
  const picks = calm ? {} : { [order[0]]: 'caution' };
  if (!calm && ids.length >= 6) picks[order[1]] = 'nogo';
  return Object.fromEntries(ids.map((id) => [id, demoPart(look, id, picks[id])]));
}

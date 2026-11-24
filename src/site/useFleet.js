import { useEffect, useState } from 'react';
import { fetchFleet } from './api';
import { VEHICLES } from './data';

// one shared poll of /api/fleet for the whole site (null until known, [] or null when the server is down)
let fleet, subs = new Set(), timer;
async function poll() {
  // only the aircraft types the site covers (helicopters, fighters, UAVs, drones)
  const all = await fetchFleet();
  fleet = all ? all.filter((a) => VEHICLES[a.look]) : all;
  subs.forEach((f) => f(fleet));
}
export function useFleet() {
  const [v, setV] = useState(fleet);
  useEffect(() => {
    subs.add(setV);
    if (!timer) { poll(); timer = setInterval(poll, 8000); }
    return () => { subs.delete(setV); if (!subs.size) { clearInterval(timer); timer = null; } };
  }, []);
  return v;
}

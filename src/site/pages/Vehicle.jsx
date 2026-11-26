import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLenis } from '../ui/motion';
import * as THREE from 'three';
import { VEHICLES, catOf, verdictOf, healthColor, groupOf, GROUP_ORDER } from '../data';
import { href } from '../router';
import { useFleet } from '../useFleet';
import { demoVehicle, fetchAircraft, fetchHistory, fromLive, liveFor } from '../api';
import { buildModel } from '../three/models';
import VehicleScene from '../three/VehicleScene';
import { useGLTF } from '@react-three/drei';
import { composeLaunch, composeSatellite, DRACO, NASA } from '../three/realmodels';
import { composeSu30, SU30_URL } from '../three/su30';
import { composeTejas, TEJAS_URL } from '../three/tejas';
import { composeM300, M300_URL } from '../three/m300';
import { composeA321, A321_URL } from '../three/a321';
import { composeRustom, RUSTOM_URL } from '../three/rustom';
import Inspector from '../ui/Inspector';

const RANK = { 'NO-GO': 0, NO_GO: 0, CAUTION: 1, UNKNOWN: 2, SAFE: 3, GO: 3 };
const isFlag = (v) => v === 'NO-GO' || v === 'NO_GO' || v === 'CAUTION';

/** the vehicle's 3D model: a real model where there is one (Su-30MKI, Tejas, Air India A321, Rustom-2, Matrice 300),
 *  otherwise built in code to match the aircraft in its photo (Dhruv) */
export default function Vehicle({ look }) {
  const l = VEHICLES[look] ? look : 'quadcopter';
  if (l === 'fighter_twin_engine') return <Su30Vehicle />;
  if (l === 'fighter_single_engine') return <TejasVehicle />;
  if (l === 'quadcopter') return <M300Vehicle />;
  if (l === 'airliner_narrowbody') return <RealVehicle look={l} url={A321_URL} compose={composeA321} />;
  if (l === 'male_uav') return <RealVehicle look={l} url={RUSTOM_URL} compose={composeRustom} />;
  if (l === 'satellite') return <HubbleVehicle />;
  if (l === 'launch_vehicle') return <LaunchVehicle />;
  return <BuiltVehicle look={look} />;
}
function BuiltVehicle({ look }) {
  const model = useMemo(() => buildModel(VEHICLES[look] ? look : 'quadcopter', []), [look]);
  return <VehicleView look={look} model={model} />;
}

function Su30Vehicle() {
  const { scene } = useGLTF(SU30_URL);
  const model = useMemo(() => composeSu30(scene), [scene]);
  return <VehicleView look="fighter_twin_engine" model={model} />;
}

function TejasVehicle() {
  const { scene } = useGLTF(TEJAS_URL);
  const model = useMemo(() => composeTejas(scene), [scene]);
  return <VehicleView look="fighter_single_engine" model={model} />;
}

/** a real model split into IVHM's parts by its compose function */
function RealVehicle({ look, url, compose }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => compose(scene), [scene, compose]);
  return <VehicleView look={look} model={model} />;
}
function M300Vehicle() {
  const { scene } = useGLTF(M300_URL);
  const model = useMemo(() => composeM300(scene), [scene]);
  return <VehicleView look="quadcopter" model={model} />;
}

function HubbleVehicle() {
  const { scene } = useGLTF(NASA.hubble, DRACO);
  const model = useMemo(() => composeSatellite(scene), [scene]);
  return <VehicleView look="satellite" model={model} />;
}
function LaunchVehicle() {
  const et = useGLTF(NASA.et, DRACO).scene, srb = useGLTF(NASA.srb, DRACO).scene;
  const model = useMemo(() => composeLaunch(et, srb), [et, srb]);
  return <VehicleView look="launch_vehicle" model={model} />;
}

function VehicleView({ look, model }) {
  const v = VEHICLES[look] || VEHICLES.quadcopter;
  const cat = catOf(v.look);
  const ids = useMemo(() => Object.keys(model.parts), [model]);

  // the live aircraft of this type, if the platform has one
  const fleet = useFleet();
  const liveAc = liveFor(fleet, v.look);
  const demo = useMemo(() => demoVehicle(v.look, ids, !!liveAc), [v.look, ids, !!liveAc]);
  const [ac, setAc] = useState(null);
  useEffect(() => {
    if (!liveAc) { setAc(null); return; }
    let stop = false;
    const load = () => fetchAircraft(liveAc.id).then((a) => { if (!stop) setAc(a); }).catch(() => {});
    load(); const t = setInterval(load, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [liveAc?.id]);

  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [hist, setHist] = useState(null);
  useEffect(() => {
    setHist(null);
    if (!sel || !ac?.components?.[sel]) return;
    let stop = false;
    const load = () => fetchHistory(ac.id, sel).then((h) => { if (!stop) setHist(h); });
    load(); const t = setInterval(load, 6000);
    return () => { stop = true; clearInterval(t); };
  }, [sel, ac?.id]);

  const parts = useMemo(() => Object.fromEntries(ids.map((id) => {
    const c = ac?.components?.[id];
    return [id, c ? fromLive(id, c, id === sel ? hist : null) : demo[id]];
  })), [ids, ac, demo, sel, hist]);
  const sorted = useMemo(() => [...ids].sort((a, b) => (RANK[parts[a].verdict] ?? 2) - (RANK[parts[b].verdict] ?? 2) || (parts[a].health ?? 1) - (parts[b].health ?? 1)), [ids, parts]);
  const walk = useMemo(() => [...ids].sort((a, b) => GROUP_ORDER.indexOf(groupOf(a)) - GROUP_ORDER.indexOf(groupOf(b)) || a.localeCompare(b, undefined, { numeric: true })), [ids]);
  const flagged = sorted.filter((id) => isFlag(parts[id].verdict));
  const overall = ac?.summary?.verdict || (flagged.some((id) => parts[id].verdict.startsWith('NO')) ? 'NO-GO' : flagged.length ? 'CAUTION' : 'SAFE');
  const counts = useMemo(() => ids.reduce((o, id) => { const k = parts[id].verdict.startsWith('NO') ? 'nogo' : parts[id].verdict === 'CAUTION' ? 'caution' : 'safe'; o[k]++; return o; }, { safe: 0, caution: 0, nogo: 0 }), [ids, parts]);
  const liveCount = ids.filter((id) => parts[id].live).length;

  // the inspector is inline: it renders only while on screen; keys work while it is in view
  const boxRef = useRef();
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    if (boxRef.current) io.observe(boxRef.current);
    return () => io.disconnect();
  }, []);
  const step = useCallback((d) => {
    setSel((cur) => { const k = cur ? walk.indexOf(cur) : -1; return walk[(k + d + walk.length) % walk.length]; });
  }, [walk]);
  const cmd = useRef({ zoom: 1, reset: false });
  useEffect(() => {
    const k = (e) => {
      if (!inView || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'Escape') { setSel(null); cmd.current.reset = true; }
      if (e.key === '+' || e.key === '=') cmd.current.zoom = 0.85;
      if (e.key === '-') cmd.current.zoom = 1.18;
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [inView, step]);
  const insets = useRef({ x: 0, y: 0, zoom: 1.25 });            // the inline viewer starts a little further out
  const progress = useRef(3.2);
  const toInspector = () => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // #/vehicle/<type>/inspect opens straight on the inspector (the footer's "Live digital twin" link)
  const lenis = useLenis();
  useEffect(() => {
    if (!location.hash.endsWith('/inspect')) return;
    // through the smooth-scroll engine, after the page's own scroll-to-top has run
    const t = setTimeout(() => {
      if (lenis && boxRef.current) lenis.scrollTo(boxRef.current, { offset: -70, duration: 1.2 });
      else toInspector();
    }, 600);
    return () => clearTimeout(t);
  }, [look, lenis]);

  // canvas for the PDF snapshot
  const gl = useRef();
  const [toast, setToast] = useState('');
  const download = async () => {
    setToast('Preparing the condition report…');
    try {
      const { downloadReport } = await import('../report');
      let snapshot = null;
      try { snapshot = gl.current?.domElement.toDataURL('image/jpeg', 0.9); } catch { /* no snapshot */ }
      await downloadReport({ vehicle: v, aircraft: ac, parts, order: sorted, overall, counts, snapshot });
      setToast('Report downloaded');
    } catch (e) {
      console.error('report failed', e);
      setToast('Could not build the report: ' + e.message);
    }
    setTimeout(() => setToast(''), 3200);
  };

  const cur = sel ? parts[sel] : null;
  const vd = verdictOf(overall);
  return (
    <div className="vpage">
      {/* ---------------- the aircraft ---------------- */}
      <section className="vhero">
        {v.photo && <img src={v.photo} alt={v.name} />}
        <div className="vhero-shade" />
        <div className="vhero-copy">
          <a className="crumb" href={href('platforms')}>← Platforms · {cat?.name}</a>
          <h1>{v.name}</h1>
          <p className="vhero-tag">{v.tag}</p>
          <p className="vhero-text">{v.text}</p>
          <div className="tally">
            <span className="pill" style={{ '--c': vd.color }}><i />{vd.word}</span>
            <span className="pill" style={{ '--c': '#f5f5f7' }}>{ids.length} monitored parts</span>
            <span className="pill" style={{ '--c': liveAc ? 'var(--safe)' : '#b0b0b8' }}><i />{liveAc ? `Live · ${liveAc.id} · ${liveCount} parts reporting` : 'Demo data'}</span>
          </div>
          <div className="hero3d-cta">
            <button className="btn solid" onClick={toInspector}>Inspect the aircraft ↓</button>
            <button className="btn line" onClick={download}>Download condition report</button>
          </div>
        </div>
        <div className="vhero-credit">{v.media.photo?.artist ? `Photo · ${v.media.photo.artist} · ${v.media.photo.lic}` : ''}</div>
      </section>

      {/* ---------------- the inspector, straight below ---------------- */}
      <section className="inspx" id="inspector" ref={boxRef}>
        <div className="inspx-top">
          <div className="insp-title">
            <b>{ac?.name || `${v.name} · demo unit`}</b>
            <span>{ids.length} parts · {liveAc ? `live from ${liveAc.id}` : 'demo data'} · click a part or a dot</span>
          </div>
          <div className="insp-actions">
            <span className="pill" style={{ '--c': vd.color }}><i />{vd.word}</span>
            {ac && <a className="btn line sm" href={`/api/aircraft/${encodeURIComponent(ac.id)}/report.pdf`} target="_blank" rel="noreferrer">Platform report ↗</a>}
            <button className="btn solid sm" onClick={download}>Download PDF ↓</button>
          </div>
        </div>
        <div className="inspx-grid">
          <Systems ids={ids} parts={parts} sel={sel} onPick={setSel} onHover={setHover} counts={counts} />
          <div className="inspx-stage" data-lenis-prevent>
            <Canvas frameloop={inView ? 'always' : 'never'} shadows dpr={[1, 1.75]} gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }} camera={{ fov: 30 }}
              onCreated={(s) => { gl.current = s.gl; s.gl.toneMapping = THREE.AgXToneMapping; s.gl.toneMappingExposure = 1.1; }}
              onPointerMissed={() => { if (sel) { setSel(null); cmd.current.reset = true; } }}>
              <Suspense fallback={null}>
                <VehicleScene model={model} parts={parts} progress={progress} inspect sel={sel} hover={hover} insets={insets} look={v.look}
                  onHover={setHover} onSelect={setSel} flagged={flagged} cmd={cmd} />
              </Suspense>
            </Canvas>
            <div className="tools">
              <button onClick={() => { cmd.current.zoom = 0.8; }} aria-label="Zoom in" title="Zoom in">+</button>
              <button onClick={() => { cmd.current.zoom = 1.25; }} aria-label="Zoom out" title="Zoom out">−</button>
              <button onClick={() => { setSel(null); cmd.current.reset = true; }} aria-label="Reset view" title="Reset view (Esc)">⟲</button>
            </div>
            <div className="stage-legend"><span style={{ '--c': 'var(--safe)' }}>Safe</span><span style={{ '--c': 'var(--caution)' }}>Caution</span><span style={{ '--c': 'var(--nogo)' }}>No-go</span></div>
            <div className="switcher">
              <button className="nav-b" onClick={() => step(-1)} aria-label="Previous part">←</button>
              <div className="cur">
                <b>{cur ? cur.name : 'Whole aircraft'}</b>
                <span>{cur ? `${walk.indexOf(sel) + 1} / ${walk.length} · ${groupOf(sel)} · Esc to zoom out` : 'Drag to turn · scroll or +/− to zoom'}</span>
              </div>
              <button className="nav-b" onClick={() => step(1)} aria-label="Next part">→</button>
            </div>
          </div>
          <Inspector part={cur} aircraft={ac} vehicle={v} overall={overall} counts={counts} parts={parts} sorted={sorted}
            onPick={setSel} onClose={() => { setSel(null); cmd.current.reset = true; }} onDownload={download} narrow={false} />
        </div>
      </section>
      <div className={`toast ${toast ? 'on' : ''}`}>{toast}</div>
    </div>
  );
}

function Systems({ ids, parts, sel, onPick, onHover, counts }) {
  const [q, setQ] = useState('');
  const listRef = useRef();
  const groups = useMemo(() => {
    const g = {};
    ids.filter((id) => !q || parts[id].name.toLowerCase().includes(q.toLowerCase())).forEach((id) => (g[groupOf(id)] ??= []).push(id));
    return GROUP_ORDER.filter((k) => g[k]).map((k) => [k, g[k].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))]);
  }, [ids, parts, q]);
  useEffect(() => { listRef.current?.querySelector('.prow.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, [sel]);
  const total = ids.length;
  return (
    <aside className="systems">
      <div className="systems-head">
        <div className="eyebrow plain">Systems</div>
        <div className="hbar">
          <i style={{ width: `${(counts.safe / total) * 100}%`, background: 'var(--safe)' }} />
          <i style={{ width: `${(counts.caution / total) * 100}%`, background: 'var(--caution)' }} />
          <i style={{ width: `${(counts.nogo / total) * 100}%`, background: 'var(--nogo)' }} />
        </div>
        <div className="counts"><span>{counts.safe} safe</span><span>{counts.caution} caution</span><span>{counts.nogo} no-go</span></div>
        <input className="search" placeholder="Find a part…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="systems-list" ref={listRef}>
        {groups.map(([g, list]) => (
          <div key={g} style={{ display: 'contents' }}>
            <div className="group-h"><span>{g}</span><span>{list.length}</span></div>
            {list.map((id) => {
              const d = parts[id], c = healthColor(d.health, d.verdict);
              return (
                <button key={id} className={`prow ${sel === id ? 'on' : ''}`} style={{ '--c': c }} onClick={() => onPick(id)} onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)}>
                  <i /><span className="nm">{d.name}{d.live && <span className="lv">LIVE</span>}</span>
                  <span className="pc">{d.health != null ? Math.round(d.health * 100) : '—'}</span>
                  <span className="mini"><b style={{ width: `${Math.round((d.health ?? 0) * 100)}%` }} /></span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

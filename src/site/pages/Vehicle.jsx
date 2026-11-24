import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { VEHICLES, catOf, verdictOf, healthColor, groupOf, GROUP_ORDER } from '../data';
import { href } from '../router';
import { useFleet } from '../useFleet';
import { demoVehicle, fetchAircraft, fetchHistory, fromLive, liveFor } from '../api';
import { buildModel } from '../three/models';
import VehicleScene from '../three/VehicleScene';
import { useGLTF } from '@react-three/drei';
import { composePredator, PREDATOR_URL } from '../three/predator';
import { composeLaunch, composeSatellite, DRACO, NASA } from '../three/realmodels';
import Inspector from '../ui/Inspector';
import { Magnetic, Split, useLenis } from '../ui/motion';
import { ThemeButton } from '../ui/Nav';

const RANK = { 'NO-GO': 0, NO_GO: 0, CAUTION: 1, UNKNOWN: 2, SAFE: 3, GO: 3 };
const isFlag = (v) => v === 'NO-GO' || v === 'NO_GO' || v === 'CAUTION';

function useNarrow() {
  const [n, setN] = useState(() => window.innerWidth < 980);
  useEffect(() => { const f = () => setN(window.innerWidth < 980); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return n;
}

/** the vehicle's 3D model: the real Predator for the MALE UAV, detailed shape-built models for the rest */
export default function Vehicle({ look }) {
  const l = VEHICLES[look] ? look : 'quadcopter';
  if (l === 'male_uav') return <PredatorVehicle />;
  if (l === 'satellite') return <HubbleVehicle />;
  if (l === 'launch_vehicle') return <LaunchVehicle />;
  return <BuiltVehicle look={look} />;
}
function BuiltVehicle({ look }) {
  const model = useMemo(() => buildModel(VEHICLES[look] ? look : 'quadcopter', []), [look]);
  return <VehicleView look={look} model={model} />;
}
function PredatorVehicle() {
  const { scene } = useGLTF(PREDATOR_URL);
  const model = useMemo(() => composePredator(scene), [scene]);
  return <VehicleView look="male_uav" model={model} />;
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
  const v = VEHICLES[look] || VEHICLES.custom;
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

  const [inspect, setInspect] = useState(false);
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
  // the order the switcher and arrow keys walk through: by system, then by name
  const walk = useMemo(() => [...ids].sort((a, b) => GROUP_ORDER.indexOf(groupOf(a)) - GROUP_ORDER.indexOf(groupOf(b)) || a.localeCompare(b, undefined, { numeric: true })), [ids]);
  const flagged = sorted.filter((id) => isFlag(parts[id].verdict));
  const overall = ac?.summary?.verdict || (flagged.some((id) => parts[id].verdict.startsWith('NO')) ? 'NO-GO' : flagged.length ? 'CAUTION' : 'SAFE');
  const counts = useMemo(() => ids.reduce((o, id) => { const k = parts[id].verdict.startsWith('NO') ? 'nogo' : parts[id].verdict === 'CAUTION' ? 'caution' : 'safe'; o[k]++; return o; }, { safe: 0, caution: 0, nogo: 0 }), [ids, parts]);
  const liveCount = ids.filter((id) => parts[id].live).length;

  // scroll progress (screen heights) shared with the scene without re-rendering
  const progress = useRef(0);
  const root = useRef();
  useEffect(() => {
    const f = () => { progress.current = window.scrollY / window.innerHeight; root.current?.style.setProperty('--p', progress.current.toFixed(3)); };
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  // inspector mode: page scroll locked, site nav hidden
  const lenis = useLenis();
  useEffect(() => { if (inspect) lenis?.stop(); else lenis?.start(); }, [inspect, lenis]);
  useEffect(() => {
    document.body.classList.toggle('locked', inspect);
    document.body.classList.toggle('inspect', inspect);
    return () => { document.body.classList.remove('locked'); document.body.classList.remove('inspect'); };
  }, [inspect]);
  const open = useCallback((id) => { setInspect(true); if (id) setSel(id); }, []);
  const step = useCallback((d) => {
    setSel((cur) => { const k = cur ? walk.indexOf(cur) : -1; return walk[(k + d + walk.length) % walk.length]; });
  }, [walk]);
  useEffect(() => {
    const k = (e) => {
      if (!inspect || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      if (e.key === 'Escape') { if (sel) setSel(null); else setInspect(false); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [inspect, sel, step]);

  // where the free space is, so the scene can centre the machine in it
  const narrow = useNarrow();
  const insets = useRef({ x: 0, y: 0 });
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    let left = 0, right = 0, top = 0, bottom = 0;
    if (!inspect) { if (!narrow) left = W * 0.36; }
    else if (!narrow) { left = 322; right = 442; top = 72; }
    else { top = 72; bottom = sel ? H * 0.62 : 150; }
    const cx = left + (W - left - right) / 2, cy = top + (H - top - bottom) / 2;
    // pull the camera back when the free space is narrow, so the whole machine still fits
    const free = Math.min((W - left - right) / W, (H - top - bottom) / H);
    insets.current = { x: W / 2 - cx, y: H / 2 - cy, zoom: Math.min(2.2, Math.max(1, 0.78 / free)) };
    setShift(cx - W / 2);
  }, [inspect, narrow, sel]);

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
  return (
    <div className={`vehicle ${inspect ? 'inspecting' : ''}`} ref={root}>
      <div className="stage" data-cursor-zone="canvas">
        <Canvas shadows="soft" dpr={[1.5, 2]} gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }} camera={{ fov: 30 }}
          onCreated={(s) => { gl.current = s.gl; s.gl.toneMapping = THREE.AgXToneMapping; s.gl.toneMappingExposure = 1.15; }} onPointerMissed={() => inspect && setSel(null)}>
          <Suspense fallback={null}>
            <VehicleScene model={model} parts={parts} progress={progress} inspect={inspect} sel={sel} hover={hover} insets={insets} look={v.look}
              onHover={setHover} onSelect={(id) => open(id)} flagged={flagged} />
          </Suspense>
        </Canvas>
      </div>
      <div className="v-cover">{v.photo && <img src={v.photo} alt={v.name} />}</div>

      {/* ---------------- the story ---------------- */}
      <section className="chapter hero-ch">
        <div className="copy">
          <a className="crumb" href={href('fleet', cat?.id)}>← {cat?.name}</a>
          <Split as="h1" text={v.name} stagger={70} />
          <p className="serif-lede">{v.tag}</p>
          <p className="mono muted" style={{ fontSize: 11.5, marginTop: 16 }}>{v.examples}</p>
          <div className="scroll-cue"><i />Scroll to open the twin</div>
        </div>
      </section>
      <section className="chapter">
        <div className="copy">
          <span className="chapter-n" aria-hidden="true">01</span>
          <div className="eyebrow"><b>01</b> The digital twin</div>
          <Split text={'A model of\n_every _system.'} />
          <p className="body">{v.text}</p>
          <div className="source-line">{liveAc
            ? <><span className="live-dot" /> Live: {liveAc.name} · {liveCount} of {ids.length} parts reported</>
            : <><span className="live-dot" style={{ background: 'var(--mute)', boxShadow: 'none' }} /> Demo data · no {v.name.toLowerCase()} connected yet</>}</div>
        </div>
      </section>
      <section className="chapter">
        <div className="copy">
          <span className="chapter-n" aria-hidden="true">02</span>
          <div className="eyebrow"><b>02</b> Taken apart</div>
          <Split text={`${ids.length} parts.\n_Each _with _its _own _twin.`} />
          <p className="body">The skin comes away and every monitored part floats free. Each one learns its own normal from its own sensors, so no part borrows a calibration that was not made for it.</p>
        </div>
      </section>
      <section className="chapter">
        <div className="copy">
          <span className="chapter-n" aria-hidden="true">03</span>
          <div className="eyebrow"><b>03</b> Judged live</div>
          <Split text={'Every part,\n_in _its _true _colour.'} />
          <p className="body">{flagged.length ? <>{flagged.length} {flagged.length === 1 ? 'part needs' : 'parts need'} attention right now. The weakest, <b>{parts[sorted[0]].name}</b>, is at {Math.round((parts[sorted[0]].health ?? 0) * 100)}% health and glowing.</> : 'Every part is inside its learned normal.'}</p>
          <div className="legend-row"><span style={{ '--c': 'var(--safe)' }}>Safe {counts.safe}</span><span style={{ '--c': 'var(--caution)' }}>Caution {counts.caution}</span><span style={{ '--c': 'var(--nogo)' }}>No-go {counts.nogo}</span></div>
        </div>
      </section>
      <section className="chapter final">
        <div className="copy">
          <div className="eyebrow plain">04 · Inspector</div>
          <Split text={'Pick any part.\n_See _everything.'} />
          <div className="tally">
            <span className="pill" style={{ '--c': verdictOf(overall).color }}><i />{verdictOf(overall).word} overall</span>
            <span className="pill" style={{ '--c': 'var(--ink)' }}>{ids.length} parts</span>
            <span className="pill" style={{ '--c': liveAc ? 'var(--safe)' : 'var(--mute)' }}><i />{liveAc ? 'Live data' : 'Demo data'}</span>
          </div>
          <div className="hero-cta" style={{ animation: 'none', justifyContent: 'center' }}>
            <Magnetic><button className="btn solid" onClick={() => open(sorted[0])}>Open the inspector <span className="ar">→</span></button></Magnetic>
            <Magnetic><button className="btn line" onClick={download}>Download condition report <span className="ar">↓</span></button></Magnetic>
          </div>
        </div>
      </section>

      {/* ---------------- the inspector ---------------- */}
      <div className="insp" style={{ '--shift': `${shift}px` }} aria-hidden={!inspect}>
        <div className="insp-top">
          <button className="insp-back" onClick={() => { setInspect(false); setSel(null); }}>← Story</button>
          <div className="insp-title">
            <b>{ac?.name || `${v.name} · demo unit`}</b>
            <span>{cat?.name} · {ids.length} parts · {liveAc ? `live from ${liveAc.id}` : 'demo data'}</span>
          </div>
          <div className="insp-actions">
            <span className="pill" style={{ '--c': verdictOf(overall).color }}><i />{verdictOf(overall).word}</span>
            {ac && <a className="btn line sm" href={`/api/aircraft/${encodeURIComponent(ac.id)}/report.pdf`} target="_blank" rel="noreferrer"><span className="txt">Platform report</span> ↗</a>}
            <ThemeButton />
            <button className="btn solid sm" onClick={download}><span className="txt">Download PDF</span> ↓</button>
          </div>
        </div>

        <Systems ids={ids} parts={parts} sel={sel} onPick={setSel} onHover={setHover} counts={counts} />

        <div className="keys"><kbd>←</kbd><kbd>→</kbd> next part · <kbd>Esc</kbd> back · drag to turn · scroll to zoom</div>
        <div className="switcher">
          <button className="nav-b" onClick={() => step(-1)} aria-label="Previous part">←</button>
          <div className="cur">
            <b>{cur ? cur.name : 'Whole vehicle'}</b>
            <span>{cur ? `${walk.indexOf(sel) + 1} / ${walk.length} · ${groupOf(sel)}` : `${ids.length} parts · pick one`}</span>
          </div>
          <button className="nav-b" onClick={() => step(1)} aria-label="Next part">→</button>
        </div>

        <Inspector part={cur} aircraft={ac} vehicle={v} overall={overall} counts={counts} parts={parts} sorted={sorted}
          onPick={setSel} onClose={() => setSel(null)} onDownload={download} narrow={narrow} />
      </div>
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

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CATEGORIES, VEHICLES, catOf, verdictOf, prettyId } from '../data';
import { href } from '../router';
import { useFleet } from '../useFleet';
import Reveal from '../ui/Reveal';
import { Magnetic, Split, useInView } from '../ui/motion';
import { partCount } from './Category';
import TwinShowcase, { BuiltTwin, PredatorTwin, FOCUS, LOOP_S, loopAt } from '../ui/TwinShowcase';

// Hero: full-bleed photography, one striking shot per slide, the vehicle selector along the bottom.
function Ticker() {
  const fleet = useFleet();
  const items = fleet?.length
    ? fleet.map((a) => {
      const s = a.summary || {}, vd = verdictOf(s.verdict), lim = s.limiting;
      return { id: a.id, name: a.name, c: vd.color, word: vd.word, extra: lim ? `${prettyId(lim.component)} · ${Math.round(lim.mean)} ${lim.unit} left` : `${a.n_components} parts` };
    })
    : [{ id: 'DEMO', name: 'Live server offline', c: 'var(--mute)', word: 'Demo', extra: 'start python -m ivhm.live.server' }];
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="live-band">
      <div className="label"><span className="live-dot" style={fleet?.length ? null : { background: 'var(--mute)', boxShadow: 'none' }} />Live fleet</div>
      <div className="ticker"><div className="ticker-track">
        {[...row, ...row].map((t, k) => (
          <span className="ticker-item" key={k} style={{ '--c': t.c }}>
            <span>{t.id}</span><span className="dim">{t.name}</span><b>● {t.word}</b><span className="dim">{t.extra}</span>
          </span>
        ))}
      </div></div>
    </div>
  );
}

// Hero: the product itself. A live digital twin cycles through the four aircraft classes, opening into
// its parts and lighting up by health, next to the headline.
const HERO_LOOKS = [['helicopter', 'Helicopters'], ['fighter_twin_engine', 'Fighter jets'], ['male_uav', 'UAVs'], ['quadcopter', 'Drones']];
const CYCLE_S = LOOP_S;

function Hero() {
  const [k, setK] = useState(0);
  const [inside, setInside] = useState(false);
  const phase = useRef(1);
  const insets = useRef({ x: 0, y: 0, zoom: 1 });
  useEffect(() => {
    const place = () => { const w = innerWidth; insets.current = w > 980 ? { x: -w * 0.25, y: 0, zoom: 1.22 } : { x: 0, y: -innerHeight * 0.12, zoom: 1.35 }; };
    place(); addEventListener('resize', place);
    let raf; const t0 = performance.now();
    const step = (now) => {
      const s = Math.max(0, (now - t0) / 1000);   // the first frame's time can be just before t0
      const st = loopAt(s);
      phase.current = st.p;
      setInside((v) => (v === st.inside ? v : st.inside));
      setK((x) => { const n = Math.floor(s / CYCLE_S) % HERO_LOOKS.length; return x === n ? x : n; });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', place); };
  }, []);
  const [look, label] = HERO_LOOKS[k];
  const focus = inside ? FOCUS[look] : null;
  return (
    <section className="hero3d">
      <div className="hero3d-canvas">
        <Canvas shadows="soft" dpr={[1.25, 2]} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ fov: 30 }}
          onCreated={(st) => { st.gl.toneMapping = THREE.AgXToneMapping; }}>
          <Suspense fallback={null}>
            {look === 'male_uav' ? <PredatorTwin phase={phase} insets={insets} focus={focus} /> : <BuiltTwin key={look} look={look} phase={phase} insets={insets} focus={focus} />}
          </Suspense>
        </Canvas>
      </div>
      <div className="hero3d-copy">
        <div className="eyebrow">Integrated Vehicle Health Management</div>
        <h1>Know the health of every part, before every flight.</h1>
        <p>IVHM builds a live digital twin of every engine, rotor, gearbox, motor and battery on your helicopters, fighter jets, UAVs and drones, predicts remaining life with an honest range, and tells you whether it is safe to go.</p>
        <div className="hero3d-cta">
          <a className="btn solid" href={href('vehicle', look)}>Explore the digital twin</a>
          <a className="btn line" href="#platforms" onClick={(e) => { e.preventDefault(); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }}>View platforms</a>
        </div>
        <div className="hero3d-classes">
          {HERO_LOOKS.map(([l, name], i) => (
            <a key={l} href={href('vehicle', l)} className={i === k ? 'on' : ''}>{name}<i><b style={i === k ? { animationDuration: `${CYCLE_S}s` } : null} key={i === k ? 'a' + k : 'b'} /></i></a>
          ))}
        </div>
      </div>
      <div className="hero3d-tag"><span className="live-dot" />{label} · {focus ? `inside the ${prettyId(focus).toLowerCase()}` : 'live digital twin'}</div>
    </section>
  );
}

function LiveInstruments() {
  const fleet = useFleet();
  if (!fleet?.length) return <div className="empty-state">The IVHM live server is not connected. Start it with <code>python -m ivhm.live.server</code> and your fleet appears here, live.</div>;
  return (
    <div className="instruments">
      {fleet.map((a) => {
        const s = a.summary || {}, vd = verdictOf(s.verdict), lim = s.limiting, nd = s.next_due;
        const look = a.look;
        return (
          <a key={a.id} className="instrument" href={href('vehicle', look)} style={{ '--c': vd.color }}>
            <img src={VEHICLES[look].photo} alt="" loading="lazy" />
            <div className="instrument-body">
              <div className="row"><span className="mono muted" style={{ fontSize: 11 }}>{a.id} · {VEHICLES[look].name}</span><span className="pill" style={{ '--c': vd.color }}><i />{vd.word}</span></div>
              <h3>{a.name}</h3>
              <div className="readout">
                <div><span>Parts</span><b>{a.n_components}</b></div>
                <div><span>Shortest life</span><b>{lim ? `${Math.round(lim.mean)} ${lim.unit}` : '—'}</b></div>
                <div><span>Weakest part</span><b>{lim ? prettyId(lim.component) : '—'}</b></div>
                <div><span>Next service</span><b>{nd ? prettyId(nd.component) : '—'}</b></div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

/** a figure that counts up once it scrolls into view */
function Count({ to, suffix = '', prefix = '', decimals = 0 }) {
  const [ref, seen] = useInView({ threshold: 0.4 });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    let raf; const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / 1600), e = 1 - Math.pow(1 - p, 3); setV(to * e); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

const ICON = {
  monitor: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  diagnose: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5" /></>,
  predict: <><path d="M3 20h18" /><path d="M5 16l4-5 4 3 6-8" /><path d="M15 6h4v4" /></>,
  decide: <><path d="M12 3l8 4v5c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V7z" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>,
};
const Icon = ({ k }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="ico">{ICON[k]}</svg>;

const CAPS = [
  ['monitor', 'Monitor', 'Every sensor on every part, scored against that part’s own learned normal, live.'],
  ['diagnose', 'Diagnose', 'Which part, which failure mode and how confident, with the evidence behind it.'],
  ['predict', 'Predict', 'Remaining useful life in flights, cycles or days, always with a calibrated 90% range.'],
  ['decide', 'Decide', 'One verdict before every run, Safe, Caution or No-go, and the service task that clears it.'],
];
const STEPS = [
  ['01', 'Connect', 'Stream data from the aircraft link, flight logs (PX4, MAVLink, ArduPilot, CSV) or avionics buses. No new hardware needed to start.'],
  ['02', 'Learn', 'Each part builds its own twin: physics models where they exist, learned normal behaviour everywhere else.'],
  ['03', 'Act', 'Verdicts, remaining life and a service plan reach the fleet board, alerts, email, SMS, Teams or Slack, in under a second.'],
];
const PROOF = [
  { n: 100, s: '%', t: 'Jet-engine failures caught', d: 'NASA C-MAPSS turbofans, all four fleets, with zero early false alarms.' },
  { n: 13.6, dec: 1, p: '≤', t: 'Cycles life error (RMSE)', d: 'Remaining life on unseen NASA engines; the 90% range holds 91–92% of the time.' },
  { n: 17, s: '/17', t: 'Bearings flagged before failure', d: 'FEMTO / PRONOSTIA run-to-failure bearings, each tested on data it never saw.' },
  { n: 38, s: ' ms', t: 'Reading to decision', d: 'Median on the live system; 95% within half a second across 1.8 million readings.' },
];
const DEPLOY = [
  ['Cloud', 'Docker package for any cloud, HTTPS, PostgreSQL and daily backups.'],
  ['On-premise & defence', 'Offline install bundle, your own certificates, data encrypted with your key (AES-256-GCM).'],
  ['Enterprise sign-in', 'Roles, 2-step login, Active Directory / LDAP, single sign-on (Entra ID, Okta, Keycloak) and smart cards.'],
  ['Audit & assurance', 'Tamper-evident audit trail, signed aircraft data and qualification documents with full traceability.'],
];

/** Porsche-style model explorer: pick a category, see every type in it, open one to inspect it */
function PlatformExplorer() {
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const c = CATEGORIES.find((x) => x.id === cat);
  return (
    <div className="explorer">
      <div className="ex-tabs" role="tablist">
        {CATEGORIES.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === cat} className={x.id === cat ? 'on' : ''} onClick={() => setCat(x.id)}>
            {x.name}<sup>{x.looks.length}</sup>
          </button>
        ))}
      </div>
      <div className="ex-head" key={'h' + cat}>
        <p>{c.blurb}</p>
        <a href={href('fleet', c.id)} className="ex-all">View all {c.short.toLowerCase()} <i>→</i></a>
      </div>
      <div className={`ex-grid n${c.looks.length}`} key={cat}>
        {c.looks.map((l, k) => {
          const v = VEHICLES[l];
          return (
            <a key={l} className="ex-card" href={href('vehicle', l)} style={{ animationDelay: `${k * 90}ms` }}>
              <div className="ex-img"><img src={v.photo} alt={v.name} loading="lazy" /></div>
              <div className="ex-body">
                <span className="ex-ex">{v.examples.split(' · ').slice(0, 2).join(' · ')}</span>
                <h3>{v.name}</h3>
                <p>{v.tag}</p>
                <div className="ex-foot"><span>{partCount(l)} monitored parts</span><span className="ex-go">Inspect <i>→</i></span></div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="home pro">
      <Hero />
      <Ticker />

      <section className="pro-sec pro-intro">
        <Reveal className="pro-intro-head">
          <div className="eyebrow">Integrated Vehicle Health Management</div>
          <Split text={'Health intelligence\nfor aerospace.'} className="pro-h" />
        </Reveal>
        <Reveal className="pro-intro-text" delay={150}>
          <p className="pro-lead">IVHM turns the data your aircraft already produce into four answers for every part: how healthy it is, what it is doing now, how long it has left, and whether it is safe to go.</p>
          <p className="pro-body">Built for helicopters, fighter jets, UAVs and drones, with a digital twin for every monitored part: engines, rotors, gearboxes, motors, batteries, actuators and more.</p>
        </Reveal>
        <div className="pro-figs">
          <Reveal><b><Count to={6} /></b><span>Platform templates across four classes</span></Reveal>
          <Reveal delay={90}><b><Count to={30} suffix="+" /></b><span>Physics-based part packs</span></Reveal>
          <Reveal delay={180}><b><Count to={680} /></b><span>Automatic checks passing</span></Reveal>
          <Reveal delay={270}><b><Count to={90} suffix="%" /></b><span>Calibrated range on every life estimate</span></Reveal>
        </div>
      </section>

      <section className="pro-sec twin-sec">
        <div className="pro-head split-head">
          <div><div className="eyebrow">Live digital twin</div><Split text="Every part of the aircraft, modelled and judged." className="pro-h" /></div>
          <Reveal delay={120}><p className="pro-body">Each aircraft opens into the parts IVHM monitors. Every part carries its own twin and takes the colour of its health. Pick a class, turn it, click any part.</p></Reveal>
        </div>
        <TwinShowcase />
      </section>

      <section className="pro-sec">
        <div className="pro-head">
          <div className="eyebrow">Capabilities</div>
          <Split text="From raw signal to a decision." className="pro-h" />
        </div>
        <div className="cap-grid">
          {CAPS.map(([k, t, d], i) => (
            <Reveal key={k} className="cap" delay={i * 90}>
              <Icon k={k} />
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pro-sec">
        <div className="pro-head split-head">
          <div id="platforms"><div className="eyebrow">Platforms</div><Split text="Choose a platform. Inspect every part." className="pro-h" /></div>
          <Reveal delay={120}><p className="pro-body">Helicopters, fighter jets, UAVs and drones: ready-made templates, each with its parts, sensors and service rules. Open any one to explore its digital twin, part by part.</p></Reveal>
        </div>
        <PlatformExplorer />
      </section>

      <section className="pro-sec pro-band">
        <div className="pro-head">
          <div className="eyebrow">How it works</div>
          <Split text="Three steps to a healthier fleet." className="pro-h" />
        </div>
        <div className="steps3">
          {STEPS.map(([n, t, d], i) => (
            <Reveal key={n} className="step" delay={i * 120}>
              <span className="step-n">{n}</span>
              <span className="step-line" />
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pro-sec">
        <div className="pro-head split-head">
          <div><div className="eyebrow">Validation</div><Split text="Proven on real data." className="pro-h" /></div>
          <Reveal delay={120}><p className="pro-body">Every model is checked against public run-to-failure data before it ships, and each result states its limits. Full reports are part of the platform.</p></Reveal>
        </div>
        <div className="proof-grid">
          {PROOF.map((x, i) => (
            <Reveal key={x.t} className="proof" delay={i * 90}>
              <b><Count to={x.n} suffix={x.s || ''} prefix={x.p || ''} decimals={x.dec || 0} /></b>
              <h4>{x.t}</h4>
              <p>{x.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pro-sec">
        <div className="pro-head split-head">
          <div><div className="eyebrow">Live</div><Split text="The fleet, right now." className="pro-h" /></div>
          <Reveal delay={120}><p className="pro-body">Straight from the IVHM live server: verdict, shortest remaining life and next service for every connected aircraft.</p></Reveal>
        </div>
        <LiveInstruments />
      </section>

      <section className="pro-sec pro-band">
        <div className="pro-head">
          <div className="eyebrow">Deployment & security</div>
          <Split text="Ready for the flight line and the secure facility." className="pro-h" />
        </div>
        <div className="deploy-grid">
          {DEPLOY.map(([t, d], i) => (
            <Reveal key={t} className="deploy" delay={i * 90}><h4>{t}</h4><p>{d}</p></Reveal>
          ))}
        </div>
      </section>

      <section className="pro-sec pro-cta">
        <Reveal>
          <div className="eyebrow plain" style={{ justifyContent: 'center' }}>Digital twin</div>
          <Split text="See your fleet, part by part." className="pro-h center" />
          <p className="pro-body center">Open a digital twin, take the aircraft apart and inspect the health of every component.</p>
          <div className="pro-cta-row">
            <Magnetic><a className="btn solid" href={href('vehicle', 'helicopter')}>Explore the helicopter twin</a></Magnetic>
            <Magnetic><a className="btn line" href={href('fleet', 'fighters')}>Browse fighter jets</a></Magnetic>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

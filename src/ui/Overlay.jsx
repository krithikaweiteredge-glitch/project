import { useAfter, useValue, radioDamage, radioStatus, engineStatus, STATUS } from '../store';

/** a line of a headline that slides up as its section arrives */
const L = ({ children, d = 0, accent }) => (
  <span className="ln" style={{ '--d': d }}><span className={accent ? 'accent' : ''}>{children}</span></span>
);
const Sec = ({ i, children, className = '' }) => (
  <section className={`sec ${className}`} style={{ '--i': i }}>{children}</section>
);
const Chip = ({ s, children }) => <span className="chip" style={{ '--c': STATUS[s].color }}>{children || STATUS[s].word}</span>;
const Kicker = ({ n, children }) => <div className="kicker"><span>[ {String(n).padStart(2, '0')} ]</span>{children}</div>;

function Waveform() {
  let d = 'M0 40';
  for (let x = 0; x <= 400; x += 2) {
    const ph = (x / 400) * 16 * Math.PI;
    let y = 40 - 10 * Math.sin(ph);
    const cyc = Math.floor((ph + Math.PI / 2) / (2 * Math.PI));
    if (cyc % 4 === 3) y += 20 * Math.max(0, Math.sin(((ph + Math.PI / 2) % (2 * Math.PI)) / 2));
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return <svg viewBox="0 0 400 80" className="chart"><path d={d} pathLength="1" className="draw" style={{ '--a': 1.6, '--b': 2.0 }} /></svg>;
}

function EngineCard() {
  const st = useValue(engineStatus);
  return (
    <div className="card">
      <div className="row"><span className="mono dim">CRANKSHAFT SPEED · LIVE</span><Chip s={st} /></div>
      <Waveform />
      <div className="row mono dim small"><span>dip on every 4th firing</span><span>cylinder 2</span></div>
    </div>
  );
}

function DamageCard() {
  const d = useValue((t) => Math.round(radioDamage(t) * 100) / 100);
  const st = useValue(radioStatus);
  return (
    <div className="card">
      <div className="row"><span className="mono dim">TRANSMITTER WEAK · AIRCRAFT</span><Chip s={st} /></div>
      <div className="gauge"><div className="fill" style={{ width: `${Math.min(100, (d / 1.2) * 100)}%`, background: STATUS[st].color }} /><div className="limit"><span>LIMIT 1.0</span></div></div>
      <div className="row"><span className="big mono">{d.toFixed(2)}</span><span className="mono dim small">0 = new · 1 = limit · <span className="sim">SIMULATED · L1</span></span></div>
      <ul className="evidence">
        <li>Downlink −7.8 dB from baseline</li>
        <li>Range at 6 dB SNR: about 236 km (baseline 340 km)</li>
        <li>Remaining life 0 flights (90% range 0–1)</li>
      </ul>
    </div>
  );
}

function ReadyCard() {
  const pressed = useValue((t) => t > 6.15 && t < 6.28);
  const refused = useAfter(6.26);
  return (
    <div className="card ready">
      <div className="row mono dim small"><span>READY TO FLY? · UAV-01</span><span>MISSION 6 H</span></div>
      <div className="verdict"><b>NO-GO</b><span><strong>datalink:</strong> transmitter at its limit — ground now</span></div>
      <ul className="items">
        <li><Chip s="NO_GO" />Datalink transmitter weak · 0 flights left (90% range 0–1)</li>
        <li><Chip s="CAUTION" />Engine: in-flight misfire, one cylinder</li>
        <li><Chip s="SENSOR" />Oil-pressure sensor drifting</li>
        <li><Chip s="SAFE">GO</Chip>6 other systems</li>
      </ul>
      <div className="btns"><span className={`btn ${pressed ? 'pressed' : ''}`}>Release</span><span className="btn ghost">Hold</span></div>
      <div className={`refuse ${refused ? 'on' : ''}`}>Can't release a NO-GO aircraft. Fix the datalink first.</div>
    </div>
  );
}

function FixSteps() {
  const s = [useAfter(6.95), useAfter(7.15), useAfter(7.3), useAfter(7.45)];
  const items = ['Radio replaced and recorded', 'Spark plug replaced', 'Oil-pressure sensor recalibrated', 'Every screen updated by itself'];
  return <ul className="steps">{items.map((x, i) => <li key={x} className={s[i] ? 'done' : ''}>{x}</li>)}</ul>;
}

function Fleet() {
  const flipped = useAfter(7.85);
  const cards = [
    { n: 'UAV-01', v: flipped ? 'GO' : 'NO-GO', s: flipped ? 'SAFE' : 'NO_GO', r: flipped ? 'radio replaced · all parts SAFE' : 'datalink at its limit', bars: flipped ? 'SSSSSS' : 'NCCSSS', hl: true },
    { n: 'UAV-02', v: 'GO', s: 'SAFE', r: 'next service in 41 h', bars: 'SSSSSS' },
    { n: 'UAV-03', v: 'CAUTION', s: 'CAUTION', r: 'propeller inspection due', bars: 'SCSSSS' },
    { n: 'UAV-04', v: 'GO', s: 'SAFE', r: 'next service in 12 flights', bars: 'SSSSUS' },
    { n: 'UAV-05', v: 'GO', s: 'SAFE', r: 'next service in 9 days', bars: 'SSSSSS' },
    { n: 'UAV-06', v: 'CAUTION', s: 'CAUTION', r: 'fuel: not judged yet (2/6 flights)', bars: 'SSUSSS' },
  ];
  const col = { S: STATUS.SAFE.color, C: STATUS.CAUTION.color, N: STATUS.NO_GO.color, U: STATUS.UNKNOWN.color };
  return (
    <div className="fleet">
      {cards.map((c) => (
        <div key={c.n} className={`fc ${c.hl ? 'hl' : ''} ${c.hl && flipped ? 'flip' : ''}`} style={{ '--c': STATUS[c.s].color }}>
          <div className="row"><b className="mono">{c.n}</b><span className="dot" /></div>
          <div className="v">{c.v}</div>
          <div className="r">{c.r}</div>
          <div className="bars">{c.bars.split('').map((b, i) => <i key={i} style={{ background: col[b] }} />)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Overlay() {
  return (
    <div className="overlay">
      <Sec i={0} className="hero">
        <Kicker n={0}>Integrated Vehicle Health Management</Kicker>
        <h1><L>Every part.</L><L d={0.05}>Every flight.</L><L d={0.1} accent>Understood.</L></h1>
        <p className="lead">How an unmanned aircraft tells its crew what is wrong, how bad it is, and how many flights are left, before anything breaks.</p>
        <div className="stats">
          <div><b>Every part</b><span>down to bearings, seals and connectors</span></div>
          <div><b>Every flight</b><span>from data the aircraft already records</span></div>
          <div><b>24 / 7</b><span>on the operator's own server</span></div>
        </div>
      </Sec>

      <Sec i={1}>
        <Kicker n={1}>Digital twin</Kicker>
        <h2><L>A model of</L><L d={0.05}>every system.</L></h2>
        <p className="lead">Each part learns what <em>healthy</em> looks like from its own first flights. Every new flight is compared against that baseline.</p>
        <div className="chips"><Chip s="SAFE" /><Chip s="CAUTION" /><Chip s="NO_GO" /><Chip s="UNKNOWN" /></div>
        <p className="note mono">A word next to every colour. Always.</p>
      </Sec>

      <Sec i={2}>
        <Kicker n={2}>Detect · in flight</Kicker>
        <h2><L>A misfire.</L><L d={0.05} accent>Caught mid-air.</L></h2>
        <p className="lead">One cylinder's spark plug stops firing reliably. The crankshaft slows for a moment on every firing it misses.</p>
        <EngineCard />
        <div className="card alert"><span className="mono">IN FLIGHT</span>Misfire in one cylinder (ignition) appeared suddenly. Consider returning to base.</div>
      </Sec>

      <Sec i={3}>
        <Kicker n={3}>Measure</Kicker>
        <h2><L>How far a part</L><L d={0.05}>has worn.</L></h2>
        <p className="lead">The datalink radio gets weaker, flight after flight. IVHM turns that into damage, from 0 (new) to 1 (the limit).</p>
        <DamageCard />
      </Sec>

      <Sec i={4}>
        <Kicker n={4}>Don't be fooled</Kicker>
        <h2><L>It knows when</L><L d={0.05} accent>a sensor lies.</L></h2>
        <p className="lead">Oil pressure creeps up while pump speed and temperature stay flat. The pump is fine. The sensor is drifting.</p>
        <div className="card">
          <svg viewBox="0 0 400 120" className="chart">
            <line x1="0" y1="82" x2="400" y2="82" stroke="#34d399" strokeWidth="2" strokeDasharray="4 5" />
            <text x="4" y="102" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono">pump speed, temperature: steady</text>
            <path d="M0 76 C 80 76, 140 74, 200 64 S 330 32, 400 18" pathLength="1" className="draw amber" style={{ '--a': 3.75, '--b': 4.2 }} />
            <text x="262" y="14" fill="#fbbf24" fontSize="11" fontFamily="JetBrains Mono">pressure reading</text>
          </svg>
          <div className="row" style={{ marginTop: 12 }}><Chip s="SAFE">OIL PUMP · SAFE</Chip><Chip s="SENSOR" /></div>
        </div>
      </Sec>

      <Sec i={5}>
        <Kicker n={5}>Predict</Kicker>
        <h2><L>How many flights</L><L d={0.05}>are left.</L><L d={0.1} accent>Honestly.</L></h2>
        <p className="lead">Remaining life is always a range, never one number pretending to be certain.</p>
        <div className="card">
          <svg viewBox="0 0 400 190" className="chart">
            <line x1="30" y1="30" x2="390" y2="30" stroke="#f87171" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x="34" y="22" fill="#f87171" fontSize="11" fontFamily="JetBrains Mono">LIMIT · DAMAGE 1.0</text>
            <line x1="30" y1="170" x2="390" y2="170" stroke="rgba(255,255,255,.18)" />
            <polygon points="220,96 300,30 380,30 380,64" className="cone" />
            <path d="M30 160 L60 156 L90 150 L120 141 L150 130 L180 116 L220 96" pathLength="1" className="draw" style={{ '--a': 4.8, '--b': 5.15 }} />
            <path d="M220 96 L300 46 L330 30" pathLength="1" className="draw dashed" style={{ '--a': 5.0, '--b': 5.25 }} />
            <circle cx="220" cy="96" r="4" fill="#67e8f9" />
            <text x="30" y="186" fill="#7f8ea0" fontSize="10.5" fontFamily="JetBrains Mono">PAST FLIGHTS</text>
            <text x="330" y="186" fill="#7f8ea0" fontSize="10.5" fontFamily="JetBrains Mono">FUTURE</text>
          </svg>
          <div className="row"><span><span className="big mono">4</span> <span className="dim">flights, middle</span></span><span className="mono dim small">90% RANGE <b className="w">2 – 7</b></span></div>
          <div className="mono dim small" style={{ marginTop: 6 }}>Result from simulation <span className="sim">SIMULATED · L1</span></div>
        </div>
      </Sec>

      <Sec i={6}>
        <Kicker n={6}>Decide</Kicker>
        <h2><L>One answer,</L><L d={0.05}>before every flight.</L></h2>
        <ReadyCard />
      </Sec>

      <Sec i={7}>
        <Kicker n={7}>Fix</Kicker>
        <h2><L>Fix it.</L><L d={0.05} accent>Every screen knows.</L></h2>
        <p className="lead">The engineer swaps the radio and records it. The verdict changes by itself, everywhere, within seconds.</p>
        <FixSteps />
      </Sec>

      <Sec i={8} className="wide">
        <Kicker n={8}>Fleet</Kicker>
        <h2><L>The whole fleet,</L><L d={0.05}>at a glance.</L></h2>
        <Fleet />
      </Sec>

      <Sec i={9} className="hero">
        <Kicker n={9}>IVHM</Kicker>
        <h1 className="h1s"><L>Know what's wrong.</L><L d={0.05}>How bad.</L><L d={0.1} accent>How long is left.</L></h1>
        <p className="lead">Every part, every flight, explained in words an engineer can check.</p>
        <p className="note mono">All aircraft, figures and screens on this page are simulated, for illustration only.</p>
        <p className="note mono credit">
          Aircraft model based on <a href="https://sketchfab.com/3d-models/mq-1-predator-uav-7f70ef747e6d4c27a9555cfff0671923" target="_blank" rel="noreferrer">"MQ-1 Predator UAV"</a> by{' '}
          <a href="https://sketchfab.com/Jeyhun1985" target="_blank" rel="noreferrer">Jeyhun1985</a>, licensed under{' '}
          <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.
        </p>
      </Sec>
    </div>
  );
}

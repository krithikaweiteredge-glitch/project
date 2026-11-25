import { useMemo } from 'react';
import { healthColor, partPhoto, verdictOf } from '../data';

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
const nice = (x) => (x == null ? '—' : x >= 100 ? Math.round(x).toLocaleString() : (Math.round(x * 10) / 10).toString());
const words = (s) => s.replace(/_/g, ' ');

/** 270° dial with tick marks */
export function Dial({ value, color, label = 'HEALTH' }) {
  const r = 50, c = 2 * Math.PI * r, arc = c * 0.75, v = Math.max(0, Math.min(1, value ?? 0));
  const ticks = Array.from({ length: 28 }, (_, k) => {
    const a = (135 + (k / 27) * 270) * (Math.PI / 180);
    return <line key={k} className="tick" x1={64 + Math.cos(a) * 58} y1={64 + Math.sin(a) * 58} x2={64 + Math.cos(a) * (k % 9 === 0 ? 53 : 55.5)} y2={64 + Math.sin(a) * (k % 9 === 0 ? 53 : 55.5)} />;
  });
  return (
    <svg viewBox="0 0 128 128" className="dial">
      {ticks}
      <circle cx="64" cy="64" r={r} className="trk" strokeDasharray={`${arc} ${c}`} transform="rotate(135 64 64)" />
      <circle cx="64" cy="64" r={r} className="val" stroke={color} strokeDasharray={`${arc} ${c}`} strokeDashoffset={arc * (1 - v)} transform="rotate(135 64 64)" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <text x="64" y="68" textAnchor="middle" className="g-n">{value == null ? '—' : Math.round(v * 100)}</text>
      <text x="64" y="86" textAnchor="middle" className="g-u">{label}</text>
    </svg>
  );
}

function Trend({ series, color }) {
  const W = 360, H = 130, P = 22;
  const d = useMemo(() => {
    if (!series?.length) return null;
    const n = series.length, x = (i) => P + (i / Math.max(1, n - 1)) * (W - P), y = (h) => H - 14 - h * (H - 24);
    const line = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.h).toFixed(1)}`).join('');
    return { line, area: `${line}L${W},${H - 14}L${P},${H - 14}Z`, last: { x: x(n - 1), y: y(series[n - 1].h) } };
  }, [series]);
  if (!d) return <p className="note-small">No history yet.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map((g) => <g key={g}><line x1={P} x2={W} y1={H - 14 - g * (H - 24)} y2={H - 14 - g * (H - 24)} className="gl" /><text x="0" y={H - 11 - g * (H - 24)}>{g * 100}</text></g>)}
      <path d={d.area} fill="url(#tg)" />
      <path d={d.line} fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx={d.last.x - 2} cy={d.last.y} r="3.5" fill={color} />
    </svg>
  );
}

function Spark({ values }) {
  if (!values?.length) return <svg />;
  const W = 150, H = 30, lo = Math.min(...values), hi = Math.max(...values), s = hi - lo || 1;
  const p = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - lo) / s) * (H - 4)).toFixed(1)}`).join('');
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><path d={p} fill="none" stroke="var(--accent)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg>;
}

function PartView({ p, aircraft, onClose, look }) {
  const photo = partPhoto(look, p.id);
  const vd = verdictOf(p.verdict), col = healthColor(p.health, p.verdict), rul = p.rul;
  const max = rul ? Math.max(rul.hi, rul.mean) * 1.2 : 1, at = (x) => `${Math.min(100, (x / max) * 100)}%`;
  return (
    <div className="ins-in" key={p.id}>
      <div className="ins-head">
        <span className="pill" style={{ '--c': p.live ? 'var(--safe)' : 'var(--mute)' }}><i />{p.live ? `Live · ${aircraft?.id || ''}` : 'Demo data'}</span>
        <button className="x" onClick={onClose} aria-label="Back to vehicle">✕</button>
      </div>
      <h2 className="ins-name">{p.name}</h2>
      <div className="ins-kind">{p.pack}{p.maturity ? ` · ${p.maturity}` : ''}</div>
      <div className="ins-sn" style={{ marginTop: 4 }}>S/N {p.serial}</div>
      {photo && (
        <figure className="part-photo" key={photo.thumb}>
          <img src={photo.thumb} alt={`A real ${p.name.toLowerCase()}`} loading="eager" />
          <figcaption><span>Real component</span><a href={photo.page} target="_blank" rel="noreferrer">{photo.artist || 'Wikimedia Commons'} · {photo.lic}</a></figcaption>
        </figure>
      )}

      <div className="gauge-row">
        <Dial value={p.health} color={col} />
        <div>
          <span className="pill" style={{ '--c': vd.color }}><i />{vd.word}</span>
          <p>{p.reason || 'Within its learned normal.'}</p>
          {p.usage && <div className="ins-sn">{p.usage.runs} {p.usage.run_unit} logged{p.usage.hours ? ` · ${p.usage.hours} h` : ''}</div>}
        </div>
      </div>

      {rul && (
        <div className="blk">
          <div className="blk-h"><span>Remaining life</span><span>{Math.round((rul.coverage || 0.95) * 100)}% range</span></div>
          <div className="life"><b>{nice(rul.mean)}</b><span>{rul.unit}</span></div>
          <div className="life-scale">
            <div className="axis" />
            <div className="rng" style={{ left: at(rul.lo), width: `calc(${at(rul.hi)} - ${at(rul.lo)})`, background: col }} />
            <div className="mid" style={{ left: at(rul.mean) }} />
            <span className="lbl" style={{ left: at(rul.lo) }}>{nice(rul.lo)}</span>
            <span className="lbl" style={{ left: at(rul.hi) }}>{nice(rul.hi)}</span>
          </div>
        </div>
      )}

      {Object.keys(p.subparts || {}).length > 0 && (
        <div className="blk">
          <div className="blk-h"><span>Inside this part</span></div>
          {Object.entries(p.subparts).map(([k, h]) => (
            <div className="sub" key={k}><span>{words(k)}</span><div className="tr"><i style={{ width: pct(h), background: healthColor(h) }} /></div><span className="v">{pct(h)}</span></div>
          ))}
        </div>
      )}

      <div className="blk">
        <div className="blk-h"><span>Health over time</span><span>{p.series?.length || 0} points</span></div>
        <Trend series={p.series} color={col} />
      </div>

      <div className="blk">
        <div className="blk-h"><span>Why</span></div>
        <ul className="ev">{(p.evidence || []).map((e, k) => <li key={k}>{e}</li>)}</ul>
      </div>

      <div className="blk">
        <div className="blk-h"><span>Sensors</span><span>{Object.keys(p.sensors || {}).length}</span></div>
        <div className="sens">
          {Object.entries(p.sensors || {}).map(([s, st]) => {
            const ok = /^ok/.test(st), learning = /learn/.test(st);
            return (
              <div className={`sen ${ok ? 'ok' : learning ? 'learn' : 'bad'}`} key={s}>
                <div className="row"><span>{words(s)}</span><span className="st">{st}</span></div>
                <Spark values={p.channels?.[s]} />
              </div>
            );
          })}
        </div>
      </div>

      {p.plan?.length > 0 && (
        <div className="blk">
          <div className="blk-h"><span>Service plan</span></div>
          <ul className="tasks">
            {p.plan.map((t, k) => <li key={k} className={t.basis === 'condition' || t.required ? 'req' : ''}><b>{t.what}</b><span>{t.urgency}{t.basis ? ` · ${t.basis === 'interval' ? 'fixed interval' : 'on condition'}` : ''}</span></li>)}
          </ul>
        </div>
      )}

      <div className="blk">
        <div className="blk-h"><span>What IVHM watches</span></div>
        <p style={{ color: 'var(--ink2)', fontSize: 14, lineHeight: 1.6 }}>{p.watches}</p>
        {p.note && <p className="note-small">{p.note}</p>}
      </div>
    </div>
  );
}

const READY = { SAFE: 'Safe to go', GO: 'Safe to go', CAUTION: 'Go with caution', 'NO-GO': 'No-go', NO_GO: 'No-go', UNKNOWN: 'Not judged yet' };

function VehicleView({ vehicle, aircraft, overall, counts, parts, sorted, onPick, onDownload }) {
  const vd = verdictOf(overall);
  const ids = Object.keys(parts);
  const avg = ids.reduce((s, id) => s + (parts[id].health ?? 0), 0) / ids.length;
  const lim = aircraft?.summary?.limiting;
  const attention = sorted.slice(0, 6);
  return (
    <div className="ins-in">
      <div className="ins-head">
        <span className="pill" style={{ '--c': aircraft ? 'var(--safe)' : 'var(--mute)' }}><i />{aircraft ? `Live · ${aircraft.id}` : 'Demo data'}</span>
      </div>
      <h2 className="ins-name">{aircraft?.name || vehicle.name}</h2>
      <div className="ins-kind">{vehicle.examples}</div>
      <div className="gauge-row">
        <Dial value={avg} color={healthColor(avg)} label="AVG HEALTH" />
        <div>
          <span className="pill" style={{ '--c': vd.color }}><i />{READY[overall] || vd.word}</span>
          <p>{counts.nogo ? `${counts.nogo} part${counts.nogo > 1 ? 's' : ''} must be fixed before the next run.` : counts.caution ? `${counts.caution} part${counts.caution > 1 ? 's' : ''} to watch.` : 'Every part inside its learned normal.'}</p>
        </div>
      </div>
      <div className="summary-grid">
        <div style={{ '--c': 'var(--safe)' }}><b>{counts.safe}</b><span>Safe</span></div>
        <div style={{ '--c': 'var(--caution)' }}><b>{counts.caution}</b><span>Caution</span></div>
        <div style={{ '--c': 'var(--nogo)' }}><b>{counts.nogo}</b><span>No-go</span></div>
      </div>
      {lim && (
        <div className="blk">
          <div className="blk-h"><span>Shortest remaining life</span><span>platform</span></div>
          <div className="life"><b>{nice(lim.mean)}</b><span>{lim.unit} · {parts[lim.component]?.name || lim.component}</span></div>
        </div>
      )}
      <div className="blk">
        <div className="blk-h"><span>Lowest health first</span><span>click to inspect</span></div>
        <ul className="watch-list">
          {attention.map((id) => {
            const d = parts[id], pv = verdictOf(d.verdict);
            return <li key={id}><button onClick={() => onPick(id)}><span>{d.name}</span><span className="pill" style={{ '--c': pv.color }}>{pct(d.health)}</span></button></li>;
          })}
        </ul>
      </div>
      <div className="blk">
        <div className="blk-h"><span>Condition report</span></div>
        <p style={{ color: 'var(--ink2)', fontSize: 14, lineHeight: 1.6 }}>Every part's health, verdict, remaining life and service plan in one PDF, with a picture of the twin as it is now.</p>
        <button className="btn solid sm" style={{ marginTop: 14 }} onClick={onDownload}>Download PDF ↓</button>
      </div>
    </div>
  );
}

export default function Inspector({ part, onClose, narrow, ...rest }) {
  return (
    <aside className={`inspector ${part || !narrow ? 'open' : ''}`}>
      {part ? <PartView p={part} aircraft={rest.aircraft} onClose={onClose} look={rest.vehicle?.look} /> : <VehicleView {...rest} />}
    </aside>
  );
}

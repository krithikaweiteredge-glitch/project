// Platforms: every aircraft class IVHM covers, and every type in it. Pick one to open its page and inspector.
import { useState } from 'react';
import { CATEGORIES, VEHICLES } from '../data';
import { href } from '../router';
import { useFleet } from '../useFleet';
import { partCount } from './Category';

export default function Platforms() {
  const [cat, setCat] = useState('all');
  const fleet = useFleet();
  const shown = cat === 'all' ? CATEGORIES : CATEGORIES.filter((c) => c.id === cat);
  return (
    <div className="page platforms">
      <header className="page-head">
        <div className="eyebrow">Platforms</div>
      </header>
      <div className="ex-tabs" role="tablist">
        <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>All<sup>{Object.keys(VEHICLES).length}</sup></button>
        {CATEGORIES.map((x) => (
          <button key={x.id} className={x.id === cat ? 'on' : ''} onClick={() => setCat(x.id)}>{x.name}<sup>{x.looks.length}</sup></button>
        ))}
      </div>
      {shown.map((c) => (
        <section key={c.id} className="plat-cat">
          <div className="plat-cat-head"><h2>{c.name}</h2><p>{c.blurb}</p></div>
          <div className={`ex-grid n${Math.min(c.looks.length, 3)}`}>
            {c.looks.map((l, k) => {
              const v = VEHICLES[l], live = fleet?.some((a) => a.look === l);
              return (
                <a key={l} className="ex-card" href={href('vehicle', l)} style={{ animationDelay: `${k * 90}ms` }}>
                  <div className="ex-img"><img src={v.photo} alt={v.name} loading="lazy" />{live && <span className="pill pulse ex-live" style={{ '--c': 'var(--safe)' }}><i />Live</span>}</div>
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
        </section>
      ))}
    </div>
  );
}

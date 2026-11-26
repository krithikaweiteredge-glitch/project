import { CATEGORIES, VEHICLES } from '../data';
import { href } from '../router';
import { useFleet } from '../useFleet';
import { buildModel } from '../three/models';
import Reveal from '../ui/Reveal';
import { Magnetic, RevealImage, Split } from '../ui/motion';

const counts = {};
export function partCount(look) {
  return (counts[look] ??= Object.keys(buildModel(look, []).parts).length);
}

export default function Category({ id }) {
  const cat = CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
  const fleet = useFleet();
  const hero = VEHICLES[cat.looks[0]];

  return (
    <div className="category">
      <section className="cat-hero">
        <img src={hero.photo} alt="" />{/* the photo always shows the vehicle; some clips spend seconds on the scenery */}
        <div className="cat-hero-copy">
          <div>
            <div className="eyebrow"><b>{String(cat.looks.length).padStart(2, '0')}</b> vehicle types</div>
            <h1>{cat.name}</h1>
            <p className="serif-lede">{cat.blurb}</p>
          </div>
          <nav className="cat-switch" aria-label="Categories">
            {CATEGORIES.map((c) => <a key={c.id} href={href('fleet', c.id)} className={c.id === cat.id ? 'on' : ''}>{c.name}</a>)}
          </nav>
        </div>
      </section>

      <section className="sect" style={{ paddingTop: 20 }}>
        {cat.looks.map((l, k) => {
          const v = VEHICLES[l], live = fleet?.filter((a) => a.look === l) || [];
          return (
            <article key={l} className="feature">
              <a className="feature-link" href={href('vehicle', l)} data-cursor="Explore">
                <RevealImage src={v.photo} alt={v.name} className="feature-media">
                  {live.length > 0 && <span className="pill pulse" style={{ '--c': 'var(--safe)' }}><i />Live · {live.map((a) => a.id).join(', ')}</span>}
                </RevealImage>
              </a>
              <Reveal delay={120}>
                <div className="feature-idx">{String(k + 1).padStart(2, '0')} / {String(cat.looks.length).padStart(2, '0')}</div>
                <Split text={v.name} />
                <div className="serif-lede">{v.tag}</div>
                <p className="body">{v.text}</p>
                <div className="specs">
                  <div><span>Monitored parts</span><b>{partCount(l)}</b></div>
                  <div><span>Life measured in</span><b>{v.unit}</b></div>
                  <div><span>Data</span><b>{live.length ? 'Live' : 'Demo'}</b></div>
                </div>
                <div className="hero-cta" style={{ animation: 'none', marginTop: 0 }}>
                  <Magnetic><a className="btn solid" href={href('vehicle', l)}>Inspect the twin <span className="ar">→</span></a></Magnetic>
                </div>
                <p className="mono muted" style={{ fontSize: 11, marginTop: 18 }}>{v.examples}</p>
              </Reveal>
            </article>
          );
        })}
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, VEHICLES } from '../data';
import { href } from '../router';
import { useFleet } from '../useFleet';
import { toggleTheme, useTheme } from '../theme';

export function ThemeButton() {
  const t = useTheme();
  return (
    <button className="theme-btn" onClick={toggleTheme} aria-label={t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={t === 'dark' ? 'Light theme' : 'Dark theme'}>
      {t === 'dark'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>}
    </button>
  );
}

export function Logo() {
  return (
    <a className="logo" href={href()} aria-label="IVHM home">
      <svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true">
        <circle cx="14" cy="14" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
        <path d="M14 0v7M14 21v7M0 14h7M21 14h7" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="1.8" fill="var(--accent)" />
      </svg>
      IVHM <small>health intelligence</small>
    </a>
  );
}

export default function Nav({ page, arg, hidden }) {
  const [menu, setMenu] = useState(false);
  const [solid, setSolid] = useState(false);
  const [preview, setPreview] = useState(CATEGORIES[0].looks[0]);
  const [away, setAway] = useState(false);          // hidden while scrolling down, back on scroll up
  const last = useRef(0);
  const fleet = useFleet();

  useEffect(() => {
    const f = () => {
      const y = window.scrollY;
      setSolid(y > 30);
      setAway(y > 300 && y > last.current + 4 ? true : y < last.current - 4 ? false : (v) => v);
      last.current = y;
    };
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => { setMenu(false); }, [page, arg]);
  useEffect(() => { document.body.classList.toggle('locked', menu); }, [menu]);
  if (hidden) return null;
  const live = fleet?.length || 0;
  const pv = VEHICLES[preview];

  return (
    <header className={`nav ${['fleet', 'vehicle'].includes(page) ? 'onmedia' : ''} ${solid && !menu ? 'solid' : ''} ${away && !menu ? 'hide' : ''} ${menu ? 'menu-open' : ''}`}>
      <div className="nav-row">
        <Logo />
        <nav className="nav-center" aria-label="Main">
          <a href={href()} className={page === 'home' ? 'on' : ''}>Overview</a>
          {CATEGORIES.map((c) => <a key={c.id} href={href('fleet', c.id)} className={arg === c.id || (page === 'vehicle' && c.looks.includes(arg)) ? 'on' : ''}>{c.short}</a>)}
        </nav>
        <div className="nav-right">
          <span className="pill pulse" style={{ '--c': live ? 'var(--safe)' : 'var(--mute)' }} title={live ? 'Connected to the IVHM live server' : 'IVHM server not reachable: pages show demo data'}>
            <i />{live ? `${live} live` : 'Demo'}
          </span>
          <ThemeButton />
          <button className="btn line sm" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>{menu ? 'Close' : 'All platforms'}</button>
          <button className="burger" onClick={() => setMenu((m) => !m)} aria-label="Menu"><span /><span /></button>
        </div>
      </div>

      <div className={`menu ${menu ? 'show' : ''}`}>
        <div className="menu-list">
          {CATEGORIES.map((c, k) => (
            <div key={c.id} className="menu-cat" onMouseEnter={() => setPreview(c.looks[0])}>
              <a href={href('fleet', c.id)}><sup>0{k + 1}</sup>{c.name}</a>
              <div className="menu-items">
                {c.looks.map((l) => (
                  <a key={l} href={href('vehicle', l)} onMouseEnter={() => setPreview(l)}>
                    {VEHICLES[l].name}{fleet?.some((a) => a.look === l) && <span className="live-dot" />}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="menu-preview">
          {Object.values(VEHICLES).map((v) => <img key={v.look} src={v.photo} alt="" className={v.look === preview ? 'on' : ''} loading="lazy" />)}
          <div className="menu-preview-cap">
            <div className="eyebrow plain">{CATEGORIES.find((c) => c.looks.includes(preview))?.name}</div>
            <h3>{pv.name}</h3>
            <p className="serif" style={{ fontSize: 22 }}>{pv.tag}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

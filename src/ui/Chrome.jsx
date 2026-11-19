import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useSection } from '../store';

const NAMES = ['Overview', 'Digital twin', 'Detect', 'Measure', 'Sensors', 'Predict', 'Decide', 'Fix', 'Fleet', 'IVHM'];

/** fixed frame around the page: nav, section counter, progress rail, corner brackets */
export function Chrome() {
  const s = useSection();
  return (
    <div className="chrome" aria-hidden="false">
      <nav className="nav">
        <div className="logo">
          <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M12 1v6M12 17v6M1 12h6M17 12h6" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="2" fill="#67e8f9" /></svg>
          IVHM
        </div>
        <div className="links mono"><span>Platform</span><span>How it works</span><span>Fleet</span><span>Contact</span></div>
        <div className="count mono">[ {String(s + 1).padStart(2, '0')} / 10 ] <b>{NAMES[s]}</b></div>
      </nav>
      <div className="rail"><i /></div>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      <div className="scrollcue mono">SCROLL</div>
    </div>
  );
}

/** preloader: counts to 100, then lifts away */
export function Loader() {
  const { active, progress } = useProgress();
  const [n, setN] = useState(0);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    let raf, start = performance.now();
    const step = (now) => {
      const timed = Math.min(100, ((now - start) / 1700) * 100);
      const v = Math.floor(Math.min(timed, active ? Math.max(progress, 60) : 100));
      setN(v);
      if (v < 100) raf = requestAnimationFrame(step); else setTimeout(() => setGone(true), 350);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, progress]);
  return (
    <div className={`loader ${gone ? 'gone' : ''}`}>
      <div className="mono dim">INITIALISING DIGITAL TWIN</div>
      <div className="pct">{n}<span>%</span></div>
      <div className="bar"><i style={{ width: `${n}%` }} /></div>
    </div>
  );
}

// The motion layer: smooth scrolling, preloader, page curtain, cursor, magnetic hover, text and image reveals.
import { createContext, useContext, useEffect, useRef, useState, Fragment } from 'react';
import Lenis from 'lenis';

// ---------- smooth scrolling (Lenis) ----------
const LenisCtx = createContext(null);
export const useLenis = () => useContext(LenisCtx);
export function SmoothScroll({ children }) {
  const [lenis, setLenis] = useState(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const l = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    let raf;
    const loop = (t) => { l.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    setLenis(l);
    return () => { cancelAnimationFrame(raf); l.destroy(); };
  }, []);
  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>;
}

// ---------- preloader: counter + drawn mark, then the curtain lifts ----------
export function Preloader() {
  const [n, setN] = useState(0);
  // shown once per browser session; later visits go straight in
  const [done, setDone] = useState(() => { try { return sessionStorage.getItem('ivhm-loaded') === '1' ? 'gone' : false; } catch { return false; } });
  useEffect(() => {
    if (done) return;
    let raf; const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 2200), e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(e * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else setTimeout(() => { setDone(true); try { sessionStorage.setItem('ivhm-loaded', '1'); } catch { /* private mode */ } }, 450);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [done]);
  if (done === 'gone') return null;
  return (
    <div className={`preloader ${done ? 'lift' : ''}`} onTransitionEnd={() => done && setDone('gone')}>
      <svg viewBox="0 0 120 120" className="pre-mark" aria-hidden="true">
        <circle cx="60" cy="60" r="44" /><circle cx="60" cy="60" r="22" /><path d="M60 4v26M60 90v26M4 60h26M90 60h26" />
      </svg>
      <div className="pre-word">IVHM</div>
      <div className="pre-count"><span>{String(n).padStart(3, '0')}</span></div>
      <div className="pre-line"><i style={{ transform: `scaleX(${n / 100})` }} /></div>
      <div className="pre-tag">Every part. <em>Every flight.</em></div>
    </div>
  );
}

// ---------- page curtain: plays on every route change ----------
export function Curtain({ routeKey }) {
  const [k, setK] = useState(0);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setK((x) => x + 1); }, [routeKey]);
  return k ? <div className="curtain" key={k}><span>IVHM</span></div> : null;
}

// ---------- custom cursor (pointer devices only) ----------
export function Cursor() {
  const dot = useRef(), ring = useRef();
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState('');
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.body.classList.add('has-cursor');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf;
    const move = (e) => {
      x = e.clientX; y = e.clientY;
      const t = e.target.closest?.('[data-cursor], a, button, input, canvas');
      const c = t?.getAttribute?.('data-cursor');
      setLabel(c && c !== 'hide' ? c : '');
      setMode(c === 'hide' ? 'hide' : c ? 'label' : t?.tagName === 'CANVAS' ? 'canvas' : t ? 'hover' : '');
    };
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', move); raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); document.body.classList.remove('has-cursor'); };
  }, []);
  return (
    <>
      <div ref={ring} className={`cur-ring ${mode}`}><span>{label}</span></div>
      <div ref={dot} className={`cur-dot ${mode}`} />
    </>
  );
}

// ---------- magnetic: the element leans toward the pointer ----------
export function Magnetic({ children, strength = 0.32 }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    const m = (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px)`; };
    const l = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', m); el.addEventListener('mouseleave', l);
    return () => { el.removeEventListener('mousemove', m); el.removeEventListener('mouseleave', l); };
  }, [strength]);
  return <span ref={ref} className="magnetic">{children}</span>;
}

// ---------- in view ----------
export function useInView(opts = { threshold: 0.2 }) {
  const ref = useRef();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, opts);
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

/** headline whose words rise out of a mask, one after another. Words starting with _ are set in italic. */
export function Split({ text, as: Tag = 'h2', className = '', delay = 0, stagger = 45 }) {
  const [ref, seen] = useInView({ threshold: 0.25 });
  const lines = text.split('\n');
  let k = 0;
  return (
    <Tag ref={ref} className={`split ${seen ? 'in' : ''} ${className}`}>
      {lines.map((line, li) => (
        <span className="split-line" key={li}>
          {line.split(' ').map((w, wi) => {
            const it = w.startsWith('_'); const i = k++;
            // a real space between words, so the heading reads as words when copied, indexed or read aloud
            return <Fragment key={wi}>{wi > 0 && ' '}<span className="split-w"><span style={{ transitionDelay: `${delay + i * stagger}ms` }} className={it ? 'it' : ''}>{it ? w.slice(1).replace(/_/g, ' ') : w}</span></span></Fragment>;
          })}
          {li < lines.length - 1 && ' '}
        </span>
      ))}
    </Tag>
  );
}

/** image that wipes open and settles from a slight zoom; parallax drift while on screen */
export function RevealImage({ src, alt = '', className = '', speed = 0.08, children }) {
  const [ref, seen] = useInView({ threshold: 0.15 });
  const img = useRef();
  useEffect(() => {
    const el = ref.current;
    const f = () => {
      if (!el || !img.current) return;
      const r = el.getBoundingClientRect(), p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.current.style.setProperty('--py', `${(-p * speed * 100).toFixed(2)}%`);
    };
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [speed]);
  return (
    <div ref={ref} className={`rimg ${seen ? 'in' : ''} ${className}`}>
      {/* the clip sits on an inner layer: a fully clipped element counts as off-screen and would never reveal */}
      <div className="rimg-mask"><img ref={img} src={src} alt={alt} loading="lazy" draggable={false} /></div>
      {children}
    </div>
  );
}

/** endless line of large outlined words */
export function Marquee({ items, speed = 40 }) {
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track" style={{ animationDuration: `${speed}s` }}>
        {[...row, ...row].map((t, k) => <span key={k}>{t}<i>✦</i></span>)}
      </div>
    </div>
  );
}

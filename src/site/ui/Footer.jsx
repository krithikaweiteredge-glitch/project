import { CATEGORIES } from '../data';
import { href } from '../router';
import { Logo } from './Nav';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p>Integrated Vehicle Health Management. How healthy every part is now, what it is doing live, how long it has left, and whether it is safe to go.</p>
        </div>
        <div>
          <h4>Platforms</h4>
          {CATEGORIES.map((c) => <a key={c.id} href={href('fleet', c.id)}>{c.name}</a>)}
        </div>
        <div>
          <h4>Digital twins</h4>
          <a href={href('vehicle', 'quadcopter')}>Quadcopter</a>
          <a href={href('vehicle', 'fighter_twin_engine')}>Fighter (twin engine)</a>
          <a href={href('vehicle', 'helicopter')}>Helicopter</a>
          <a href={href('vehicle', 'male_uav')}>MALE UAV</a>
        </div>
        <div>
          <h4>More</h4>
          <a href={href('credits')}>Photo & video credits</a>
        </div>
      </div>
      <div className="footer-word" aria-hidden="true">IVHM</div>
      <div className="footer-base">
        <span>© 2026 IVHM · Every part. Every flight.</span>
        <span>Photos and videos from Wikimedia Commons · <a href={href('credits')}>credits</a></span>
      </div>
    </footer>
  );
}

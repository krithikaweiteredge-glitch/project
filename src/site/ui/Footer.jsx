import { href } from '../router';
import { useFleet } from '../useFleet';
import { Logo } from './Nav';

export default function Footer() {
  // "Live digital twin" opens the inspector of a live aircraft: the airliner (NASA engine data) when it is live
  const fleet = useFleet();
  const looks = (fleet || []).map((a) => a.look);
  const twin = looks.includes('airliner_narrowbody') ? 'airliner_narrowbody' : looks[0] || 'airliner_narrowbody';
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p>Integrated Vehicle Health Management for helicopters, fighter jets, UAVs, drones and airliners: how healthy every part is, how long it has left, and whether it is safe to fly.</p>
        </div>
        <div><h4>Product</h4><a href={href('platforms')}>Platforms</a><a href={href('vehicle', twin, 'inspect')}>Live digital twin</a></div>
        <div><h4>Company</h4><a href={href('about')}>About</a><a href={href('contact')}>Contact</a></div>
        <div><h4>Legal</h4><a href={href('credits')}>Photo & model credits</a></div>
      </div>
      <div className="footer-base">
        <span>© 2026 IVHM</span>
        <span>Photos from Wikimedia Commons · 3D models credited on the <a href={href('credits')}>credits page</a></span>
      </div>
    </footer>
  );
}

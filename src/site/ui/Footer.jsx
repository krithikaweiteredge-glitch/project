import { href } from '../router';
import { Logo } from './Nav';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p>Integrated Vehicle Health Management for helicopters, fighter jets, UAVs, drones and airliners: how healthy every part is, how long it has left, and whether it is safe to fly.</p>
        </div>
        <div><h4>Product</h4><a href={href('platforms')}>Platforms</a><a href={href()}>Live digital twin</a></div>
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

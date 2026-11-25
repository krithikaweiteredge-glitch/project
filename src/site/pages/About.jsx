// About: what IVHM is, how it is proven, and how it is deployed.
import Reveal from '../ui/Reveal';
import { Split } from '../ui/motion';
import { Count, DEPLOY, PROOF } from './Home';

export default function About() {
  return (
    <div className="page about">
      <header className="page-head">
        <div className="eyebrow">About IVHM</div>
        <Split as="h1" text="Health intelligence for aircraft that cannot fail." className="pro-h" />
        <p className="pro-body">IVHM (Integrated Vehicle Health Management) watches every monitored part of a helicopter, fighter jet, UAV, drone or airliner. Each part learns its own normal from its own data; the platform predicts remaining life with an honest range and gives one verdict before every flight: Safe, Caution or No-go, with the service task that clears it.</p>
      </header>

      <section className="pro-sec">
        <div className="pro-head split-head">
          <div><div className="eyebrow">Validation</div><Split text="Proven on real data." className="pro-h" /></div>
          <Reveal delay={120}><p className="pro-body">Every model is checked against public run-to-failure data before it ships, and each result states its limits.</p></Reveal>
        </div>
        <div className="proof-grid">
          {PROOF.map((x, i) => (
            <Reveal key={x.t} className="proof" delay={i * 90}>
              <b><Count to={x.n} suffix={x.s || ''} prefix={x.p || ''} decimals={x.dec || 0} /></b>
              <h4>{x.t}</h4>
              <p>{x.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pro-sec pro-band">
        <div className="pro-head">
          <div className="eyebrow">Deployment & security</div>
          <Split text="Ready for the flight line and the secure facility." className="pro-h" />
        </div>
        <div className="deploy-grid">
          {DEPLOY.map(([t, d], i) => (
            <Reveal key={t} className="deploy" delay={i * 90}><h4>{t}</h4><p>{d}</p></Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

// About: what IVHM is, how it is proven, and how it is deployed.
import { useState } from 'react';
import Reveal from '../ui/Reveal';
import { Split } from '../ui/motion';
import { DEPLOY } from './Home';
import { BENCHMARKS, QUAL_BADGES, QUAL_BASELINE, QUAL_NOTE, QUAL_TITLE, SUBSYSTEMS, downloadQualification } from '../qualification';

/** one results table; column `lead` (the subsystem) is the row header. Scrolls sideways on a narrow screen */
function QualTable({ t, lead }) {
  return (
    <div className="qual-table" role="tabpanel">
      <p className="qual-lead">{t.lead}</p>
      <div className="qual-scroll" tabIndex={0} aria-label={t.title}>
        <table>
          <caption>{t.title}</caption>
          <thead><tr>{t.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r[0] + r[1]}>
                {r.map((c, i) => (i === lead ? <th key={i} scope="row">{c}</th> : <td key={i} className={i === 0 && lead === 1 ? 'num' : undefined}>{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** subsystem verification: the qualification baseline and both result tables, in tabs */
function Qualification() {
  const [tab, setTab] = useState(0);
  const tabs = [[BENCHMARKS, 0], [SUBSYSTEMS, 1]];
  return (
    <section className="pro-sec qual">
      <div className="pro-head split-head">
        <div>
          <div className="eyebrow">Validation</div>
          <Split text={QUAL_TITLE} className="pro-h" />
          <div className="qual-badges">{QUAL_BADGES.map((b) => <span key={b} className="qual-badge"><i />{b}</span>)}</div>
        </div>
        <Reveal delay={120}><p className="pro-body"><b>Level 1 Qualification Baseline:</b> {QUAL_BASELINE}</p></Reveal>
      </div>
      <div className="qual-tabs" role="tablist" aria-label="Qualification results">
        {tabs.map(([t], i) => (
          <button key={t.tab} role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>
            <span>Table {i + 1}</span>{t.tab}
          </button>
        ))}
      </div>
      <QualTable key={tab} t={tabs[tab][0]} lead={tabs[tab][1]} />
      <aside className="qual-note"><b>{QUAL_NOTE.title}</b><p>{QUAL_NOTE.text}</p></aside>
      <button className="btn line qual-dl" onClick={downloadQualification}>Download the evaluation summary (PDF)</button>
    </section>
  );
}

export default function About() {
  return (
    <div className="page about">
      <header className="page-head">
        <div className="eyebrow">About IVHM</div>
        <Split as="h1" text="Vehicle Health Management for Mission-Critical Aircraft & Fleets." className="pro-h" />
        <p className="pro-lead">Level 1 Software Qualification Complete: Verified on 690 automated tests and NASA / industrial benchmarks. Level 2 on-premise flight-line integration ready.</p>
        <p className="pro-body">IVHM (Integrated Vehicle Health Management) watches every monitored part of a helicopter, fighter jet, UAV, drone or airliner. Each part learns its own normal from its own data; the platform predicts remaining life with an honest range and gives one verdict before every flight: Safe, Caution or No-go, with the service task that clears it.</p>
      </header>

      <Qualification />

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

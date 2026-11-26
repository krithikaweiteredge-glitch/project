// Subsystem verification and fault-detection accuracy: the qualification figures shown on the About page and in the
// downloadable evaluation summary. One source for both, so the page and the PDF never disagree.

export const QUAL_TITLE = 'Subsystem Verification & Fault Detection Accuracy';
export const QUAL_BASELINE = 'Every subsystem model is mathematically qualified across 690 automated regression tests, physical run-to-failure benchmarks (NASA, FEMTO, ZeMA), and simulated aircraft fleet evaluations under heavy-tailed sensor noise.';
export const QUAL_BADGES = ['Level 1 Qualified', 'Deterministic Physics Twins'];

/** Table 1: public benchmarks and real machines, run-to-failure validated */
export const BENCHMARKS = {
  tab: 'Public Benchmarks & Test Rigs',
  title: 'Public Benchmarks & Real Machines (Run-to-Failure Validated)',
  lead: 'Performance on real-world industrial and aerospace datasets.',
  head: ['Subsystem / Component', 'Benchmark Dataset & Source', 'Detection Rate / Accuracy', 'Remaining Useful Life (RUL) Accuracy', 'Notes & Calibration'],
  rows: [
    ['Turbofan Jet Engines', 'NASA C-MAPSS (FD001–FD004, 100 test engines)', '100% of failures caught (0 early false alarms)', '12.2 cycles RMSE (live twin); 13.0–13.6 benchmark', 'Warnings 27–45 cycles prior to failure; 90% confidence lower bound holds 91%–92%'],
    ['Rolling-Element Bearings', 'FEMTO / PRONOSTIA (17 run-to-failure tests)', '17 / 17 failures caught (100%)', 'Median RUL error 18% / 18% / 30% across life phases', 'Spectral kurtosis & RMS; 90% confidence range holds 90%'],
    ['Air Compressor / APU', 'MetroPT-3 (Real Metro train in service, 1.5M readings)', '4 / 4 reported leaks detected (100%)', 'Immediate NO-GO threshold', 'Detected within 0.7 h; 1 leak warned 7.7 h early'],
    ['Hydraulic System', 'ZeMA / UCI Fluid Power Rig (2,205 test cycles)', '97.7% – 100% condition grade', 'Multi-component health grade', 'Cooler: 99.9%, Valve: 100%, Pump: 100%, Accumulator: 97.9%'],
    ['Airframe Structural Fatigue', 'Virkler 1979 (68 aluminium 2024-T3 panels)', 'Crack growth propagation tracking', 'RUL error within 1.2% – 4.6% of total life', 'Tested at 25%, 50%, 75%, and 90% life milestones'],
    ['Li-ion Battery Cells', 'NASA PCoE & CALCE (Electrochemical cells)', 'State of Health (SOH) & capacity fade', 'Life error 3.7% – 12.0% of total cycle life', 'Extended Kalman Filter tracking cell resistance (R₀)'],
    ['Industrial Fluid Filters', 'Hagmeyer et al. 2021 (50 test filters)', 'Darcy cake-filtration resistance', '9.3 seconds RMSE on 50–300 s cycles', 'Real-time clogging detection'],
    ['Machining Spindle / Tools', 'NASA / UC Berkeley Milling (15 inserts)', 'Flank wear from spindle current', 'RUL error within 6% – 17% of tool life', 'Acoustic emission & current RMS'],
    ['Transmission Gearbox', 'SpectraQuest Mechanical Diagnostic Bench', '10 / 10 broken tooth loads detected', 'Vibration indicator shift', '0 false alarms across 243 healthy baseline windows'],
    ['Power Inverter (IGBT)', 'NASA Ames Accelerated Thermal Overstress', 'Precursor leakage detection', 'Caution flagged 121 min prior to latch-up', 'Early alert before catastrophic thermal failure'],
  ],
};

/** Table 2: tactical UAV and aerospace subsystems (DRDO Problem 6 scope) */
export const SUBSYSTEMS = {
  tab: 'Aircraft & UAV Subsystems',
  title: 'Tactical UAV & Aerospace Subsystems (DRDO Problem 6 Scope)',
  lead: 'Evaluated on simulated multi-aircraft fleets under realistic sensor noise and dropouts.',
  head: ['#', 'Subsystem', 'Failure Modes Diagnosed', 'Fault Diagnosis Accuracy (Clean / Noise)', 'False Alarm Rate', 'RUL Accuracy (±20% Band)'],
  rows: [
    ['1', 'Electro-Mechanical Actuators (EMA)', 'Friction rise, backlash, position bias, coil degradation', '99.6% clean / 98.8% noise', '0.0%', '84% – 93%'],
    ['2', 'Landing Gear & Brakes', 'Strut nitrogen leakage, oil loss, brake wear & drag, tyre leaks', '97.7% clean / 96.4% noise', '0.2% – 2.3%', '48% – 69%'],
    ['3', 'Fuel System', 'Boost pump wear, filter clogging, fuel feed leaks, gauge drift', '96.3% clean / 94.9% noise', '0.3% – 2.0%', '69% – 76%'],
    ['4', 'Electrical Power (28 V DC)', 'Connector resistance, regulator drift, rectifier diode ripple', '98.7% clean / 98.4% noise', '0.5% – 0.7%', '48% – 51%'],
    ['5', 'Environmental Control (Bay Cooling)', 'Fan bearing wear, duct blockage, heat exchanger fouling', '94.7% clean / 93.0% noise', '0.9% – 4.6%', '48% – 55%'],
    ['6', 'Avionics & Line Replaceable Units', 'Solder joint thermal fatigue, DC-DC ripple, intermittent bus lines', '95.0% clean', '0.0%', '42% – 52%'],
    ['7', 'Piston Engine Propulsion', 'Cylinder misfire, compression loss, lean mixture, oil pressure drop', '94.0% (100% cylinder isolation)', '2.0%', '40% – 46%'],
    ['8', 'Fixed-Pitch Propellers', '1/rev mass imbalance, aerodynamic damage, erosion', '97.0% (balance clock angle output)', '1.2%', '67% – 69%'],
    ['9', 'Composite Airframe Structure', 'Delamination, spar disbond, impact damage, strain sensor drift', '98.0%', '0.0%', '53% – 59%'],
    ['10', 'Datalink & RF Avionics', 'Transmitter degradation, receiver noise rise, antenna cable loss', '87.0% noise / 93.0% clean', '2.7%', '19% – 31%'],
    ['11', 'GPS / GNSS Navigation', 'Antenna loss, clock bias drift, spoofing/jamming flag', '98.0%', '0.0%', '—'],
    ['12', 'Air Data System (Pitot-Static / IMU)', 'Pitot icing/obstruction, static port drift, gyro bias', '92.0% noise / 97.0% clean', '3.8%', '—'],
    ['13', 'Payload Gimbal (EO/IR)', 'Bearing friction, drive motor torque loss, encoder glitch', '96.0%', '0.2%', '36% – 52%'],
    ['14', 'Recovery Parachute', 'Squib circuit resistance, release latch time, canopy age', '98.0%', '0.0%', '83% – 88%'],
  ],
};

export const QUAL_NOTE = {
  title: 'Operational Compliance Note',
  text: 'All models are developed in accordance with MIL-STD-882E system hazard tracking and DO-178C verification guidelines. Remaining Useful Life (RUL) projections feature calibrated 90% confidence lower bounds to guarantee conservative, airworthy flight-line dispatch decisions.',
};

// ---------- the downloadable evaluation summary ----------
const INK = [20, 22, 26], MUTE = [120, 126, 135], LINE = [222, 224, 228], DARK = [11, 12, 15];
/** the PDF's built-in fonts are Latin-1 only */
const ascii = (s) => String(s ?? '').replace(/[–—]/g, '-').replace(/₀/g, '0').replace(/±/g, '+/-').replace(/[^\x20-\x7E]/g, '');

/** builds the evaluation summary PDF and saves it (the PDF library loads only when someone asks for it) */
export async function downloadQualification() {
  const [{ jsPDF }, { applyPlugin }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  applyPlugin(jsPDF);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const W = 297, M = 14;
  const date = new Date().toISOString().slice(0, 10);

  doc.setFillColor(...DARK); doc.rect(0, 0, W, 36, 'F');
  doc.setTextColor(243, 241, 236); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('IVHM', M, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 156, 165);
  doc.text('INTEGRATED VEHICLE HEALTH MANAGEMENT', M + 15, 13);
  doc.text(`Evaluation summary  |  ${date}`, W - M, 13, { align: 'right' });
  doc.setTextColor(243, 241, 236); doc.setFontSize(19); doc.text(ascii(QUAL_TITLE), M, 27);

  let y = 46;
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`Level 1 Qualification Baseline  |  ${QUAL_BADGES.join('  |  ')}`, M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE);
  const base = doc.splitTextToSize(ascii(QUAL_BASELINE), W - 2 * M); doc.text(base, M, y + 5.5);
  y += 6 + base.length * 4.2;

  const table = (t, n, widths) => {
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text(ascii(`Table ${n}: ${t.title}`), M, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTE); doc.text(ascii(t.lead), M, y + 11);
    doc.autoTable({
      startY: y + 14, margin: { left: M, right: M },
      head: [t.head.map(ascii)], body: t.rows.map((r) => r.map(ascii)),
      styles: { font: 'helvetica', fontSize: 7.6, cellPadding: 2.1, textColor: INK, lineColor: LINE, lineWidth: 0.2, valign: 'top' },
      headStyles: { fillColor: [244, 245, 247], textColor: INK, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w, ...(i === (n === 1 ? 0 : 1) ? { fontStyle: 'bold' } : {}) }])),
    });
    y = doc.lastAutoTable.finalY + 8;
  };
  table(BENCHMARKS, 1, [40, 58, 50, 54, 67]);
  doc.addPage(); y = 14;
  table(SUBSYSTEMS, 2, [9, 52, 86, 50, 28, 44]);

  doc.setFillColor(244, 245, 247); doc.setDrawColor(...LINE);
  const note = doc.splitTextToSize(ascii(QUAL_NOTE.text), W - 2 * M - 10);
  doc.roundedRect(M, y, W - 2 * M, 12 + note.length * 4.2, 2, 2, 'FD');
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(ascii(QUAL_NOTE.title), M + 5, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTE); doc.text(note, M + 5, y + 12.5);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(...MUTE);
    doc.text(`IVHM evaluation summary  |  page ${p} of ${pages}`, W - M, 205, { align: 'right' });
  }
  doc.save(`IVHM_evaluation_summary_${date}.pdf`);
}

// Builds the vehicle condition report as a PDF in the browser (jsPDF + AutoTable).
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);            // adds doc.autoTable (works the same in every bundler)
import { groupOf, verdictOf } from './data';

const INK = [20, 22, 26], MUTE = [120, 126, 135], LINE = [222, 224, 228], DARK = [11, 12, 15];
const VC = { SAFE: [34, 160, 90], GO: [34, 160, 90], CAUTION: [214, 146, 22], 'NO-GO': [214, 58, 58], NO_GO: [214, 58, 58], UNKNOWN: [120, 126, 135] };
const vcol = (v) => VC[v] || VC.UNKNOWN;
const n = (x) => (x == null ? '-' : x >= 100 ? Math.round(x).toLocaleString('en-GB') : (Math.round(x * 10) / 10).toString());
const pct = (x) => (x == null ? '-' : `${Math.round(x * 100)}%`);
const ascii = (s) => String(s ?? '').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E]/g, '');

export async function downloadReport(args) {
  const { doc, filename } = await buildReport(args);
  doc.save(filename);
}

/** builds the report; returns the jsPDF document and a file name */
export async function buildReport({ vehicle, aircraft, parts, order, overall, counts, snapshot }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16;
  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const id = aircraft?.id || `${vehicle.look.toUpperCase()}-DEMO`;
  const reportNo = `IVHM-${id}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;
  const ids = Object.keys(parts);
  const demoParts = ids.filter((k) => !parts[k].live).length;

  // ---------- page 1: header band ----------
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 46, 'F');
  doc.setTextColor(243, 241, 236); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('IVHM', M, 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 156, 165);
  doc.text('INTEGRATED VEHICLE HEALTH MANAGEMENT', M + 15, 15);
  doc.text(ascii(reportNo), W - M, 15, { align: 'right' });
  doc.setTextColor(243, 241, 236); doc.setFontSize(22); doc.text('Vehicle condition report', M, 32);
  doc.setFontSize(9); doc.setTextColor(150, 156, 165); doc.text(`Generated ${stamp}`, M, 39);

  // ---------- identity + verdict ----------
  let y = 58;
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text(ascii(aircraft?.name || `${vehicle.name} (demo unit)`), M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE);
  doc.text(doc.splitTextToSize(ascii(`${vehicle.name}  |  ID ${id}  |  ${ids.length} monitored parts  |  ${aircraft ? 'Live data from the IVHM platform' : 'Demo data'}`), W - 2 * M - 54), M, y + 6);

  const vd = verdictOf(overall), vc = vcol(overall);
  doc.setFillColor(...vc); doc.roundedRect(W - M - 46, y - 8, 46, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(vd.word.toUpperCase(), W - M - 23, y + 1.6, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.text('READY TO GO?', W - M - 23, y - 3.6, { align: 'center' });

  // ---------- key figures ----------
  y += 16;
  const avg = ids.reduce((s, k) => s + (parts[k].health ?? 0), 0) / ids.length;
  const weakest = parts[order[0]];
  const lim = aircraft?.summary?.limiting;
  const shortest = lim ? { name: parts[lim.component]?.name || lim.component, rul: lim } : (() => {
    const k = ids.filter((x) => parts[x].rul).sort((a, b) => parts[a].rul.mean - parts[b].rul.mean)[0];
    return k ? { name: parts[k].name, rul: parts[k].rul } : null;
  })();
  const figs = [
    ['AVERAGE HEALTH', pct(avg)], ['SAFE / CAUTION / NO-GO', `${counts.safe} / ${counts.caution} / ${counts.nogo}`],
    ['WEAKEST PART', ascii(`${weakest.name} (${pct(weakest.health)})`)], ['SHORTEST LIFE', shortest ? ascii(`${n(shortest.rul.mean)} ${shortest.rul.unit}`) : '-'],
  ];
  const fw = (W - 2 * M) / 4;
  doc.setDrawColor(...LINE); doc.line(M, y, W - M, y);
  figs.forEach(([k, v], i) => {
    const x = M + i * fw;
    doc.setFontSize(6.5); doc.setTextColor(...MUTE); doc.text(k, x, y + 6);
    doc.setFontSize(11.5); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(v, fw - 4)[0], x, y + 13);
  });
  y += 20; doc.line(M, y, W - M, y);

  // ---------- snapshot of the twin ----------
  if (snapshot) {
    try {
      const img = new Image(); img.src = snapshot; await img.decode();
      const h = Math.min(78, ((W - 2 * M) * img.height) / img.width);
      const w = (h * img.width) / img.height;
      doc.setFillColor(...DARK); doc.rect(M, y + 5, W - 2 * M, h, 'F');
      doc.addImage(snapshot, 'JPEG', M + (W - 2 * M - w) / 2, y + 5, w, h);
      doc.setFontSize(7); doc.setTextColor(...MUTE); doc.text('Digital twin at the time of the report: parts tinted by health.', M, y + h + 9);
      y += h + 14;
    } catch (e) { console.warn('snapshot not added to the report', e); y += 6; }
  } else y += 6;

  // ---------- every part ----------
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK); doc.text('All monitored parts', M, y);
  doc.autoTable({
    startY: y + 3, margin: { left: M, right: M, bottom: 18 },
    head: [['Part', 'System', 'Health', 'Verdict', 'Remaining life (95% range)', 'Next action', 'Data']],
    body: order.map((k) => {
      const p = parts[k], r = p.rul, next = p.plan?.[0];
      return [ascii(p.name), groupOf(k), pct(p.health), verdictOf(p.verdict).word, r ? ascii(`${n(r.mean)} ${r.unit} (${n(r.lo)}-${n(r.hi)})`) : '-', ascii(next ? `${next.what} - ${next.urgency}` : '-'), p.live ? 'Live' : 'Demo'];
    }),
    styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
    headStyles: { fillColor: DARK, textColor: [243, 241, 236], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [247, 247, 248] },
    columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 22 }, 2: { cellWidth: 13, halign: 'right' }, 3: { cellWidth: 16 }, 4: { cellWidth: 36 }, 6: { cellWidth: 11 } },
    didParseCell: (h) => {
      if (h.section === 'body' && h.column.index === 3) { const k = order[h.row.index]; h.cell.styles.textColor = vcol(parts[k].verdict); h.cell.styles.fontStyle = 'bold'; }
    },
  });

  // ---------- detail for the parts that need attention (or the three weakest) ----------
  const focus = order.filter((k) => ['NO-GO', 'NO_GO', 'CAUTION'].includes(parts[k].verdict));
  const detail = (focus.length ? focus : order.slice(0, 3)).slice(0, 8);
  doc.addPage(); y = M + 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK);
  doc.text(focus.length ? 'Parts that need attention' : 'Weakest parts', M, y); y += 8;
  for (const k of detail) {
    const p = parts[k], c = vcol(p.verdict);
    const ev = (p.evidence || []).map((e) => doc.splitTextToSize(ascii(`- ${e}`), W - 2 * M - 8)).flat();
    const plan = (p.plan || []).map((t) => doc.splitTextToSize(ascii(`- ${t.what}: ${t.urgency}`), W - 2 * M - 8)).flat();
    const sens = Object.entries(p.sensors || {}).map(([s, st]) => `${s.replace(/_/g, ' ')}: ${st}`).join('   ');
    const sensLines = doc.splitTextToSize(ascii(sens), W - 2 * M - 8);
    const h = 30 + ev.length * 3.8 + plan.length * 3.8 + sensLines.length * 3.6 + 10;
    if (y + h > 278) { doc.addPage(); y = M + 4; }
    doc.setFillColor(...c); doc.rect(M, y, 1.4, h - 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK); doc.text(ascii(p.name), M + 5, y + 5);
    doc.setFontSize(9); doc.setTextColor(...c); doc.text(`${verdictOf(p.verdict).word.toUpperCase()}  |  health ${pct(p.health)}`, W - M, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE);
    doc.text(ascii(`${p.pack}  |  S/N ${p.serial}  |  ${p.live ? 'live data' : 'demo data'}`), M + 5, y + 10);
    let yy = y + 16;
    if (p.rul) { doc.setFontSize(8.5); doc.setTextColor(...INK); doc.text(ascii(`Remaining life: ${n(p.rul.mean)} ${p.rul.unit}  (95% range ${n(p.rul.lo)} - ${n(p.rul.hi)})`), M + 5, yy); yy += 5; }
    if (p.reason) { doc.setFontSize(8.5); doc.text(ascii(p.reason), M + 5, yy); yy += 5; }
    const block = (title, lines) => {
      if (!lines.length) return;
      doc.setFontSize(6.8); doc.setTextColor(...MUTE); doc.text(title, M + 5, yy); yy += 3.6;
      doc.setFontSize(8); doc.setTextColor(60, 64, 70); lines.forEach((l) => { doc.text(l, M + 7, yy); yy += 3.8; }); yy += 1.5;
    };
    block('EVIDENCE', ev); block('SERVICE PLAN', plan); block('SENSORS', sensLines);
    y = Math.max(yy, y + h - 4) + 4;
    doc.setDrawColor(...LINE); doc.line(M, y - 3, W - M, y - 3);
  }

  // ---------- footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(...MUTE);
    doc.text(ascii(`${reportNo}  |  ${vehicle.name}`), M, 291);
    doc.text(`Page ${i} of ${pages}`, W - M, 291, { align: 'right' });
    if (demoParts) doc.text(ascii(`Note: ${demoParts} of ${ids.length} parts use demo data made up for illustration, not measurements.`), M, 287);
    doc.setDrawColor(...LINE); doc.line(M, 283.5, W - M, 283.5);
  }
  return { doc, filename: `IVHM_${id}_condition_${now.toISOString().slice(0, 10)}.pdf` };
}

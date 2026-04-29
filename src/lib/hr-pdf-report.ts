// Generates a polished PDF report of a run's HR analytics card.
// Uses jsPDF native vector drawing — no DOM capture, fully crisp.

import jsPDF from "jspdf";
import type { Run } from "@/lib/run-types";
import { buildHrGraph, efficiencyFactor, summarizeHr, zoneBoundaries } from "@/lib/hr-graph";
import { timeInZones } from "@/lib/hr-zones";
import { DEFAULT_MAX_HR } from "@/lib/hr-analysis";
import { estimateVo2Max } from "@/lib/vo2max";
import { formatDuration } from "@/lib/run-utils";

type Strings = {
  title: string;
  subtitle: string;
  graph: string;
  zones: string;
  max: string;
  avg: string;
  vo2: string;
  vo2Unit: string;
  ef: string;
  distance: string;
  duration: string;
  date: string;
  generated: string;
  zoneNames: Record<1 | 2 | 3 | 4 | 5, string>;
};

const NEON: [number, number, number] = [222, 255, 154]; // #deff9a
const FG: [number, number, number] = [20, 20, 22];
const MUTED: [number, number, number] = [120, 120, 130];
const BORDER: [number, number, number] = [225, 225, 230];
const ZONE_COLORS: Record<1 | 2 | 3 | 4 | 5, [number, number, number]> = {
  1: [120, 180, 220],
  2: [110, 200, 200],
  3: [222, 255, 154],
  4: [240, 180, 90],
  5: [220, 90, 70],
};

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function fmtKm(m: number): string {
  return (m / 1000).toFixed(2) + " km";
}

export function exportHrAnalyticsPdf(run: Run, strings: Strings): void {
  const series = buildHrGraph(run);
  const stats = summarizeHr(run.hrSeries);
  const ef = efficiencyFactor(run);
  const vo2 = run.vo2maxEst ?? estimateVo2Max(run);
  const zones = timeInZones(run.hrSeries);
  const boundaries = zoneBoundaries(DEFAULT_MAX_HR);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...FG);
  doc.text(strings.title, margin, y + 6);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`${strings.date}: ${fmtDate(run.startedAt)}`, margin, y);
  y += 14;
  doc.text(
    `${strings.distance}: ${fmtKm(run.distanceM)}   ·   ${strings.duration}: ${formatDuration(run.durationMs)}`,
    margin,
    y,
  );
  y += 22;

  // Stat tiles
  const tiles = [
    { label: strings.max, value: stats.maxBpm != null ? `${stats.maxBpm}` : "—", unit: "bpm" },
    { label: strings.avg, value: stats.avgBpm != null ? `${stats.avgBpm}` : "—", unit: "bpm" },
    { label: strings.vo2, value: vo2 != null ? vo2.toFixed(1) : "—", unit: strings.vo2Unit },
    { label: strings.ef, value: ef != null ? ef.toFixed(2) : "—", unit: "" },
  ];
  const tileW = (contentW - 12 * 3) / 4;
  const tileH = 60;
  tiles.forEach((tl, i) => {
    const x = margin + i * (tileW + 12);
    doc.setDrawColor(...BORDER);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(x, y, tileW, tileH, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(tl.label.toUpperCase(), x + 10, y + 14);
    doc.setFontSize(20);
    doc.setTextColor(...FG);
    doc.text(tl.value, x + 10, y + 38);
    if (tl.unit) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(tl.unit, x + 10, y + 50);
    }
  });
  y += tileH + 24;

  // HR graph
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...FG);
  doc.text(strings.graph, margin, y);
  y += 10;

  const chartX = margin;
  const chartY = y;
  const chartW = contentW;
  const chartH = 220;
  doc.setDrawColor(...BORDER);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chartX, chartY, chartW, chartH, 8, 8, "FD");

  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 22;
  const plotX = chartX + padL;
  const plotY = chartY + padT;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  if (series.length >= 2) {
    const minMs = series[0].ms;
    const maxMs = series[series.length - 1].ms;
    const minBpm = Math.max(40, Math.floor(Math.min(...series.map((s) => s.bpm)) / 5) * 5 - 5);
    const maxBpm = Math.min(220, Math.ceil(Math.max(...series.map((s) => s.bpm)) / 5) * 5 + 5);
    const yMin = Math.min(minBpm, Math.round(DEFAULT_MAX_HR * 0.55));
    const yMax = Math.max(maxBpm, Math.round(DEFAULT_MAX_HR * 0.95));

    const xFor = (ms: number) =>
      plotX + ((ms - minMs) / Math.max(1, maxMs - minMs)) * plotW;
    const yFor = (bpm: number) =>
      plotY + plotH - ((bpm - yMin) / Math.max(1, yMax - yMin)) * plotH;

    // Y axis grid + labels (every ~20bpm)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setDrawColor(240, 240, 245);
    const step = 20;
    const startTick = Math.ceil(yMin / step) * step;
    for (let bpm = startTick; bpm <= yMax; bpm += step) {
      const yy = yFor(bpm);
      doc.line(plotX, yy, plotX + plotW, yy);
      doc.text(`${bpm}`, plotX - 6, yy + 2, { align: "right" });
    }

    // Zone reference lines
    doc.setDrawColor(200, 200, 210);
    doc.setLineDashPattern([2, 3], 0);
    boundaries.forEach((b) => {
      if (b.bpm < yMin || b.bpm > yMax) return;
      const yy = yFor(b.bpm);
      doc.line(plotX, yy, plotX + plotW, yy);
      doc.setTextColor(...MUTED);
      doc.text(`Z${b.zone - 1}`, plotX + plotW + 2, yy + 2);
    });
    doc.setLineDashPattern([], 0);

    // X axis time labels (5 ticks)
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const ms = minMs + ((maxMs - minMs) * i) / ticks;
      const xx = xFor(ms);
      doc.setTextColor(...MUTED);
      doc.text(formatDuration(ms - minMs), xx, plotY + plotH + 12, { align: "center" });
    }

    // Area fill (lines from each point down to baseline) using light neon
    doc.setFillColor(NEON[0], NEON[1], NEON[2]);
    const baseline = plotY + plotH;
    // Build polygon
    const poly: Array<[number, number]> = [];
    poly.push([xFor(series[0].ms), baseline]);
    for (const p of series) poly.push([xFor(p.ms), yFor(p.bpm)]);
    poly.push([xFor(series[series.length - 1].ms), baseline]);
    // jsPDF doesn't expose polygon fill easily on all versions; emulate with thin vertical lines
    doc.setDrawColor(NEON[0], NEON[1], NEON[2]);
    for (let i = 0; i < series.length; i++) {
      const xx = xFor(series[i].ms);
      const yy = yFor(series[i].bpm);
      doc.setLineWidth(0.6);
      doc.setDrawColor(236, 250, 200);
      doc.line(xx, yy, xx, baseline);
    }

    // Stroke line
    doc.setDrawColor(170, 210, 80);
    doc.setLineWidth(1.4);
    for (let i = 1; i < series.length; i++) {
      const x1 = xFor(series[i - 1].ms);
      const y1 = yFor(series[i - 1].bpm);
      const x2 = xFor(series[i].ms);
      const y2 = yFor(series[i].bpm);
      doc.line(x1, y1, x2, y2);
    }
    doc.setLineWidth(0.2);
  }

  y = chartY + chartH + 22;

  // Zones bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...FG);
  doc.text(strings.zones, margin, y);
  y += 10;

  const barH = 14;
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(margin, y, contentW, barH, barH / 2, barH / 2, "F");
  let cursor = margin;
  zones.forEach((sl) => {
    if (sl.pct <= 0) return;
    const w = (sl.pct / 100) * contentW;
    const c = ZONE_COLORS[sl.zone];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(cursor, y, w, barH, "F");
    cursor += w;
  });
  y += barH + 14;

  // Zone legend rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  zones.forEach((sl) => {
    const c = ZONE_COLORS[sl.zone];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.circle(margin + 5, y - 3, 3.5, "F");
    doc.setTextColor(...FG);
    doc.setFont("helvetica", "bold");
    doc.text(`Z${sl.zone}`, margin + 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(strings.zoneNames[sl.zone], margin + 38, y);
    doc.setTextColor(...FG);
    doc.setFont("helvetica", "bold");
    doc.text(`${sl.pct.toFixed(0)}%`, margin + contentW - 80, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const totalSec = Math.round(sl.ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, "0");
    doc.text(`${m}:${s}`, margin + contentW, y, { align: "right" });
    y += 16;
  });

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${strings.subtitle} · ${strings.generated} ${new Date().toLocaleString()}`, margin, pageH - 20);

  const fname = `orbit-hr-${new Date(run.startedAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}

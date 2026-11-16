"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { MonthStat } from "@/lib/utils/statistics";
import { formatEUR } from "@/lib/utils/currency";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";
import { formatMonthKey } from "@/lib/utils/projectMonths";

// Barve grafov so CSS spremenljivke na ovoju (glej StatisticsView):
// --c-in (priliv), --c-out (odhodki), --c-net (neto), --c-grid, --c-axis, --c-surface.

/** Širina vsebnika v px (grafi rišejo v pikslih, da besedilo ostane berljivo). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** "Lep" zgornji rob osi (1, 2, 2.5, 5 × 10^n). */
function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Kratek zapis za os: "1,5 k", "800". */
function axisLabel(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toLocaleString("sl-SI", { maximumFractionDigits: 1 })} k`;
  }
  return `${sign}${abs.toLocaleString("sl-SI", { maximumFractionDigits: 0 })}`;
}

function shortMonth(key: string, withYear: boolean): string {
  const [y, m] = key.split("-").map(Number);
  const name = SLOVENIAN_MONTHS[m - 1].slice(0, 3);
  return withYear ? `${name} ${String(y).slice(2)}` : name;
}

/** Pot stolpca z zaobljenim (4px) podatkovnim koncem, ravnim ob osnovnici. */
function barPath(x: number, w: number, y0: number, y1: number): string {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (y1 < y0) {
    // navzgor
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  }
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

function Tooltip({
  left,
  containerWidth,
  children,
}: {
  left: number;
  containerWidth: number;
  children: React.ReactNode;
}) {
  // Namig ostane znotraj vsebnika.
  const width = 176;
  const x = Math.max(0, Math.min(containerWidth - width, left - width / 2));
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40"
      style={{ left: x, width }}
    >
      {children}
    </div>
  );
}

function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-300">
      <span className="flex items-center gap-1.5">
        {color && (
          <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
        )}
        {label}
      </span>
      <span className="font-medium text-gray-900 tabular-nums dark:text-gray-100">{value}</span>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {item.line ? (
            <span className="h-0.5 w-4 rounded" style={{ background: item.color }} aria-hidden="true" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

const MARGIN = { top: 12, right: 8, bottom: 26, left: 40 };

/**
 * Denarni tok po mesecih: priliv navzgor, odhodki (stroški + davki) navzdol,
 * neto kot črta s točkami. Ena os (EUR).
 */
export function CashflowChart({ months, height = 240 }: { months: MonthStat[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = months.length;
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;

  const maxIn = Math.max(0, ...months.map((m) => m.revenue), ...months.map((m) => m.net));
  const maxOut = Math.max(0, ...months.map((m) => m.costs + m.tax), ...months.map((m) => -m.net));
  const top = niceCeil(maxIn) || 1;
  const bottom = maxOut > 0 ? niceCeil(maxOut) : 0;
  const span = top + bottom;
  const y = (v: number) => MARGIN.top + ((top - v) / span) * plotH;
  const y0 = y(0);

  const band = n > 0 ? plotW / n : 0;
  const barW = Math.max(2, Math.min(26, band * 0.55));
  const cx = (i: number) => MARGIN.left + band * i + band / 2;

  // Oznake osi x: vsak k-ti mesec, da se ne prekrivajo.
  const labelEvery = Math.max(1, Math.ceil(38 / Math.max(band, 1)));
  const ticks = [top, top / 2, 0, ...(bottom > 0 ? [-bottom / 2, -bottom] : [])];

  const netPoints = months.map((m, i) => `${cx(i)},${y(m.net)}`).join(" ");
  const h = hover != null ? months[hover] : null;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
      {width > 0 && n > 0 && (
        <svg width={width} height={height} role="img" aria-label="Denarni tok po mesecih">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--c-axis)" : "var(--c-grid)"}
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-gray-500 text-[10px] tabular-nums dark:fill-gray-400"
              >
                {axisLabel(t)}
              </text>
            </g>
          ))}

          {hover != null && (
            <rect
              x={MARGIN.left + band * hover}
              y={MARGIN.top}
              width={band}
              height={plotH}
              fill="var(--c-grid)"
              opacity={0.6}
            />
          )}

          {months.map((m, i) => {
            const x = cx(i) - barW / 2;
            return (
              <g key={m.key}>
                <path d={barPath(x, barW, y0, y(m.revenue))} fill="var(--c-in)" />
                <path d={barPath(x, barW, y0, y(-(m.costs + m.tax)))} fill="var(--c-out)" />
              </g>
            );
          })}

          {n > 1 && (
            <polyline
              points={netPoints}
              fill="none"
              stroke="var(--c-net)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {months.map((m, i) => (
            <circle
              key={m.key}
              cx={cx(i)}
              cy={y(m.net)}
              r={hover === i ? 5 : 3.5}
              fill="var(--c-net)"
              stroke="var(--c-surface)"
              strokeWidth={2}
            />
          ))}

          {months.map((m, i) =>
            i % labelEvery === 0 ? (
              <text
                key={m.key}
                x={cx(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px] dark:fill-gray-400"
              >
                {shortMonth(m.key, i === 0 || m.key.endsWith("-01"))}
              </text>
            ) : null
          )}

          {/* Zadetne površine (cel stolpec meseca) za namig. */}
          {months.map((m, i) => (
            <rect
              key={m.key}
              x={MARGIN.left + band * i}
              y={MARGIN.top}
              width={band}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover((v) => (v === i ? null : i))}
            />
          ))}
        </svg>
      )}

      {h && hover != null && (
        <Tooltip left={cx(hover)} containerWidth={width}>
          <p className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{formatMonthKey(h.key)}</p>
          <TipRow color="var(--c-in)" label="Priliv" value={formatEUR(h.revenue)} />
          <TipRow color="var(--c-out)" label="Odhodki" value={formatEUR(h.costs + h.tax)} />
          <TipRow color="var(--c-net)" label="Neto" value={formatEUR(h.net)} />
        </Tooltip>
      )}
    </div>
  );
}

/** Kumulativni neto skozi čas (ena serija - brez legende, naslov jo poimenuje). */
export function CumulativeChart({ months, height = 200 }: { months: MonthStat[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const values = months.reduce<number[]>(
    (acc, m) => [...acc, (acc[acc.length - 1] ?? 0) + m.net],
    []
  );
  const n = values.length;
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = height - MARGIN.top - MARGIN.bottom;

  const max = niceCeil(Math.max(0, ...values)) || 1;
  const minRaw = Math.min(0, ...values);
  const min = minRaw < 0 ? -niceCeil(-minRaw) : 0;
  const y = (v: number) => MARGIN.top + ((max - v) / (max - min)) * plotH;
  const x = (i: number) => (n <= 1 ? MARGIN.left + plotW / 2 : MARGIN.left + (plotW * i) / (n - 1));

  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = n > 0 ? `M${x(0)},${y(0)} L${line.replace(/ /g, " L")} L${x(n - 1)},${y(0)} Z` : "";
  const labelEvery = Math.max(1, Math.ceil(38 / Math.max(plotW / Math.max(n, 1), 1)));
  const ticks = [max, max / 2, 0, ...(min < 0 ? [min] : [])];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - MARGIN.left;
    const i = n <= 1 ? 0 : Math.round((px / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && n > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Kumulativni neto dobiček"
          onMouseMove={onMove}
          onClick={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--c-axis)" : "var(--c-grid)"}
              />
              <text
                x={MARGIN.left - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-gray-500 text-[10px] tabular-nums dark:fill-gray-400"
              >
                {axisLabel(t)}
              </text>
            </g>
          ))}
          <path d={area} fill="var(--c-in)" opacity={0.12} />
          <polyline
            points={line}
            fill="none"
            stroke="var(--c-in)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {months.map((m, i) =>
            i % labelEvery === 0 ? (
              <text
                key={m.key}
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px] dark:fill-gray-400"
              >
                {shortMonth(m.key, i === 0 || m.key.endsWith("-01"))}
              </text>
            ) : null
          )}
          {hover != null && (
            <>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotH}
                stroke="var(--c-axis)"
                strokeDasharray="3 3"
              />
              <circle
                cx={x(hover)}
                cy={y(values[hover])}
                r={5}
                fill="var(--c-in)"
                stroke="var(--c-surface)"
                strokeWidth={2}
              />
            </>
          )}
        </svg>
      )}
      {hover != null && months[hover] && (
        <Tooltip left={x(hover)} containerWidth={width}>
          <p className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
            {formatMonthKey(months[hover].key)}
          </p>
          <TipRow label="Skupaj do tu" value={formatEUR(values[hover])} />
          <TipRow label="Ta mesec" value={formatEUR(months[hover].net)} />
        </Tooltip>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MonthYearPicker from "@/components/calendar/MonthYearPicker";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getWorkEntriesInRange } from "@/lib/data/workEntries";
import {
  getMonthGrid,
  getMonthRange,
  SLOVENIAN_MONTHS,
  SLOVENIAN_WEEKDAYS_SHORT,
} from "@/lib/utils/date";

const CELL_SIZE = 88;
const GAP = 8;
const PADDING = 20;
const HEADER_HEIGHT = 30;
const TITLE_HEIGHT = 40;
const LEGEND_HEIGHT = 40;
const LEGEND_SAMPLE_COLOR = "#3B82F6";

type ExportTheme = "light" | "dark";

const THEME_COLORS: Record<
  ExportTheme,
  {
    background: string;
    title: string;
    weekday: string;
    dayNumber: string;
    emptyFill: string;
    emptyBorder: string;
  }
> = {
  light: {
    background: "#ffffff",
    title: "#111827",
    weekday: "#6b7280",
    dayNumber: "#111827",
    emptyFill: "#ffffff",
    emptyBorder: "#d1d5db",
  },
  dark: {
    background: "#111827",
    title: "#f3f4f6",
    weekday: "#9ca3af",
    dayNumber: "#f3f4f6",
    emptyFill: "#111827",
    emptyBorder: "#374151",
  },
};

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCalendar(
  canvas: HTMLCanvasElement,
  year: number,
  month: number,
  dayColors: Map<string, string>,
  theme: ExportTheme
) {
  const colors = THEME_COLORS[theme];
  const rows = 6;
  const width = PADDING * 2 + 7 * CELL_SIZE + 6 * GAP;
  const height =
    PADDING * 2 +
    TITLE_HEIGHT +
    HEADER_HEIGHT +
    rows * CELL_SIZE +
    (rows - 1) * GAP +
    LEGEND_HEIGHT;

  // Slikovni buffer ostane v polni ločljivosti (za oster prenos PNG), prikaz
  // (CSS širina/višina) pa je manjši - nadzorujejo ga razredi na <canvas>.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = colors.title;
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${SLOVENIAN_MONTHS[month]} ${year}`, PADDING, PADDING + 20);

  const headerTop = PADDING + TITLE_HEIGHT;
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = colors.weekday;
  ctx.textAlign = "center";
  SLOVENIAN_WEEKDAYS_SHORT.forEach((wd, i) => {
    const x = PADDING + i * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    ctx.fillText(wd, x, headerTop + 14);
  });

  const gridTop = headerTop + HEADER_HEIGHT;
  const grid = getMonthGrid(year, month);

  grid.forEach((day, i) => {
    if (!day.isCurrentMonth) return;
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = PADDING + col * (CELL_SIZE + GAP);
    const y = gridTop + row * (CELL_SIZE + GAP);
    const color = dayColors.get(day.dateKey);

    roundedRectPath(ctx, x, y, CELL_SIZE, CELL_SIZE, 8);
    if (color) {
      ctx.fillStyle = `${color}26`;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
    } else {
      ctx.fillStyle = colors.emptyFill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.emptyBorder;
    }
    ctx.stroke();

    ctx.fillStyle = colors.dayNumber;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(day.date.getDate()), x + 10, y + 22);
  });

  // Legenda: obarvani dnevi = zasedeni, neobarvani = prosti.
  const legendY = gridTop + rows * CELL_SIZE + (rows - 1) * GAP + 26;
  const swatch = 14;
  ctx.font = "500 13px system-ui, sans-serif";
  ctx.textAlign = "left";

  let lx = PADDING;
  roundedRectPath(ctx, lx, legendY - swatch + 3, swatch, swatch, 3);
  ctx.fillStyle = `${LEGEND_SAMPLE_COLOR}26`;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = LEGEND_SAMPLE_COLOR;
  ctx.stroke();
  ctx.fillStyle = colors.dayNumber;
  ctx.fillText("Obarvani dnevi = zasedeni", lx + swatch + 8, legendY);

  lx = PADDING + 230;
  roundedRectPath(ctx, lx, legendY - swatch + 3, swatch, swatch, 3);
  ctx.fillStyle = colors.emptyFill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.emptyBorder;
  ctx.stroke();
  ctx.fillStyle = colors.dayNumber;
  ctx.fillText("Neobarvani = prosti", lx + swatch + 8, legendY);
}

export default function CalendarSnapshot() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  // Privzeto sledi trenutni (razrešeni) temi aplikacije - ThemeScript nastavi
  // data-theme na <html> še pred hidracijo, zato je vrednost tu že na voljo.
  const [exportTheme, setExportTheme] = useState<ExportTheme>(() =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light"
  );
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.canShare) return;
    const testFile = new File([], "test.png", { type: "image/png" });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareSupported(navigator.canShare({ files: [testFile] }));
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { from, to } = getMonthRange(year, month);
      const entries = await getWorkEntriesInRange(supabase, from, to);
      const dayColors = new Map<string, string>();
      for (const entry of entries) {
        if (!entry.clients || dayColors.has(entry.work_date)) continue;
        dayColors.set(entry.work_date, entry.clients.color);
      }
      if (canvasRef.current) {
        drawCalendar(canvasRef.current, year, month, dayColors, exportTheme);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month, exportTheme]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate();
  }, [generate]);

  function fileName() {
    return `koledar-${year}-${String(month + 1).padStart(2, "0")}.png`;
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName();
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) return;
        const file = new File([blob], fileName(), { type: "image/png" });
        await navigator.share({
          files: [file],
          title: `Koledar ${SLOVENIAN_MONTHS[month]} ${year}`,
        });
      } catch {
        // uporabnik je prekinil deljenje - ni napaka
      } finally {
        setSharing(false);
      }
    }, "image/png");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MonthYearPicker
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setExportTheme((t) => (t === "light" ? "dark" : "light"))}
          aria-label={
            exportTheme === "light" ? "Preklopi na temno izvozno temo" : "Preklopi na svetlo izvozno temo"
          }
          title={exportTheme === "light" ? "Svetla tema izvoza" : "Temna tema izvoza"}
        >
          {exportTheme === "light" ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
      <div className="flex justify-center rounded-md border border-gray-200 p-2 dark:border-gray-800">
        <canvas ref={canvasRef} className="block h-auto w-full max-w-xs" />
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={handleDownload} disabled={loading}>
          {loading ? "Nalagam …" : "Prenesi sliko"}
        </Button>
        {shareSupported && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleShare}
            disabled={loading || sharing}
            aria-label="Deli sliko"
            title="Deli sliko"
          >
            <ShareIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

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
  dayColors: Map<string, string>
) {
  const rows = 6;
  const width = PADDING * 2 + 7 * CELL_SIZE + 6 * GAP;
  const height = PADDING * 2 + TITLE_HEIGHT + HEADER_HEIGHT + rows * CELL_SIZE + (rows - 1) * GAP;

  // Ostrejši izris na zaslonih z visoko gostoto pik (devicePixelRatio).
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111827";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${SLOVENIAN_MONTHS[month]} ${year}`, PADDING, PADDING + 20);

  const headerTop = PADDING + TITLE_HEIGHT;
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = "#6b7280";
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
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#d1d5db";
    }
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(day.date.getDate()), x + 10, y + 22);
  });
}

export default function CalendarSnapshot() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        drawCalendar(canvasRef.current, year, month, dayColors);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate();
  }, [generate]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `koledar-${year}-${String(month + 1).padStart(2, "0")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="space-y-3">
      <MonthYearPicker
        year={year}
        month={month}
        onChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
      <div className="overflow-x-auto rounded-md border border-gray-200 p-2 dark:border-gray-800">
        <canvas ref={canvasRef} className="block" />
      </div>
      <Button type="button" onClick={handleDownload} disabled={loading}>
        {loading ? "Nalagam …" : "Prenesi sliko"}
      </Button>
    </div>
  );
}

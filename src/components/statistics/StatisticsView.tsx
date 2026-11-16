"use client";

import { useEffect, useMemo, useState } from "react";
import type { MonthlyTax, ProjectWithClient } from "@/lib/types/database.types";
import { formatEUR } from "@/lib/utils/currency";
import { formatHours } from "@/lib/utils/projectCosts";
import { formatMonthKey, projectBillingMonth } from "@/lib/utils/projectMonths";
import {
  buildClientStats,
  buildMonthStats,
  inRange,
  sumMonths,
  type StatsRange,
} from "@/lib/utils/statistics";
import clsx from "@/lib/utils/clsx";
import { CashflowChart, CumulativeChart, Legend } from "./Charts";

type View = "osnovno" | "napredno";

const VIEW_KEY = "posel:statistika:pogled";
const RANGE_KEY = "posel:statistika:obdobje";

const RANGE_LABEL: Record<StatsRange, string> = {
  leto: "Letos",
  "12m": "Zadnjih 12 mes.",
  vse: "Vse",
};

// Barve grafov (diverging modra/rdeča za priliv/odhodke; neto v črnilu).
// Vrednosti iz validirane palete, ločeno za svetli in temni način.
const CHART_VARS =
  "[--c-in:#2a78d6] [--c-out:#e34948] [--c-net:#1f2937] [--c-grid:#f0efec] [--c-axis:#c3c2b7] [--c-surface:#ffffff] " +
  "[--c-fuel:#eb6834] [--c-other:#1baf7a] [--c-tax:#6250d6] " +
  "dark:[--c-in:#3987e5] dark:[--c-out:#e66767] dark:[--c-net:#f0efec] dark:[--c-grid:#2a2a28] dark:[--c-axis:#52514e] dark:[--c-surface:#111827] " +
  "dark:[--c-fuel:#d95926] dark:[--c-other:#199e70] dark:[--c-tax:#9085e9]";

function readStorage<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // brez pomnjenja
  }
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm",
            value === o.value
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900",
        className
      )}
    >
      {title && <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
      {children}
    </section>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={clsx(
          "mt-0.5 tabular-nums text-gray-900 dark:text-gray-100",
          strong ? "text-xl font-semibold" : "text-lg font-medium"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

const pct = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)} %` : "–";

export default function StatisticsView({
  projects,
  taxes,
  readOnly,
}: {
  projects: ProjectWithClient[];
  taxes: MonthlyTax[];
  /** Gledalec deljenih strank: davki niso prikazani. */
  readOnly: boolean;
}) {
  const [view, setView] = useState<View>("osnovno");
  const [range, setRange] = useState<StatsRange>("12m");

  // Zapomnjen izbor (po brskalniku) - prebran po prvem izrisu.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(readStorage(VIEW_KEY, ["osnovno", "napredno"] as const, "osnovno"));
    setRange(readStorage(RANGE_KEY, ["leto", "12m", "vse"] as const, "12m"));
  }, []);

  const includeTax = !readOnly;
  const allMonths = useMemo(
    () => buildMonthStats(projects, taxes, includeTax),
    [projects, taxes, includeTax]
  );
  const months = useMemo(() => allMonths.filter((m) => inRange(m.key, range)), [allMonths, range]);
  const rangeProjects = useMemo(
    () => projects.filter((p) => inRange(projectBillingMonth(p), range)),
    [projects, range]
  );
  const clientStats = useMemo(() => buildClientStats(rangeProjects), [rangeProjects]);
  const totals = sumMonths(months);
  const activeMonths = months.filter((m) => m.revenue > 0 || m.costs > 0).length;
  const best = months.reduce<(typeof months)[number] | null>(
    (b, m) => (!b || m.net > b.net ? m : b),
    null
  );
  const advanced = view === "napredno";
  const netLabel = includeTax ? "Neto dobiček" : "Dobiček";

  return (
    <div className={clsx("space-y-4", CHART_VARS)}>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Pogled"
          value={view}
          onChange={(v) => {
            setView(v);
            writeStorage(VIEW_KEY, v);
          }}
          options={[
            { value: "osnovno", label: "Osnovno" },
            { value: "napredno", label: "Napredno" },
          ]}
        />
        <div className="sm:ml-auto">
          <Segmented
            label="Obdobje"
            value={range}
            onChange={(v) => {
              setRange(v);
              writeStorage(RANGE_KEY, v);
            }}
            options={(["leto", "12m", "vse"] as const).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
          />
        </div>
      </div>

      {months.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          V tem obdobju ni podatkov.
        </p>
      ) : (
        <>
          {/* Ključne številke */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Priliv" value={formatEUR(totals.revenue)} />
            <Stat
              label={includeTax ? "Stroški + davki" : "Stroški"}
              value={formatEUR(totals.costs + totals.tax)}
            />
            <Stat
              label={netLabel}
              value={formatEUR(totals.net)}
              sub={`marža ${pct(totals.net, totals.revenue)}`}
              strong
            />
            <Stat label="Ure" value={formatHours(totals.hours)} sub={`${totals.projects} projektov`} />
          </div>

          {advanced && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Povprečno na mesec"
                value={formatEUR(activeMonths ? totals.net / activeMonths : 0)}
                sub={`${activeMonths} mes. z delom`}
              />
              <Stat
                label="Priliv na uro"
                value={totals.hours > 0 ? formatEUR(totals.revenue / totals.hours) : "–"}
                sub={totals.hours > 0 ? `neto ${formatEUR(totals.net / totals.hours)}/h` : undefined}
              />
              <Stat
                label="Povprečno na projekt"
                value={totals.projects ? formatEUR(totals.revenue / totals.projects) : "–"}
              />
              <Stat
                label="Najboljši mesec"
                value={best ? formatEUR(best.net) : "–"}
                sub={best ? formatMonthKey(best.key) : undefined}
              />
            </div>
          )}

          <Card title="Denarni tok po mesecih">
            <div className="mb-2">
              <Legend
                items={[
                  { label: "Priliv", color: "var(--c-in)" },
                  { label: includeTax ? "Odhodki (stroški + davki)" : "Stroški", color: "var(--c-out)" },
                  { label: netLabel, color: "var(--c-net)", line: true },
                ]}
              />
            </div>
            <CashflowChart months={months} />
          </Card>

          {advanced && (
            <>
              <Card title={`${netLabel} skupaj skozi čas`}>
                <CumulativeChart months={months} />
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Priliv po partnerjih">
                  <ul className="space-y-2.5">
                    {clientStats.map((c) => (
                      <li key={c.id}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-gray-700 dark:text-gray-300">{c.name}</span>
                          <span className="flex-shrink-0 tabular-nums text-gray-900 dark:text-gray-100">
                            {formatEUR(c.revenue)}
                            <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                              {pct(c.revenue, totals.revenue)}
                            </span>
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${totals.revenue > 0 ? Math.max(1, (c.revenue / totals.revenue) * 100) : 0}%`,
                              background: c.color,
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {c.projects} {c.projects === 1 ? "projekt" : "projektov"} · dobiček{" "}
                          {formatEUR(c.profit)}
                          {c.hours > 0 && ` · ${formatHours(c.hours)}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card title="Kam gre denar">
                  {(() => {
                    const parts = [
                      { label: "Gorivo", value: totals.fuel, color: "var(--c-fuel)" },
                      { label: "Ostali stroški", value: totals.otherCosts, color: "var(--c-other)" },
                      ...(includeTax ? [{ label: "Davki", value: totals.tax, color: "var(--c-tax)" }] : []),
                    ];
                    const sum = parts.reduce((s, p) => s + p.value, 0);
                    if (sum <= 0) {
                      return <p className="text-sm text-gray-500 dark:text-gray-400">Ni odhodkov.</p>;
                    }
                    return (
                      <>
                        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                          {parts
                            .filter((p) => p.value > 0)
                            .map((p) => (
                              <div
                                key={p.label}
                                style={{ width: `${(p.value / sum) * 100}%`, background: p.color }}
                                title={`${p.label}: ${formatEUR(p.value)}`}
                              />
                            ))}
                        </div>
                        <ul className="mt-3 space-y-1.5">
                          {parts.map((p) => (
                            <li key={p.label} className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                                {p.label}
                              </span>
                              <span className="tabular-nums text-gray-900 dark:text-gray-100">
                                {formatEUR(p.value)}
                                <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                                  {pct(p.value, sum)}
                                </span>
                              </span>
                            </li>
                          ))}
                          <li className="flex justify-between gap-2 border-t border-gray-100 pt-1.5 text-sm dark:border-gray-800">
                            <span className="text-gray-500 dark:text-gray-400">Delež od priliva</span>
                            <span className="tabular-nums text-gray-900 dark:text-gray-100">
                              {pct(sum, totals.revenue)}
                            </span>
                          </li>
                        </ul>
                      </>
                    );
                  })()}
                </Card>
              </div>
            </>
          )}

          {/* Pregled po mesecih (tabela) - najnovejši zgoraj. */}
          <Card title="Pregled po mesecih">
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th className="py-1.5 pr-3 text-left font-medium">Mesec</th>
                    {advanced && <th className="px-2 py-1.5 text-right font-medium">Proj.</th>}
                    {advanced && <th className="px-2 py-1.5 text-right font-medium">Ure</th>}
                    <th className="px-2 py-1.5 text-right font-medium">Priliv</th>
                    {advanced ? (
                      <>
                        <th className="px-2 py-1.5 text-right font-medium">Gorivo</th>
                        <th className="px-2 py-1.5 text-right font-medium">Ostalo</th>
                        {includeTax && <th className="px-2 py-1.5 text-right font-medium">Davki</th>}
                      </>
                    ) : (
                      <th className="px-2 py-1.5 text-right font-medium">Odhodki</th>
                    )}
                    <th className="py-1.5 pl-2 text-right font-medium">{includeTax ? "Neto" : "Dobiček"}</th>
                    {advanced && <th className="py-1.5 pl-2 text-right font-medium">Marža</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m) => (
                    <tr key={m.key} className="border-b border-gray-100 last:border-0 dark:border-gray-800/70">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatMonthKey(m.key)}
                      </td>
                      {advanced && <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">{m.projects}</td>}
                      {advanced && (
                        <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {m.hours > 0 ? formatHours(m.hours) : "–"}
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {formatEUR(m.revenue)}
                      </td>
                      {advanced ? (
                        <>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">
                            {formatEUR(m.fuel)}
                          </td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">
                            {formatEUR(m.otherCosts)}
                          </td>
                          {includeTax && (
                            <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {formatEUR(m.tax)}
                            </td>
                          )}
                        </>
                      ) : (
                        <td className="px-2 py-1.5 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {formatEUR(m.costs + m.tax)}
                        </td>
                      )}
                      <td
                        className={clsx(
                          "py-1.5 pl-2 text-right font-medium whitespace-nowrap",
                          m.net < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {formatEUR(m.net)}
                      </td>
                      {advanced && (
                        <td className="py-1.5 pl-2 text-right text-gray-600 dark:text-gray-400">
                          {pct(m.net, m.revenue)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                    <td className="py-2 pr-3">Skupaj</td>
                    {advanced && <td className="px-2 py-2 text-right">{totals.projects}</td>}
                    {advanced && <td className="px-2 py-2 text-right whitespace-nowrap">{formatHours(totals.hours)}</td>}
                    <td className="px-2 py-2 text-right whitespace-nowrap">{formatEUR(totals.revenue)}</td>
                    {advanced ? (
                      <>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{formatEUR(totals.fuel)}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{formatEUR(totals.otherCosts)}</td>
                        {includeTax && <td className="px-2 py-2 text-right whitespace-nowrap">{formatEUR(totals.tax)}</td>}
                      </>
                    ) : (
                      <td className="px-2 py-2 text-right whitespace-nowrap">{formatEUR(totals.costs + totals.tax)}</td>
                    )}
                    <td className="py-2 pl-2 text-right whitespace-nowrap">{formatEUR(totals.net)}</td>
                    {advanced && <td className="py-2 pl-2 text-right">{pct(totals.net, totals.revenue)}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

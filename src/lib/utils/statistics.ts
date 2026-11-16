// Statistika: denarni tok po mesecih obračuna (enako kot mesečni pregled na
// strani Projekti) in razčlenitev po partnerjih.

import type { MonthlyTax, ProjectWithClient } from "@/lib/types/database.types";
import { projectFuelCost, sumCostItems, sumDayHours } from "@/lib/utils/projectCosts";
import { addMonths, projectBillingMonth } from "@/lib/utils/projectMonths";

export type MonthStat = {
  key: string; // "YYYY-MM"
  revenue: number;
  fuel: number;
  otherCosts: number;
  /** Stroški projektov (gorivo + ostali). */
  costs: number;
  tax: number;
  /** Priliv - stroški (pred davki). */
  profit: number;
  /** Dobiček - davki. */
  net: number;
  hours: number;
  projects: number;
};

export type ClientStat = {
  id: string;
  name: string;
  color: string;
  revenue: number;
  profit: number;
  hours: number;
  projects: number;
};

export type StatsRange = "leto" | "12m" | "vse";

function emptyMonth(key: string): MonthStat {
  return {
    key,
    revenue: 0,
    fuel: 0,
    otherCosts: 0,
    costs: 0,
    tax: 0,
    profit: 0,
    net: 0,
    hours: 0,
    projects: 0,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Meseci od prvega do zadnjega z (vsaj) podatki, brez lukenj - prazni
 * meseci so v grafu vidni kot ničla. Projekt se šteje v mesec obračuna.
 */
export function buildMonthStats(
  projects: ProjectWithClient[],
  taxes: Pick<MonthlyTax, "year" | "month" | "amount">[],
  includeTax: boolean
): MonthStat[] {
  const map = new Map<string, MonthStat>();
  const get = (key: string) => {
    let m = map.get(key);
    if (!m) {
      m = emptyMonth(key);
      map.set(key, m);
    }
    return m;
  };

  for (const p of projects) {
    const m = get(projectBillingMonth(p));
    const fuel = projectFuelCost(p);
    const other = sumCostItems(p.cost_items);
    m.revenue += p.revenue;
    m.fuel += fuel;
    m.otherCosts += other;
    m.hours += sumDayHours(p.day_hours);
    m.projects += 1;
  }
  if (includeTax) {
    for (const t of taxes) {
      if (!t.amount) continue;
      get(`${t.year}-${String(t.month).padStart(2, "0")}`).tax += t.amount;
    }
  }

  const keys = [...map.keys()].sort();
  if (keys.length === 0) return [];
  const out: MonthStat[] = [];
  for (let key = keys[0]; key <= keys[keys.length - 1]; key = addMonths(key, 1)) {
    const m = map.get(key) ?? emptyMonth(key);
    m.revenue = round2(m.revenue);
    m.fuel = round2(m.fuel);
    m.otherCosts = round2(m.otherCosts);
    m.costs = round2(m.fuel + m.otherCosts);
    m.tax = round2(m.tax);
    m.profit = round2(m.revenue - m.costs);
    m.net = round2(m.profit - m.tax);
    out.push(m);
  }
  return out;
}

/** Ali mesec spada v izbrano obdobje. */
export function inRange(key: string, range: StatsRange, now: Date = new Date()): boolean {
  if (range === "vse") return true;
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (range === "leto") return key.startsWith(`${now.getFullYear()}-`);
  return key >= addMonths(current, -11) && key <= current;
}

/** Priliv in dobiček po partnerjih (projekti v izbranem obdobju), padajoče po prilivu. */
export function buildClientStats(projects: ProjectWithClient[]): ClientStat[] {
  const map = new Map<string, ClientStat>();
  for (const p of projects) {
    const id = p.client_id;
    const c =
      map.get(id) ??
      ({
        id,
        name: p.clients?.company_name ?? "Neznan partner",
        color: p.clients?.color ?? "#9CA3AF",
        revenue: 0,
        profit: 0,
        hours: 0,
        projects: 0,
      } satisfies ClientStat);
    const costs = sumCostItems(p.cost_items) + projectFuelCost(p);
    c.revenue += p.revenue;
    c.profit += p.revenue - costs;
    c.hours += sumDayHours(p.day_hours);
    c.projects += 1;
    map.set(id, c);
  }
  return [...map.values()]
    .map((c) => ({ ...c, revenue: round2(c.revenue), profit: round2(c.profit) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Seštevek mesecev. */
export function sumMonths(months: MonthStat[]) {
  return months.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      fuel: acc.fuel + m.fuel,
      otherCosts: acc.otherCosts + m.otherCosts,
      costs: acc.costs + m.costs,
      tax: acc.tax + m.tax,
      profit: acc.profit + m.profit,
      net: acc.net + m.net,
      hours: acc.hours + m.hours,
      projects: acc.projects + m.projects,
    }),
    {
      revenue: 0,
      fuel: 0,
      otherCosts: 0,
      costs: 0,
      tax: 0,
      profit: 0,
      net: 0,
      hours: 0,
      projects: 0,
    }
  );
}

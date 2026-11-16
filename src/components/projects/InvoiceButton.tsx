"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import type { ProjectWithClient } from "@/lib/types/database.types";
import { formatEUR } from "@/lib/utils/currency";
import { formatDateKey } from "@/lib/utils/date";
import { sumCostItems, sumDayHours } from "@/lib/utils/projectCosts";
import {
  INVOICE_DUE_DAYS,
  INVOICE_ISSUER,
  type InvoiceData,
  nextInvoiceNumber,
  printInvoice,
  readBuyerMemory,
  rememberBuyer,
  rememberInvoiceNumber,
} from "@/lib/invoice";

type ItemDraft = { description: string; amount: string };

type Draft = Omit<InvoiceData, "items"> & { items: ItemDraft[] };

function toAmount(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return formatDateKey(new Date(y, m - 1, d + days));
}

// Privzeti osnutek: glavna postavka (priliv brez dodatnih storitev) +
// vsaka dodatna storitev kot svoja postavka.
function initialDraft(project: ProjectWithClient): Draft {
  const today = formatDateKey(new Date());
  const dates = [...project.work_dates].sort();
  const hours = sumDayHours(project.day_hours);
  const extras = project.extra_items ?? [];
  const base = Math.round((project.revenue - sumCostItems(extras)) * 100) / 100;

  const name = project.name || "Storitev";
  const hoursText = hours > 0 ? ` - ${hours.toLocaleString("sl-SI", { maximumFractionDigits: 2 })}ur` : "";
  const items: ItemDraft[] = [];
  if (base !== 0 || extras.length === 0) {
    items.push({ description: `${name}${hoursText}`, amount: String(base) });
  }
  extras.forEach((item) => {
    items.push({
      description: item.note?.trim() || "Dodatna storitev",
      amount: String(item.amount),
    });
  });

  const client = project.clients;
  const memory = client ? readBuyerMemory(client.id) : { buyer: null, vatId: null };
  const defaultBuyer = [
    client?.company_name ?? "",
    ...(client?.address ?? "").split(",").map((part) => part.trim()),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    number: nextInvoiceNumber(),
    issueDate: today,
    place: INVOICE_ISSUER.place,
    serviceFrom: dates[0] ?? today,
    serviceTo: dates[dates.length - 1] ?? today,
    dueDate: addDays(today, INVOICE_DUE_DAYS),
    buyer: memory.buyer ?? defaultBuyer,
    buyerVatId: memory.vatId ?? "",
    items,
  };
}

function InvoiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

export default function InvoiceButton({
  project,
  className,
}: {
  project: ProjectWithClient;
  className?: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateItem = (index: number, patch: Partial<ItemDraft>) =>
    setDraft((d) =>
      d ? { ...d, items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) } : d
    );

  const total = draft ? draft.items.reduce((sum, it) => sum + toAmount(it.amount), 0) : 0;

  function handleDownload() {
    if (!draft) return;
    const items = draft.items
      .filter((it) => it.description.trim() || toAmount(it.amount))
      .map((it) => ({ description: it.description.trim(), amount: toAmount(it.amount) }));
    rememberInvoiceNumber(draft.number);
    if (project.clients) rememberBuyer(project.clients.id, draft.buyer, draft.buyerVatId);
    printInvoice({ ...draft, items });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => setDraft(initialDraft(project))}
      >
        <InvoiceIcon />
        Račun
      </Button>

      <Modal open={draft != null} onClose={() => setDraft(null)} title="Ustvari račun">
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 [&_input]:min-w-0">
              <Field label="Številka računa" htmlFor="inv-number">
                <Input
                  id="inv-number"
                  value={draft.number}
                  onChange={(e) => update({ number: e.target.value })}
                />
              </Field>
              <Field label="Kraj izdaje" htmlFor="inv-place">
                <Input
                  id="inv-place"
                  value={draft.place}
                  onChange={(e) => update({ place: e.target.value })}
                />
              </Field>
              <Field label="Datum izdaje" htmlFor="inv-issue">
                <Input
                  id="inv-issue"
                  type="date"
                  value={draft.issueDate}
                  onChange={(e) =>
                    update({
                      issueDate: e.target.value,
                      dueDate: e.target.value
                        ? addDays(e.target.value, INVOICE_DUE_DAYS)
                        : draft.dueDate,
                    })
                  }
                />
              </Field>
              <Field label="Rok plačila" htmlFor="inv-due">
                <Input
                  id="inv-due"
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => update({ dueDate: e.target.value })}
                />
              </Field>
              <Field label="Storitev od" htmlFor="inv-from">
                <Input
                  id="inv-from"
                  type="date"
                  value={draft.serviceFrom}
                  onChange={(e) => update({ serviceFrom: e.target.value })}
                />
              </Field>
              <Field label="Storitev do" htmlFor="inv-to">
                <Input
                  id="inv-to"
                  type="date"
                  value={draft.serviceTo}
                  onChange={(e) => update({ serviceTo: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Kupec" htmlFor="inv-buyer">
              <Textarea
                id="inv-buyer"
                rows={4}
                value={draft.buyer}
                onChange={(e) => update({ buyer: e.target.value })}
              />
            </Field>
            <Field label="ID za DDV kupca" htmlFor="inv-vat">
              <Input
                id="inv-vat"
                value={draft.buyerVatId}
                onChange={(e) => update({ buyerVatId: e.target.value })}
              />
            </Field>

            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Storitve
              </p>
              <div className="space-y-2">
                {draft.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {/* Input ima vedno w-full, zato širino določa ovoj. */}
                    <div className="min-w-0 flex-1">
                      <Input
                        aria-label="Opis"
                        placeholder="Opis"
                        value={item.description}
                        onChange={(e) => updateItem(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <Input
                        aria-label="Znesek (EUR)"
                        placeholder="0"
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(e) => updateItem(i, { amount: e.target.value })}
                        className="text-right"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Odstrani postavko"
                      onClick={() =>
                        update({ items: draft.items.filter((_, j) => j !== i) })
                      }
                      className="flex-shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    update({ items: [...draft.items, { description: "", amount: "" }] })
                  }
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  + Dodaj postavko
                </button>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Za plačilo: <span className="font-semibold">{formatEUR(total)}</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Prekliči
              </Button>
              <Button type="button" onClick={handleDownload} disabled={!draft.number.trim()}>
                Prenesi PDF
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Odpre se okno za tisk – izberi »Shrani kot PDF«.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

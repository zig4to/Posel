"use client";

import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export type ItemFields = { amount: string; note: string };

export const EMPTY_ITEM: ItemFields = { amount: "", note: "" };

type ItemRowsProps = {
  items: ItemFields[];
  onChange: (items: ItemFields[]) => void;
  /** Predpona za id-je polj (npr. "cost", "extra"). */
  idPrefix: string;
  /** Ime postavke za oznake dostopnosti (npr. "stroška", "storitve"). */
  itemLabel: string;
  notePlaceholder?: string;
};

/** Seznam postavk znesek + opomba z gumboma za dodajanje/odstranjevanje. */
export default function ItemRows({
  items,
  onChange,
  idPrefix,
  itemLabel,
  notePlaceholder = "Opomba",
}: ItemRowsProps) {
  function update(index: number, patch: Partial<ItemFields>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-24 flex-shrink-0">
            <Input
              id={`${idPrefix}-amount-${index}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Znesek"
              aria-label={`Znesek ${itemLabel}`}
              value={item.amount}
              onChange={(e) => update(index, { amount: e.target.value })}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              id={`${idPrefix}-note-${index}`}
              placeholder={notePlaceholder}
              aria-label={`Opis ${itemLabel}`}
              value={item.note}
              onChange={(e) => update(index, { note: e.target.value })}
            />
          </div>
          {index === items.length - 1 ? (
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-9 flex-shrink-0 px-0"
              onClick={() => onChange([...items, EMPTY_ITEM])}
              aria-label={`Dodaj postavko ${itemLabel}`}
            >
              +
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 flex-shrink-0 px-0"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`Odstrani postavko ${itemLabel}`}
            >
              ×
            </Button>
          )}
        </div>
      ))}
    </>
  );
}

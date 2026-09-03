"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import MonthYearPicker from "@/components/calendar/MonthYearPicker";
import { setMonthlyTaxAction } from "@/actions/monthlyTaxes";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyTax } from "@/lib/data/monthlyTaxes";

function LandmarkIcon() {
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
      <path d="M12 3 3 8h18l-9-5Z" />
      <path d="M5 11v7M10 11v7M14 11v7M19 11v7M3 21h18" />
    </svg>
  );
}

export default function TaxObligationsButton() {
  const router = useRouter();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadAmount = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const existing = await getMonthlyTax(supabase, year, month + 1);
      setAmount(existing ? String(existing.amount) : "");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAmount();
  }, [open, loadAmount]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await setMonthlyTaxAction({
        year,
        month: month + 1,
        amount: Number(amount) || 0,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="warning"
        className="h-8"
        onClick={() => setOpen(true)}
        aria-label="Davčne obveznosti"
        title="Davčne obveznosti"
      >
        <LandmarkIcon />
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Davčne obveznosti">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mesec
            </label>
            <MonthYearPicker
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </div>

          <Field label="Skupen strošek za mesec (EUR)" htmlFor="tax-amount">
            <Input
              id="tax-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
          </Field>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Prekliči
            </Button>
            <Button type="button" disabled={pending || loading} onClick={handleSave}>
              {pending ? "Shranjujem …" : "Shrani"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

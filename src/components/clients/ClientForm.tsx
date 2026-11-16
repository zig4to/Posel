"use client";

import { useActionState, useState } from "react";
import type { Client } from "@/lib/types/database.types";
import type { ClientFormState } from "@/actions/clients";
import { Field, Input, Label } from "@/components/ui/Input";
import { CLIENT_COLOR_CHOICES } from "@/lib/utils/color";
import clsx from "@/lib/utils/clsx";
import Button from "@/components/ui/Button";

type ClientFormProps = {
  action: (
    prevState: ClientFormState,
    formData: FormData
  ) => Promise<ClientFormState>;
  initialValues?: Partial<Client>;
  submitLabel: string;
  /** Ime osebe za "Deli z …"; brez njega polja ni. */
  shareWithName?: string | null;
  /** Ali je stranka trenutno deljena. */
  initiallyShared?: boolean;
};

const initialState: ClientFormState = {};

/**
 * Izbira barve partnerja: gumb s trenutno barvo odpre nabor barv.
 * Brez izbire (nov partner) se barva dodeli samodejno.
 */
function ColorPicker({ initialColor }: { initialColor: string | null }) {
  const [color, setColor] = useState(initialColor);
  const [open, setOpen] = useState(false);
  const choices: string[] = [...CLIENT_COLOR_CHOICES];
  // Obstoječa barva, ki ni v naboru, ostane na voljo.
  if (initialColor && !choices.some((c) => c.toUpperCase() === initialColor.toUpperCase())) {
    choices.unshift(initialColor);
  }

  return (
    <div>
      <Label>Barva</Label>
      <input type="hidden" name="color" value={color ?? ""} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span
          className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20"
          style={{
            background: color ?? "repeating-linear-gradient(45deg,#D1D5DB 0 3px,transparent 3px 6px)",
          }}
          aria-hidden="true"
        />
        {color ? "Spremeni barvo" : "Samodejno – izberi barvo"}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Barva partnerja">
          {choices.map((c) => {
            const selected = color?.toUpperCase() === c.toUpperCase();
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c}
                title={c}
                onClick={() => {
                  setColor(c);
                  setOpen(false);
                }}
                className={clsx(
                  "h-8 w-8 rounded-full border border-black/10 transition-transform hover:scale-110 dark:border-white/20",
                  selected &&
                    "ring-2 ring-gray-900 ring-offset-2 ring-offset-white dark:ring-gray-100 dark:ring-offset-gray-900"
                )}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClientForm({
  action,
  initialValues,
  submitLabel,
  shareWithName,
  initiallyShared = false,
}: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Ime podjetja *" htmlFor="company_name">
        <Input
          id="company_name"
          name="company_name"
          required
          defaultValue={initialValues?.company_name ?? ""}
        />
      </Field>
      <Field label="Kontaktna oseba" htmlFor="contact_person">
        <Input
          id="contact_person"
          name="contact_person"
          defaultValue={initialValues?.contact_person ?? ""}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Telefon" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialValues?.phone ?? ""}
          />
        </Field>
        <Field label="E-pošta" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialValues?.email ?? ""}
          />
        </Field>
      </div>
      <Field label="Naslov" htmlFor="address">
        <Input
          id="address"
          name="address"
          defaultValue={initialValues?.address ?? ""}
        />
      </Field>
      <ColorPicker initialColor={initialValues?.color ?? null} />
      {shareWithName && (
        <div>
          {/* Oznaka, da je polje v obrazcu (neoznačen checkbox se ne pošlje). */}
          <input type="hidden" name="share_field" value="1" />
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              name="shared"
              defaultChecked={initiallyShared}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                Deli z {shareWithName}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {shareWithName} bo videl tega partnerja in vse njegove projekte (ure,
                stroške, priliv) – samo ogled, brez urejanja.
              </span>
            </span>
          </label>
        </div>
      )}
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Shranjujem …" : submitLabel}
      </Button>
    </form>
  );
}

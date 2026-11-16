"use client";

import { useActionState } from "react";
import type { Client } from "@/lib/types/database.types";
import type { ClientFormState } from "@/actions/clients";
import { Field, Input } from "@/components/ui/Input";
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

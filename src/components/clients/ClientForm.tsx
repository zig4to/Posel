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
};

const initialState: ClientFormState = {};

export default function ClientForm({
  action,
  initialValues,
  submitLabel,
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
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Shranjujem …" : submitLabel}
      </Button>
    </form>
  );
}

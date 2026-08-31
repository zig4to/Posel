"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/theme/ThemeToggle";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40">
        <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Prijava</h1>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Vpiši svoje podatke za dostop do aplikacije.
        </p>
        <form action={formAction} className="space-y-4">
          <Field label="E-pošta" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Geslo" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {state.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Prijavljanje …" : "Prijava"}
          </Button>
        </form>
      </div>
    </div>
  );
}

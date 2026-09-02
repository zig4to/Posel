"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "@/lib/utils/clsx";
import { logoutAction } from "@/actions/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";

const LINKS = [
  { href: "/", label: "Koledar" },
  { href: "/stranke", label: "Stranke" },
];

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function MainNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3">
        <nav className="flex min-w-0 flex-wrap items-center gap-1">
          {LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative flex-shrink-0" ref={rootRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Uporabniški meni"
            className={clsx(
              "flex items-center justify-center rounded-md border p-2",
              open
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            <UserIcon />
          </button>

          {open && (
            <div className="absolute right-0 z-20 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-md border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40">
              {userEmail && (
                <p
                  className="truncate px-2 py-2 text-sm font-medium text-gray-900 dark:text-gray-100"
                  title={userEmail}
                >
                  {userEmail}
                </p>
              )}
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <div className="flex justify-center px-2 py-2">
                <ThemeToggle />
              </div>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Odjava
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

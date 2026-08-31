"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "@/lib/utils/clsx";
import { logoutAction } from "@/actions/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";

const LINKS = [
  { href: "/", label: "Koledar" },
  { href: "/stranke", label: "Stranke" },
];

export default function MainNav() {
  const pathname = usePathname();

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
        <div className="flex flex-shrink-0 items-center gap-2">
          <ThemeToggle />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Odjava
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

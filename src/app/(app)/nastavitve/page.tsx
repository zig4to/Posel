import ThemeToggle from "@/components/theme/ThemeToggle";
import CalendarSnapshot from "@/components/settings/CalendarSnapshot";

export default function NastavitvePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nastavitve</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Tema</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Svetla, temna ali sistemska tema aplikacije.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
          Slika koledarja
        </p>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Prenesi sliko izbranega meseca — obarvana obroba pomeni dan z vnosom v
          koledarju, siva obroba pomeni prazen dan.
        </p>
        <CalendarSnapshot />
      </div>
    </div>
  );
}

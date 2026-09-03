import ThemeToggle from "@/components/theme/ThemeToggle";
import CalendarSnapshotCard from "@/components/settings/CalendarSnapshotCard";

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

      <CalendarSnapshotCard />
    </div>
  );
}

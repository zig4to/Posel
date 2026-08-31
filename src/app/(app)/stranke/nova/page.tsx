import ClientForm from "@/components/clients/ClientForm";
import { createClientAction } from "@/actions/clients";

export default function NovaStrankaPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Dodaj stranko
      </h1>
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <ClientForm action={createClientAction} submitLabel="Dodaj stranko" />
      </div>
    </div>
  );
}

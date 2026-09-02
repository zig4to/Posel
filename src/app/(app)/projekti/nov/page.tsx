import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import ProjectForm from "@/components/projects/ProjectForm";

export default async function NovProjektPage() {
  const supabase = await createClient();
  const clients = await getClients(supabase);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Nov projekt
      </h1>
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <ProjectForm clients={clients} />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/data/projects";
import { getClients } from "@/lib/data/clients";
import ProjectForm from "@/components/projects/ProjectForm";

export default async function UrediProjektPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let project;
  try {
    project = await getProjectById(supabase, id);
  } catch {
    notFound();
  }

  const clients = await getClients(supabase);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Uredi projekt
      </h1>
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <ProjectForm clients={clients} project={project} />
      </div>
    </div>
  );
}

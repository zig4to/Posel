import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import MonthCalendar from "@/components/calendar/MonthCalendar";

export default async function HomePage() {
  const supabase = await createClient();
  const clients = await getClients(supabase);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Koledar</h1>
      <MonthCalendar clients={clients} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import MonthCalendar from "@/components/calendar/MonthCalendar";

export default async function HomePage() {
  const supabase = await createClient();
  const clients = await getClients(supabase);

  return (
    <div>
      <MonthCalendar clients={clients} />
    </div>
  );
}

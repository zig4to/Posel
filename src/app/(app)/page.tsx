import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import { isReadOnlyViewer } from "@/lib/sharing";
import MonthCalendar from "@/components/calendar/MonthCalendar";

export default async function HomePage() {
  const supabase = await createClient();
  const [clients, readOnly] = await Promise.all([
    getClients(supabase),
    isReadOnlyViewer(supabase),
  ]);

  return (
    <div>
      <MonthCalendar clients={clients} readOnly={readOnly} />
    </div>
  );
}

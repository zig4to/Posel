import MainNav from "@/components/nav/MainNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <MainNav userEmail={user?.email ?? null} />
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-hidden px-4 py-6">
        {children}
      </main>
    </>
  );
}

import MainNav from "@/components/nav/MainNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainNav />
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-hidden px-4 py-6">
        {children}
      </main>
    </>
  );
}

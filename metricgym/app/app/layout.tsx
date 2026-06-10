import { TabBar } from "@/components/shell/tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-56">
      <TabBar />
      <main className="mx-auto w-full max-w-lg px-4 pb-28 md:max-w-3xl md:px-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}

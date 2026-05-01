import Sidebar from "@/components/layout/Sidebar";

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <Sidebar role="organiser" userName="Organiser" userEmail="organiser@portal" />
      <main className="main-content">{children}</main>
    </div>
  );
}

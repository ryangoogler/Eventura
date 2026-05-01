import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <Sidebar role="admin" userName="Administrator" userEmail="admin@portal" />
      <main className="main-content">{children}</main>
    </div>
  );
}

import Sidebar from "@/components/layout/Sidebar";

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-layout">
      <Sidebar role="participant" userName="Participant" userEmail="participant@portal" />
      <main className="main-content">{children}</main>
    </div>
  );
}

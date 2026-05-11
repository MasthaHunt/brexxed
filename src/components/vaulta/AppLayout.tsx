import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/vaulta/Sidebar";
import { Topbar } from "@/components/vaulta/Topbar";
import { MobileTabBar } from "@/components/vaulta/MobileTabBar";
import { PageTransition } from "@/components/vaulta/PageTransition";
import { useAppState } from "@/state/AppState";

export const AppLayout = () => {
  const { state } = useAppState();
  if (!state.authed) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
};

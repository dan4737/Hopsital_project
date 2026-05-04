import { useEffect, useRef } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { LoginPage } from "./pages/LoginPage";
import { SchedulePage } from "./pages/SchedulePage";
import { ClerkFullPage } from "./pages/ClerkFullPage";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const currentWorker = useQuery(api.workers.getByUserId);
  const linkToClerk = useMutation(api.linkUser.linkToClerk);
  const autoLinked = useRef(false);

  useEffect(() => {
    if (autoLinked.current) return;
    if (currentWorker !== undefined && currentWorker === null) {
      const loginRole = sessionStorage.getItem("loginRole");
      if (loginRole === "clerk") {
        autoLinked.current = true;
        linkToClerk().then(() => {
          sessionStorage.removeItem("loginRole");
        }).catch(() => {
          sessionStorage.removeItem("loginRole");
        });
      }
    }
  }, [currentWorker, linkToClerk]);

  if (currentWorker === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (currentWorker?.isClerk) {
    return <ClerkFullPage />;
  }

  return <SchedulePage />;
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SearchProvider } from "@/contexts/SearchContext";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import Dashboard from "@/pages/dashboard";
import CraneMap from "@/pages/crane-map";
import FailureHistory from "@/pages/failure-history";
import MaintenanceHistory from "@/pages/maintenance-history";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/crane-map" component={CraneMap} />
              <Route path="/failure-history" component={FailureHistory} />
              <Route path="/maintenance-history" component={MaintenanceHistory} />
              <Route path="/maintenance-history/:craneId" component={MaintenanceHistory} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SearchProvider>
          <Toaster />
          <Router />
        </SearchProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

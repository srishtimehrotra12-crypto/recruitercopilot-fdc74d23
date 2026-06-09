import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Screening from "./pages/Index";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/screening" element={<Screening />} />
              <Route
                path="/jobs"
                element={<ComingSoon title="Jobs" description="Create and manage job openings." />}
              />
              <Route
                path="/pipeline"
                element={<ComingSoon title="ATS Pipeline" description="Kanban board to track candidates through every stage." />}
              />
              <Route
                path="/talent"
                element={<ComingSoon title="Talent Database" description="Search and filter every candidate you've ever sourced." />}
              />
              <Route
                path="/sourcing"
                element={<ComingSoon title="Sourcing" description="Import profiles and build boolean searches." />}
              />
              <Route
                path="/analytics"
                element={<ComingSoon title="Analytics" description="Funnel metrics, time-to-hire, and source effectiveness." />}
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

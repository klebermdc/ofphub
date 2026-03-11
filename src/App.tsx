import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SheetDataProvider } from "@/contexts/SheetDataContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SalespersonDashboard from "./pages/SalespersonDashboard";
import MarketingDashboard from "./pages/MarketingDashboard";
import AllOrders from "./pages/AllOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SheetDataProvider>
        <ThemeProvider defaultTheme="dark" storageKey="ofp-ui-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/vendedor" element={<SalespersonDashboard />} />
                <Route path="/vendedor/:salespersonName" element={<SalespersonDashboard />} />
                <Route path="/marketing" element={<MarketingDashboard />} />
                <Route path="/pedidos" element={<AllOrders />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </SheetDataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

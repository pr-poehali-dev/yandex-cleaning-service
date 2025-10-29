
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import Index from "./pages/Index";
import Wordstat from "./pages/Wordstat";
import WordstatNew from "./pages/WordstatNew";
import TestClustering from "./pages/TestClustering";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/wordstat" element={<ProtectedRoute><WordstatNew /></ProtectedRoute>} />
          <Route path="/wordstat-old" element={<ProtectedRoute><Wordstat /></ProtectedRoute>} />
          <Route path="/test" element={<ProtectedRoute><TestClustering /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
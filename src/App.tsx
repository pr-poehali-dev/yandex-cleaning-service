
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import Projects from "./pages/Projects";
import ClusteringProjects from "./pages/ClusteringProjects";
import RSYAProjects from "./pages/RSYAProjects";
import RSYACleaner from "./pages/RSYACleaner";
import RSYASettings from "./pages/RSYASettings";
import RSYASetup from "./pages/RSYASetup";
import Index from "./pages/Index";
import Wordstat from "./pages/Wordstat";
import WordstatNew from "./pages/WordstatNew";
import TestClustering from "./pages/TestClustering";
import HowToUse from "./pages/HowToUse";
import Subscription from "./pages/Subscription";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./components/Home";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/clustering" element={<ProtectedRoute><ClusteringProjects /></ProtectedRoute>} />
          <Route path="/clustering/:id" element={<ProtectedRoute><TestClustering /></ProtectedRoute>} />
          <Route path="/rsya" element={<ProtectedRoute><RSYAProjects /></ProtectedRoute>} />
          <Route path="/rsya/:id/setup" element={<ProtectedRoute><RSYASetup /></ProtectedRoute>} />
          <Route path="/rsya/:id" element={<ProtectedRoute><RSYACleaner /></ProtectedRoute>} />
          <Route path="/rsya/:id/settings" element={<ProtectedRoute><RSYASettings /></ProtectedRoute>} />
          <Route path="/wordstat" element={<ProtectedRoute><WordstatNew /></ProtectedRoute>} />
          <Route path="/wordstat-old" element={<ProtectedRoute><Wordstat /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
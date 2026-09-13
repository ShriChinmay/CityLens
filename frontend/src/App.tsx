// frontend/src/App.tsx

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import EventsListPage from "./pages/EventsListPage";
import EventDetailPage from "./pages/EventDetailPage";
import IncidentsListPage from "./pages/IncidentsListPage";
import IncidentDetailPage from "./pages/IncidentDetailPage";
import TrafficAnalyticsPage from "./pages/TrafficAnalyticsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Authenticated */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/events" element={<EventsListPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/incidents" element={<IncidentsListPage />} />
              <Route
                path="/incidents/:incidentId"
                element={<IncidentDetailPage />}
              />
              <Route path="/analytics" element={<TrafficAnalyticsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

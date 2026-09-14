import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/AppShell';
import Overview from './pages/Overview';
import RoadIssues from './pages/RoadIssues';
import RoadIssueDetail from './pages/RoadIssueDetail';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Cameras from './pages/Cameras';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/events" element={<RoadIssues />} />
            <Route path="/events/:id" element={<RoadIssueDetail />} />
            <Route path="/buses" element={<Vehicles />} />
            <Route path="/buses/:id" element={<VehicleDetail />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { setupDebugger } from './utils/debug';
import { setupSessionMonitoring, touchSession } from './utils/sessionMonitor';
import Navbar from './components/Layout/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Send from './pages/Send';
import Sign from './pages/Sign';
import AgreementDetails from './pages/AgreementDetails';
import Callback from './pages/Callback';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import Drafts from './pages/Drafts';
import Index from './pages/Index';

// Create a wrapper component to conditionally render the Navbar
const AppContent = () => {
  const location = useLocation();
  
  // Don't show navbar on the Index page
  const isIndexPage = location.pathname === '/';
  
  // Initialize debugger on app start
  useEffect(() => {
    setupDebugger();
    // Set up session monitoring
    const cleanupMonitoring = setupSessionMonitoring();
    // Add a periodic health check to ensure session persists
    const healthCheckInterval = setInterval(() => {
      // Touch the session to keep it active
      touchSession();
      // Check if we have basic session information
      const hasSession = localStorage.getItem('zklogin-jwt') && 
                         localStorage.getItem('ephemeralSeed') && 
                         localStorage.getItem('user');
      // If we're in development mode, log session health
      if (import.meta.env.DEV) {
        // console.log(`Session health check: ${hasSession ? 'Healthy' : 'Unhealthy'}`);
      }
      // Keep alive - just accessing localStorage helps ensure the session state stays in memory
      if (hasSession) {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user?.address) {
            // This just reads the address but keeps the session active
            // Use address in a void operation to avoid unused variable warning
            void user.address;
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }, 60000); // Check every minute
    return () => {
      clearInterval(healthCheckInterval);
      cleanupMonitoring();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Navbar if not on the index page */}
      {!isIndexPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/send" 
            element={
              <ProtectedRoute>
                <Send />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sign/:id" 
            element={
              <ProtectedRoute>
                <Sign />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agreement/:id" 
            element={
              <ProtectedRoute>
                <AgreementDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/drafts" 
            element={
              <ProtectedRoute>
                <Drafts />
              </ProtectedRoute>
            } 
          /> */}
          {/* Catch-all route - redirect any unmatched routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
}

export default App;
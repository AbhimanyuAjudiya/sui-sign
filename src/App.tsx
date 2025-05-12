<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import HomePage from './pages/HomePage';
import { SuiClientProvider } from './context/SuiClientProvider'; // We'll create this
import { AccountProvider } from './context/AccountProvider'; // We'll create this
import ProtectedRoute from './components/ProtectedRoute';

const App = () => (
  <SuiClientProvider>
    <AccountProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AccountProvider>
  </SuiClientProvider>
);
=======
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
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
        console.log(`Session health check: ${hasSession ? 'Healthy' : 'Unhealthy'}`);
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
    <UserProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />
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
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </UserProvider>
  );
}
>>>>>>> ef9de5f (added most of the frontend part)

export default App;
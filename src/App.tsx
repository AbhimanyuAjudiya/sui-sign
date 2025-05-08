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

export default App;
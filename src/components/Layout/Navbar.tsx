import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileSignature, Home, LogOut, User } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { motion } from 'framer-motion';
import AddressDisplay from '../common/AddressDisplay';
import Avatar from '../ui/Avatar';

const Navbar: React.FC = () => {
  const { user, logout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user?.isAuthenticated) {
    return null; // Don't show navbar if not authenticated
  }

  // Get session status from localStorage to display an indicator
  const hasValidSession = 
    !!localStorage.getItem('user') &&
    !!localStorage.getItem('zklogin-jwt') &&
    !!localStorage.getItem('ephemeralSeed');

  return (
    <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and App Name */}
          <Link to="/dashboard" className="flex items-center">
            <FileSignature className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">SuiSign</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8">
            <NavLink to="/dashboard" active={location.pathname === '/dashboard'}>
              Dashboard
            </NavLink>
            <NavLink to="/drafts" active={location.pathname === '/drafts'}>
              Drafts
            </NavLink>
            <NavLink to="/send" active={location.pathname === '/send'}>
              Send
            </NavLink>
            <NavLink to="/profile" active={location.pathname === '/profile'}>
              Profile
            </NavLink>
          </nav>

          {/* User Profile/Logout */}
          <div className="flex items-center">
            {/* Session indicator */}
            <div className="mr-3 flex items-center">
              <div 
                className={`w-2 h-2 rounded-full mr-1 ${hasValidSession ? 'bg-green-500' : 'bg-yellow-500'}`} 
                title={hasValidSession ? 'Session active' : 'Session may expire on refresh'}
              ></div>
              <span className="text-xs text-gray-500">
                {hasValidSession ? 'Connected' : 'Limited connection'}
              </span>
            </div>
            
            <Link to="/profile" className="flex items-center mr-4">
              <Avatar
                src={user.profilePic}
                alt={`Profile picture for ${user.email || 'user'}`}
                size="sm"
                className="mr-2"
              />
              {user.address && (
                <AddressDisplay 
                  address={user.address} 
                  className="hidden md:flex"
                />
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex justify-around">
          <MobileNavLink 
            to="/dashboard" 
            active={location.pathname === '/dashboard'}
            icon={<Home size={20} />} 
            label="Home"
          />
          <MobileNavLink 
            to="/drafts" 
            active={location.pathname === '/drafts'}
            icon={<FileSignature size={20} />} 
            label="Drafts"
          />
          <MobileNavLink 
            to="/send" 
            active={location.pathname === '/send'}
            icon={<FileSignature size={20} />} 
            label="Send"
          />
          <MobileNavLink 
            to="/profile" 
            active={location.pathname === '/profile'}
            icon={<User size={20} />} 
            label="Profile"
          />
        </div>
      </div>
    </header>
  );
};

interface NavLinkProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, active, children }) => {
  return (
    <Link
      to={to}
      className={`relative px-3 py-2 text-sm font-medium ${
        active ? 'text-primary-600' : 'text-gray-700 hover:text-primary-500'
      }`}
    >
      {children}
      {active && (
        <motion.div
          layoutId="navbar-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );
};

interface MobileNavLinkProps {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, active, icon, label }) => {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center py-2 ${
        active ? 'text-primary-600' : 'text-gray-500'
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );
};

export default Navbar;
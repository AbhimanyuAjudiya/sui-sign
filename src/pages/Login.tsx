import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import ZkLoginButton from '../components/zkLogin/ZkLoginButton';
import { useUser } from '../context/UserContext';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const { isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full"
      >
        <div className="px-8 pt-8 pb-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-primary-50 rounded-full mb-4">
              <FileSignature className="h-10 w-10 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to SuiSign</h1>
            <p className="text-gray-600">Secure document signing on the Sui blockchain</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <ZkLoginButton isLoading={isLoading} />
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-600">
          <p>Powered by Sui blockchain technology</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
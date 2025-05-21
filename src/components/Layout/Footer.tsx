import React from 'react';
import Container from '../ui/Container';
import { FileSignature, Twitter, Github, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-900 text-white py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileSignature size={24} className="text-primary-500" />
              <span className="text-xl font-bold">SuiSign</span>
            </div>
            <p className="text-neutral-400 mb-4">
              Decentralized document signing for the Web3 era.
            </p>
            <div className="flex space-x-4">
              <a href="https://x.com/abhiii_aj/" target='_blank' className="text-neutral-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="https://github.com/AbhimanyuAjudiya/sui-sign" target='_blank' className="text-neutral-400 hover:text-white">
                <Github size={20} />
              </a>
              <a href="https://www.linkedin.com/in/abhimanyu-ajudiya/"target='_blank'  className="text-neutral-400 hover:text-white">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-neutral-400 hover:text-white">Features</a></li>
              <li><a href="#how-it-works" className="text-neutral-400 hover:text-white">How It Works</a></li>
              <li><a href="#benefits" className="text-neutral-400 hover:text-white">Benefits</a></li>
              <li><a href="#testimonials" className="text-neutral-400 hover:text-white">Testimonials</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-neutral-400 hover:text-white">Documentation</a></li>
              <li><a href="#" className="text-neutral-400 hover:text-white">API Reference</a></li>
              <li><a href="#" className="text-neutral-400 hover:text-white">Status</a></li>
              <li><a href="#faq" className="text-neutral-400 hover:text-white">FAQ</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-neutral-400 hover:text-white">About</a></li>
              <li><a href="#" className="text-neutral-400 hover:text-white">Blog</a></li>
              <li><a href="#" className="text-neutral-400 hover:text-white">Careers</a></li>
              <li><a href="#" className="text-neutral-400 hover:text-white">Contact</a></li>
            </ul>
          </div> */}
        </div>
        
        <div className="mt-12 pt-8 border-t border-neutral-800 text-neutral-400 text-sm">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2025 SuiSign. All rights reserved.</p>
            {/* <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookie Policy</a>
            </div> */}
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
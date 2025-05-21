import React, { useState, useEffect } from 'react';
import { FileSignature, Menu, X } from 'lucide-react';
import Container from '../ui/Container';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth',
      });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header 
      className={`z-50 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center text-primary-500 mr-2">
              <FileSignature size={28} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              SuiSign
            </h1>
          </div>
          
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <button 
                  onClick={() => scrollToSection('features')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('benefits')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors"
                >
                  Benefits
                </button>
              </li>
              {/* <li>
                <button 
                  onClick={() => scrollToSection('testimonials')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors"
                >
                  Testimonials
                </button>
              </li> */}
              <li>
                <button 
                  onClick={() => scrollToSection('faq')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors"
                >
                  FAQ
                </button>
              </li>
            </ul>
          </nav>
{/*           
          <div className="hidden md:block">
            <Button variant="primary">Start Signing Securely</Button>
          </div>
           */}
          <button 
            className="md:hidden text-neutral-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </Container>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg animate-slide-down">
          <Container>
            <ul className="py-4 space-y-3">
              <li>
                <button 
                  onClick={() => scrollToSection('features')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors block w-full text-left py-2"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors block w-full text-left py-2"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('benefits')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors block w-full text-left py-2"
                >
                  Benefits
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('testimonials')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors block w-full text-left py-2"
                >
                  Testimonials
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('faq')}
                  className="text-neutral-700 hover:text-primary-500 transition-colors block w-full text-left py-2"
                >
                  FAQ
                </button>
              </li>
              {/* <li className="pt-2">
                <Button variant="primary" className="w-full">
                  Start Signing Securely
                </Button>
              </li> */}
            </ul>
          </Container>
        </div>
      )}
    </header>
  );
};

export default Header;
import React from 'react';
import Section from '../ui/Section';
import Button from '../ui/LButton';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
  return (
    <Section className="pt-32 pb-16 bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <ShieldCheck className="w-12 h-12 text-primary-500" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-serif">
            Trustless Document Signing
            <span className="text-primary-500"> for the Web3 Era</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 mb-8 max-w-3xl mx-auto">
            Secure your agreements on the Sui blockchain with immutable storage powered by Walrus. 
            Enterprise-grade document signing without centralized intermediaries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg">Start Signing Securely</Button>
            </Link>
            <Link to="https://www.youtube.com/watch?v=hLP0cuYyHx8" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg">Watch Demo</Button>
            </Link>
          </div>
          <div className="mt-12 flex justify-center space-x-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-500">100%</div>
              <div className="text-sm text-neutral-600">Decentralized</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-500">24/7</div>
              <div className="text-sm text-neutral-600">Availability</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-500">0%</div>
              <div className="text-sm text-neutral-600">Data Loss</div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default Hero;
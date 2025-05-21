import React from 'react';
import Section from '../ui/Section';
import { Shield, Clock, Lock, Coins } from 'lucide-react';

const Benefits: React.FC = () => {
  return (
    <Section id="benefits" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-serif">
            Why Choose SuiSign?
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Experience the future of document signing with unmatched security and efficiency.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex gap-4">
            <Shield className="w-8 h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                Military-Grade Security
              </h3>
              <p className="text-neutral-600">
                Leverage blockchain cryptography and decentralized storage for unmatched document security and authenticity verification.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Clock className="w-8 h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                Lightning Fast Processing
              </h3>
              <p className="text-neutral-600">
                Get your documents signed and verified in minutes, not days. Instant confirmation on the Sui blockchain.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Lock className="w-8 h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                Complete Privacy
              </h3>
              <p className="text-neutral-600">
                Your documents are encrypted and stored across a decentralized network, ensuring complete privacy and data sovereignty.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Coins className="w-8 h-8 text-primary-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                Cost-Effective
              </h3>
              <p className="text-neutral-600">
                Pay only for what you use with our transparent gas fee model. No monthly subscriptions or hidden costs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default Benefits;
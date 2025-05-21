import React from 'react';
import Section from '../ui/Section';
import { features } from '../../data/features';

const Features: React.FC = () => {
  return (
    <Section id="features" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-serif">
            Enterprise Features, Web3 Security
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Combine the best of traditional document signing with the security and transparency of blockchain technology.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 bg-neutral-50 rounded-xl hover:shadow-lg transition-shadow duration-300"
            >
              <feature.icon className="w-10 h-10 text-primary-500 mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-neutral-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Features;
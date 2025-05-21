import React from 'react';
import Section from '../ui/Section';
import { steps } from '../../data/steps';

const HowItWorks: React.FC = () => {
  return (
    <Section id="how-it-works" className="bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-serif">
            Simple Process, Powerful Security
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Get your documents signed with blockchain-grade security in just four simple steps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-primary-200" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                {step.title}
              </h3>
              <p className="text-neutral-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default HowItWorks;
import React from 'react';
import Section from '../ui/Section';
import { testimonials } from '../../data/testimonials';
import { Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
  return (
    <Section id="testimonials" className="bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-serif">
            Trusted by Industry Leaders
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            See what our clients say about their experience with SuiSign.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <Quote className="w-8 h-8 text-primary-500 mb-4" />
              <p className="text-lg text-neutral-700 mb-6 italic">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="font-semibold text-neutral-900">{testimonial.author}</p>
                <p className="text-neutral-600">{testimonial.role}</p>
                <p className="text-primary-500">{testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Testimonials;
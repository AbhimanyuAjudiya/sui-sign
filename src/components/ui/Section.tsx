import React from 'react';
import Container from './Container';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  fullWidth?: boolean;
}

const Section: React.FC<SectionProps> = ({ 
  children, 
  className = '',
  id,
  fullWidth = false
}) => {
  return (
    <section id={id} className={`py-16 md:py-24 ${className}`}>
      {fullWidth ? children : <Container>{children}</Container>}
    </section>
  );
};

export default Section;
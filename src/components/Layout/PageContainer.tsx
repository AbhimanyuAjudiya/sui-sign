import React from 'react';
import { motion } from 'framer-motion';

interface PageContainerProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ title, children, actions }) => {
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <motion.div
      className="container mx-auto px-4 pt-20 pb-8 md:pt-24 md:pb-12"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{title}</h1>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </motion.div>
  );
};

export default PageContainer;
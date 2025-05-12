import React from 'react';

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
        isActive
          ? 'bg-white text-primary-600 border-b-2 border-primary-600'
          : 'text-gray-500 hover:text-gray-700 border-b border-gray-200'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Tab;

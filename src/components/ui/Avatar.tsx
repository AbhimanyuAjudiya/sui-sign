import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = "User avatar", 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12', 
    lg: 'h-24 w-24'
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 48
  };

  // Generate a consistent avatar based on user identifier
  const generateDefaultAvatar = () => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    
    // Use a simple hash of the alt text to pick a color
    const hash = alt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorClass = colors[hash % colors.length];
    
    return (
      <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white ${className}`}>
        <User size={iconSizes[size]} />
      </div>
    );
  };

  if (!src) {
    return generateDefaultAvatar();
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full border-2 border-primary-600 object-cover ${className}`}
      onError={(e) => {
        // Replace with default avatar if image fails to load
        const target = e.target as HTMLImageElement;
        const parent = target.parentNode;
        if (parent) {
          target.style.display = 'none';
          // Create a safe fallback div instead of using innerHTML
          const fallbackDiv = document.createElement('div');
          fallbackDiv.className = `${sizeClasses[size]} bg-gray-500 rounded-full flex items-center justify-center text-white ${className}`;
          
          // Create SVG element safely
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', iconSizes[size].toString());
          svg.setAttribute('height', iconSizes[size].toString());
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
          svg.setAttribute('stroke-width', '2');
          svg.setAttribute('stroke-linecap', 'round');
          svg.setAttribute('stroke-linejoin', 'round');
          
          const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path1.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '12');
          circle.setAttribute('cy', '7');
          circle.setAttribute('r', '4');
          
          svg.appendChild(path1);
          svg.appendChild(circle);
          fallbackDiv.appendChild(svg);
          parent.appendChild(fallbackDiv);
        }
      }}
    />
  );
};

export default Avatar;

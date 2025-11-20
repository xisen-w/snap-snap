
import React, { useState } from 'react';
import { PhotoData } from '../types';

interface PhotoProps {
  data: PhotoData;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

export const Photo: React.FC<PhotoProps> = ({ data, onUpdatePosition, onDelete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        onUpdatePosition(data.id, newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, data.id, onUpdatePosition]);

  return (
    <div 
      className="absolute p-3 pb-10 shadow-lg cursor-grab active:cursor-grabbing hover:scale-105 transition-transform duration-200 ease-out group"
      style={{
        left: data.x,
        top: data.y,
        backgroundColor: data.borderColor || '#fff',
        transform: `rotate(${data.rotation}deg) scale(${isDragging ? 1.05 : 1})`,
        zIndex: isDragging ? 100 : 1,
        width: '240px',
        height: '290px',
      }}
      onMouseDown={handleMouseDown}
    >
       {/* Delete Button */}
       <button 
         onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
         className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
       >
         &times;
       </button>

       <div className="w-full h-[216px] bg-gray-900 overflow-hidden relative">
          <img 
            src={data.url} 
            alt="Polaroid" 
            className="w-full h-full object-cover select-none pointer-events-none"
            style={{
              animation: (Date.now() - data.timestamp) < 5000 ? 'develop 5s ease-in-out forwards' : 'none',
              animationDelay: `-${Date.now() - data.timestamp}ms`
            }}
            draggable={false}
          />
          {/* Glossy overlay/Texture */}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] pointer-events-none bg-gradient-to-tr from-transparent to-white/10"></div>
       </div>
       
       <div className="mt-4 text-center pointer-events-none select-none">
          <p className="font-hand text-gray-600 text-sm rotate-[-1deg] opacity-80">
             {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}
          </p>
       </div>
    </div>
  );
};

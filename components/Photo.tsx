
import React, { useState, useRef, useEffect } from 'react';
import { PhotoData } from '../types';
import { RotateCw, Maximize2, X } from 'lucide-react';

interface PhotoProps {
  data: PhotoData;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateTransform: (id: string, rotation: number, scale: number) => void;
  onDelete: (id: string) => void;
}

export const Photo: React.FC<PhotoProps> = ({ 
  data, 
  isSelected, 
  onSelect, 
  onUpdatePosition, 
  onUpdateTransform,
  onDelete 
}) => {
  const [interactionMode, setInteractionMode] = useState<'none' | 'drag' | 'rotate' | 'resize'>('none');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Helper to stop propagation so clicking photo doesn't trigger background deselect
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Critical: Prevent App from deselecting
    e.preventDefault();
    onSelect();
    setInteractionMode('drag');
    
    setDragOffset({
      x: e.clientX - data.x,
      y: e.clientY - data.y
    });
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInteractionMode('rotate');
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInteractionMode('resize');
  };

  useEffect(() => {
    if (interactionMode === 'none') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (interactionMode === 'drag') {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        onUpdatePosition(data.id, newX, newY);
      } 
      else if (interactionMode === 'rotate' && containerRef.current) {
        // Calculate angle between center of photo and mouse
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        
        // atan2 returns radians, convert to degrees
        // Add 90 degrees because standard 0 is 3 o'clock, but we want 12 o'clock to be "up"
        const angleDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
        onUpdateTransform(data.id, angleDeg, data.scale);
      }
      else if (interactionMode === 'resize' && containerRef.current) {
         // Calculate distance from center to mouse to determine scale
         const rect = containerRef.current.getBoundingClientRect();
         const centerX = rect.left + rect.width / 2;
         const centerY = rect.top + rect.height / 2;
         
         const deltaX = e.clientX - centerX;
         const deltaY = e.clientY - centerY;
         
         // Distance from center
         const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
         
         // Base size diagonal is approx sqrt(240^2 + 290^2) / 2 ~= 190
         // Let's say 150px distance is scale 1
         const newScale = Math.max(0.3, Math.min(3, dist / 150));
         
         onUpdateTransform(data.id, data.rotation, newScale);
      }
    };

    const handleMouseUp = () => {
      setInteractionMode('none');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interactionMode, dragOffset, data, onUpdatePosition, onUpdateTransform]);

  return (
    <div 
      ref={containerRef}
      className={`absolute cursor-grab group select-none ${interactionMode === 'drag' ? 'cursor-grabbing' : ''}`}
      style={{
        left: data.x,
        top: data.y,
        width: '240px',
        height: '290px',
        transform: `rotate(${data.rotation}deg) scale(${data.scale})`,
        transformOrigin: 'center center',
        zIndex: isSelected ? 50 : 1, // Bring to front when selected
      }}
      onMouseDown={handleMouseDown}
    >
       {/* Frame content */}
       <div 
         className="w-full h-full p-3 pb-10 shadow-xl transition-shadow"
         style={{ 
            backgroundColor: data.borderColor || '#fff',
            boxShadow: isSelected ? '0 20px 40px rgba(0,0,0,0.25)' : '0 4px 6px rgba(0,0,0,0.1)'
         }}
       >
         <div className="w-full h-[216px] bg-gray-900 overflow-hidden relative">
            <img 
              src={data.url} 
              alt="Polaroid" 
              className="w-full h-full object-cover pointer-events-none"
              style={{
                animation: (Date.now() - data.timestamp) < 5000 ? 'develop 5s ease-in-out forwards' : 'none',
                animationDelay: `-${Date.now() - data.timestamp}ms`
              }}
              draggable={false}
            />
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] pointer-events-none bg-gradient-to-tr from-transparent to-white/10"></div>
         </div>
         
         <div className="mt-4 text-center pointer-events-none">
            <p className="font-hand text-gray-600 text-sm rotate-[-1deg] opacity-80">
               {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'})}
            </p>
         </div>
       </div>

       {/* Selection UI Overlays */}
       {isSelected && (
         <>
            {/* Border Highlight */}
            <div className="absolute -inset-2 border-2 border-blue-400/50 rounded-lg pointer-events-none"></div>
            
            {/* Delete Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
              className="absolute -top-4 -left-4 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md hover:bg-red-600 z-20 cursor-pointer hover:scale-110 transition-transform"
              title="Delete"
            >
              <X size={14} />
            </button>

            {/* Rotate Handle (Top Center) */}
            <div 
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-white text-gray-700 rounded-full shadow-lg flex items-center justify-center cursor-move z-20 hover:bg-blue-50 border border-gray-200"
              onMouseDown={handleRotateStart}
              title="Rotate"
            >
              <div className="h-4 w-[1px] bg-blue-400 absolute -bottom-4 left-1/2 pointer-events-none"></div>
              <RotateCw size={16} />
            </div>

            {/* Resize Handle (Bottom Right) */}
            <div 
              className="absolute -bottom-4 -right-4 w-8 h-8 bg-white text-gray-700 rounded-full shadow-lg flex items-center justify-center cursor-nwse-resize z-20 hover:bg-blue-50 border border-gray-200"
              onMouseDown={handleResizeStart}
              title="Resize"
            >
              <Maximize2 size={16} />
            </div>
         </>
       )}
    </div>
  );
};

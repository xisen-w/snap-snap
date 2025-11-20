import React, { useState, useRef, useEffect } from 'react';
import { PhotoData } from '../types';
import { RotateCw, Maximize2, Trash2, Download } from 'lucide-react';

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
  
  // Uses Pointer Events to support both Mouse and Touch
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); 
    // e.preventDefault(); // Allowing default can be useful for focus, but touch-action: none handles scroll blocking
    onSelect();
    setInteractionMode('drag');
    
    setDragOffset({
      x: e.clientX - data.x,
      y: e.clientY - data.y
    });
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInteractionMode('rotate');
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInteractionMode('resize');
  };

  const savePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600; 
    const height = 725; 
    
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = data.borderColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = data.url;
    img.onload = () => {
      const padding = width * 0.05; 
      const photoSize = width - (padding * 2);
      const topPadding = padding;
      
      ctx.drawImage(img, padding, topPadding, photoSize, photoSize);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(0,0,0,0.05)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(padding, topPadding, photoSize, photoSize);

      const date = new Date(data.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'});
      
      ctx.font = '30px "Permanent Marker", cursive'; 
      ctx.fillStyle = '#4b5563'; 
      ctx.textAlign = 'center';
      
      ctx.save();
      ctx.translate(width / 2, height - 50);
      ctx.rotate(-1 * Math.PI / 180);
      ctx.fillText(timeStr, 0, 0);
      ctx.restore();

      const link = document.createElement('a');
      link.download = `pulsesnap-${data.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    };
  };

  useEffect(() => {
    if (interactionMode === 'none') return;

    const handlePointerMove = (e: PointerEvent) => {
      // Prevent default actions like scrolling if necessary, though touch-action: none handles most
      e.preventDefault();

      if (interactionMode === 'drag') {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        onUpdatePosition(data.id, newX, newY);
      } 
      else if (interactionMode === 'rotate' && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        
        const angleDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
        onUpdateTransform(data.id, angleDeg, data.scale);
      }
      else if (interactionMode === 'resize' && containerRef.current) {
         const rect = containerRef.current.getBoundingClientRect();
         const centerX = rect.left + rect.width / 2;
         const centerY = rect.top + rect.height / 2;
         
         const deltaX = e.clientX - centerX;
         const deltaY = e.clientY - centerY;
         
         const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
         const newScale = Math.max(0.3, Math.min(3, dist / 150));
         
         onUpdateTransform(data.id, data.rotation, newScale);
      }
    };

    const handlePointerUp = () => {
      setInteractionMode('none');
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
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
        zIndex: isSelected ? 50 : 1, 
        touchAction: 'none', // CRITICAL: Disables browser touch gestures (scrolling) on this element
      }}
      onPointerDown={handlePointerDown}
    >
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

       {isSelected && (
         <>
            <div className="absolute -inset-2 border-2 border-blue-400/40 rounded-lg pointer-events-none"></div>
            
            <div className="absolute -top-12 right-0 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm border border-gray-200/60 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
               <button 
                  onClick={savePhoto}
                  className="p-1.5 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-full transition-colors"
                  title="Save Photo"
                  // Touch friendly buttons
                  style={{ touchAction: 'manipulation' }}
               >
                  <Download size={16} />
               </button>
               <div className="w-[1px] h-4 bg-gray-300"></div>
               <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
                  className="p-1.5 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full transition-colors"
                  title="Delete Photo"
                  style={{ touchAction: 'manipulation' }}
               >
                  <Trash2 size={16} />
               </button>
            </div>

            {/* Rotate Handle */}
            <div 
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-white text-gray-700 rounded-full shadow-sm border border-gray-200 flex items-center justify-center cursor-move z-20 hover:bg-blue-50 transition-colors"
              onPointerDown={handleRotateStart}
              title="Rotate"
              style={{ touchAction: 'none' }}
            >
              <div className="h-4 w-[1px] bg-blue-400 absolute -bottom-4 left-1/2 pointer-events-none opacity-50"></div>
              <RotateCw size={14} />
            </div>

            {/* Resize Handle */}
            <div 
              className="absolute -bottom-3 -right-3 w-7 h-7 bg-white text-gray-700 rounded-full shadow-sm border border-gray-200 flex items-center justify-center cursor-nwse-resize z-20 hover:bg-blue-50 transition-colors"
              onPointerDown={handleResizeStart}
              title="Resize"
              style={{ touchAction: 'none' }}
            >
              <Maximize2 size={12} />
            </div>
         </>
       )}
    </div>
  );
};

import React, { useState } from 'react';
import { PolaroidCamera } from './components/PolaroidCamera';
import { Photo } from './components/Photo';
import { PhotoData } from './types';
import { v4 as uuidv4 } from 'uuid';

const PASTEL_COLORS = [
  '#ffffff', // Classic White
  '#ffffff', // Classic White (Weighted higher)
  '#fff0f5', // Lavender Blush
  '#f0f8ff', // Alice Blue
  '#f5f5dc', // Beige
  '#faf0e6', // Linen
  '#e6e6fa', // Lavender
  '#ffe4e1', // Misty Rose
  '#f0fff0', // Honeydew
  '#fffacd', // Lemon Chiffon
];

export default function App() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [currentPrint, setCurrentPrint] = useState<{ url: string; timestamp: number; borderColor: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  
  // When the camera takes a picture
  const handleCapture = (imageUrl: string) => {
    const randomColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
    
    setIsPrinting(true);
    setCurrentPrint({
      url: imageUrl,
      timestamp: Date.now(),
      borderColor: randomColor
    });

    // If user doesn't grab it, reset printing state after animation but keep photo in slot
    setTimeout(() => {
       setIsPrinting(false); 
    }, 1500); // Matches CSS animation duration
  };

  // Logic to move photo from Camera slot to the Wall
  const handleDragFromCamera = (e: React.MouseEvent) => {
    if (!currentPrint) return;

    const startX = e.clientX;
    const startY = e.clientY;
    
    const newId = uuidv4();
    // Random slight rotation for realism
    const randomRotation = (Math.random() * 10) - 5; 

    // Position close to where the mouse picked it up relative to the viewport
    // Adjust offsets to center the card on cursor (Card is ~240px wide)
    const initialX = startX - 120;
    const initialY = startY - 50; 

    const newPhoto: PhotoData = {
      id: newId,
      url: currentPrint.url,
      timestamp: currentPrint.timestamp,
      x: initialX,
      y: initialY,
      rotation: randomRotation,
      scale: 1,
      isDeveloping: true,
      borderColor: currentPrint.borderColor
    };

    // Add to wall
    setPhotos((prev) => [...prev, newPhoto]);
    setSelectedPhotoId(newId);
    
    // Clear from camera
    setCurrentPrint(null);
    setIsPrinting(false);
  };

  const updatePhotoPosition = (id: string, x: number, y: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  };

  const updatePhotoTransform = (id: string, rotation: number, scale: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, rotation, scale } : p));
  };

  const deletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div 
      className="w-screen h-screen overflow-hidden relative bg-slate-200"
      onMouseDown={() => setSelectedPhotoId(null)} // Deselect when clicking background
    >
      {/* Instructional Text */}
      <div className="absolute top-10 left-0 w-full text-center pointer-events-none z-0 opacity-50">
         <h1 className="font-hand text-4xl text-slate-400 mb-2">Snap & Drag</h1>
         <p className="font-sans text-slate-500 text-sm">Take a photo, then drag the print onto the desk.</p>
         <p className="font-sans text-slate-400 text-xs mt-1">Click a photo to rotate or resize it.</p>
      </div>

      {/* The Photo Wall Area (Full Screen) */}
      <div className="w-full h-full relative z-0">
        {photos.map(photo => (
          <Photo 
            key={photo.id} 
            data={photo} 
            isSelected={selectedPhotoId === photo.id}
            onSelect={() => setSelectedPhotoId(photo.id)}
            onUpdatePosition={updatePhotoPosition} 
            onUpdateTransform={updatePhotoTransform}
            onDelete={deletePhoto}
          />
        ))}
      </div>

      {/* The Camera (Fixed Bottom Left) */}
      <div className="fixed bottom-0 left-10 z-50 mb-[-20px]">
        <PolaroidCamera 
          onCapture={handleCapture}
          isPrinting={isPrinting}
          currentPrintUrl={currentPrint?.url || null}
          currentPrintColor={currentPrint?.borderColor}
          onDragStartFromCamera={handleDragFromCamera}
        />
      </div>

      {/* Footer/Credits */}
      <div className="fixed bottom-2 right-4 text-xs text-gray-400 font-sans pointer-events-none">
        RetroSnap Instant Camera
      </div>
    </div>
  );
}

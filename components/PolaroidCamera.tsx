
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface PolaroidCameraProps {
  onCapture: (imageData: string) => void;
  isPrinting: boolean;
  currentPrintUrl: string | null;
  currentPrintColor?: string;
  onDragStartFromCamera: (e: React.MouseEvent) => void;
}

export const PolaroidCamera: React.FC<PolaroidCameraProps> = ({ 
  onCapture, 
  isPrinting, 
  currentPrintUrl,
  currentPrintColor = '#ffffff',
  onDragStartFromCamera
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isFolded, setIsFolded] = useState(false);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setPermissionError("Camera access denied. Please allow camera permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-unfold if printing starts
  useEffect(() => {
    if (isPrinting || currentPrintUrl) {
      setIsFolded(false);
    }
  }, [isPrinting, currentPrintUrl]);

  const handleShutterPress = useCallback(() => {
    if (isPrinting || isFolded) return; 
    
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (context) {
        // Square Crop Calculations
        const size = Math.min(video.videoWidth, video.videoHeight);
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;

        canvas.width = size;
        canvas.height = size;

        // 1. Base Render - Mirror & Vintage Color Grading
        context.save();
        context.translate(size, 0);
        context.scale(-1, 1);
        
        // "Polaroid" Recipe: Low contrast, warm tint, slightly muted saturation
        context.filter = 'contrast(0.9) brightness(1.1) saturate(0.8) sepia(0.2) hue-rotate(-5deg)';
        context.drawImage(
          video,
          xOffset, yOffset, size, size,
          0, 0, size, size
        );
        context.restore();

        // 2. "Bloom" Effect - Soft diffuse lighting
        // We draw the image again with a blur and screen blend mode to make highlights glow
        context.save();
        context.globalCompositeOperation = 'screen';
        context.filter = 'blur(10px) opacity(0.5) brightness(1.2)';
        context.translate(size, 0);
        context.scale(-1, 1);
        context.drawImage(
          video,
          xOffset, yOffset, size, size,
          0, 0, size, size
        );
        context.restore();

        // 3. Vignette - Darken edges
        context.save();
        context.globalCompositeOperation = 'multiply';
        const gradient = context.createRadialGradient(size/2, size/2, size * 0.4, size/2, size/2, size * 0.85);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(20,10,10,0.6)'); // Slight brownish/black
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        context.restore();

        // 4. Texture/Grain - Manual pixel manipulation
        // This gives the "analog" unpolished feel
        try {
          const imageData = context.getImageData(0, 0, size, size);
          const data = imageData.data;
          // Add noise
          for (let i = 0; i < data.length; i += 4) {
            // Generate random noise value (-20 to 20)
            const noise = (Math.random() - 0.5) * 40;
            
            // Add noise to RGB channels
            data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)); // G
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)); // B
          }
          context.putImageData(imageData, 0, 0);
        } catch (e) {
          console.error("Could not apply grain effect", e);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        setTimeout(() => {
           onCapture(dataUrl);
        }, 100);
      }
    }
  }, [isPrinting, isFolded, onCapture]);

  return (
    // The container moves down when folded.
    // We use translate-y-[300px] to hide most of the body, leaving just the top bar visible.
    <div 
      className={`relative w-[320px] h-[340px] select-none transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFolded ? 'translate-y-[270px]' : 'translate-y-0'}`}
    >
       {/* FOLD TOGGLE BUTTON - Distinct Tab on Top */}
       <button 
          onClick={() => setIsFolded(!isFolded)}
          className="absolute -top-10 right-6 w-16 h-10 bg-gray-800 rounded-t-xl flex items-center justify-center shadow-md border-t border-x border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors z-50 group"
          title={isFolded ? "Open Camera" : "Close Camera"}
       >
          <div className="flex flex-col items-center gap-0.5">
             {isFolded ? (
                <>
                  <ChevronUp className="text-white w-5 h-5 animate-bounce" />
                  <span className="text-[8px] text-white font-sans uppercase tracking-wider">Open</span>
                </>
             ) : (
                <>
                   <ChevronDown className="text-gray-400 w-5 h-5 group-hover:text-white" />
                </>
             )}
          </div>
       </button>


       {flashActive && (
        <div className="fixed inset-0 bg-white/80 z-[100] animate-flash pointer-events-none"></div>
      )}

      {/* The Photo Ejecting Slot Mechanism */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-full overflow-visible pointer-events-none z-0">
         {currentPrintUrl && (
            <div 
              className={`absolute top-[20px] left-0 w-full shadow-xl p-3 pb-10 transform transition-transform pointer-events-auto cursor-grab active:cursor-grabbing
                ${isPrinting ? 'animate-eject' : '-translate-y-[60%]'}
              `}
              style={{ 
                height: '290px',
                backgroundColor: currentPrintColor 
              }}
              onMouseDown={onDragStartFromCamera}
            >
              <div className="w-full h-[216px] bg-black overflow-hidden relative">
                 {/* The Developing Photo */}
                 <img 
                    src={currentPrintUrl} 
                    alt="Developing" 
                    className="w-full h-full object-cover animate-develop" 
                 />
                 <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"></div>
              </div>
              <div className="mt-4 text-center">
                  <p className="font-hand text-gray-400 text-sm rotate-[-2deg] opacity-50">RetroSnap</p>
              </div>
            </div>
         )}
      </div>

      {/* Camera Body Main */}
      <div className="relative w-full h-full z-10">
        {/* Top Slant/Eject Slot Cover */}
        <div className="absolute top-[80px] w-full h-[260px] bg-[#fdfbf7] rounded-b-[40px] rounded-t-[10px] shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-b-8 border-gray-200 flex flex-col items-center justify-center">
           
           {/* Rainbow Stripe */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-full flex flex-col items-center opacity-90 pointer-events-none">
             <div className="w-2 h-full bg-transparent border-l border-r border-gray-100/20 absolute left-4"></div>
             <div className="w-full h-[60px] absolute bottom-[40px] flex justify-center space-x-0">
                {/* Rainbow bars */}
                <div className="w-3 h-full bg-[#4694d2]"></div> {/* Blue */}
                <div className="w-3 h-full bg-[#64bc46]"></div> {/* Green */}
                <div className="w-3 h-full bg-[#fbdc2f]"></div> {/* Yellow */}
                <div className="w-3 h-full bg-[#f58e2c]"></div> {/* Orange */}
                <div className="w-3 h-full bg-[#e42d28]"></div> {/* Red */}
             </div>
           </div>

           {/* Lens Housing */}
           <div className="relative w-[180px] h-[180px] bg-[#1a1a1a] rounded-full shadow-2xl border-[6px] border-[#2a2a2a] flex items-center justify-center mt-4">
              {/* Lens Glass */}
              <div className="w-[140px] h-[140px] bg-black rounded-full border-[8px] border-[#333] relative overflow-hidden shadow-inner">
                  {/* Reflection */}
                  <div className="absolute top-4 right-8 w-8 h-4 bg-white opacity-20 rounded-[50%] rotate-[-45deg] blur-[2px]"></div>
                  <div className="absolute top-8 right-6 w-4 h-2 bg-white opacity-40 rounded-[50%] rotate-[-45deg]"></div>
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"></div>
                  
                  {/* Mechanical Shutter Look */}
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-10 h-10 bg-[#111] rounded-full border border-gray-800"></div>
                  </div>
              </div>
              
              {/* Bottom Light Sensor/Detail */}
              <div className="absolute -bottom-2 w-6 h-6 bg-gray-800 rounded-full border-2 border-gray-600"></div>
           </div>

           {/* Branding */}
           <div className="absolute bottom-4 right-8 font-sans font-bold text-gray-400 tracking-widest text-xs uppercase">
             OneStep
           </div>
        </div>

        {/* Top Section (Viewfinder + Flash Block) */}
        <div 
          className="absolute top-0 w-full h-[90px] bg-[#fdfbf7] rounded-t-[20px] shadow-md z-20 flex items-center justify-between px-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => isFolded && setIsFolded(false)}
        >
           
           {isFolded && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-sans font-semibold tracking-wider animate-pulse pointer-events-none z-40">
               CLICK TO OPEN
             </div>
           )}

           {/* Eject Slot Line */}
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[260px] h-[6px] bg-[#1a1a1a] rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"></div>

           {/* Flash Unit */}
           <div className={`relative w-[90px] h-[50px] bg-[#d1d5db] rounded flex items-center justify-center border-2 border-gray-300 shadow-inner overflow-hidden transition-opacity duration-500 ${isFolded ? 'opacity-20' : 'opacity-100'}`}>
             <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-gray-200 to-gray-400 opacity-80 flex items-center justify-center">
               <Zap className="text-yellow-600 opacity-20 w-6 h-6" />
             </div>
             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNTAgNEgwVjB6IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50"></div>
           </div>

           {/* Viewfinder (Real Video Feed) */}
           <div className={`relative w-[60px] h-[60px] bg-[#111] rounded border-4 border-[#333] overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,1)] transition-opacity duration-500 ${isFolded ? 'opacity-0' : 'opacity-100'}`}>
              {!stream && !permissionError && (
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="text-gray-600 animate-pulse" />
                 </div>
              )}
              {permissionError && (
                <div className="absolute inset-0 bg-red-900 flex items-center justify-center p-1">
                  <span className="text-[8px] text-white text-center leading-tight">No Access</span>
                </div>
              )}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
           </div>
        </div>

        {/* Shutter Button */}
        <button 
           onClick={handleShutterPress}
           disabled={isPrinting || isFolded}
           className={`absolute -right-4 top-[140px] w-14 h-14 rounded-full bg-red-600 shadow-[inset_0_-4px_4px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.4)] border-4 border-[#cc0000] flex items-center justify-center active:scale-95 active:shadow-inner transition-all duration-500 z-30 cursor-pointer hover:bg-red-500
             ${(isPrinting || isFolded) ? 'opacity-50 cursor-not-allowed scale-75' : ''}
           `}
           aria-label="Take Photo"
        >
           <div className="w-8 h-8 rounded-full border border-red-800/30 bg-gradient-to-br from-red-400 to-red-700"></div>
        </button>

      </div>

      {/* Hidden Capture Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

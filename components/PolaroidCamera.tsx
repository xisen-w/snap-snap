import React, { useRef, useEffect, useState, useCallback } from "react";
import { Camera, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface PolaroidCameraProps {
  onCapture: (imageData: string) => void;
  isPrinting: boolean;
  currentPrintUrl: string | null;
  currentPrintColor?: string;
  onDragStartFromCamera: (e: React.PointerEvent) => void;
}

// ---------------------------------------
// ULTRA-ICE TINT PRESETS
// ---------------------------------------
const TINT_OPTIONS = [
  {
    id: "neutral",
    name: "Standard",
    color: "bg-zinc-500",
    vignette: "rgba(15,15,15,0.75)",
    overlay: null,
  },
  {
    id: "blue",
    name: "Midnight Ice",
    color: "bg-blue-600",
    vignette: "rgba(10, 20, 55, 0.92)",
    overlay: "rgba(210, 240, 255, 0.18)",
  },
  {
    id: "red",
    name: "Velvet",
    color: "bg-red-700",
    vignette: "rgba(70, 5, 20, 0.85)",
    overlay: "rgba(255, 40, 0, 0.08)",
  },
  {
    id: "emerald",
    name: "Forest",
    color: "bg-emerald-700",
    vignette: "rgba(5, 50, 30, 0.85)",
    overlay: "rgba(0, 255, 100, 0.06)",
  },
  {
    id: "amber",
    name: "Sepia",
    color: "bg-amber-500",
    vignette: "rgba(60, 40, 10, 0.85)",
    overlay: "rgba(255, 180, 0, 0.1)",
  },
];

export const PolaroidCamera: React.FC<PolaroidCameraProps> = ({
  onCapture,
  isPrinting,
  currentPrintUrl,
  currentPrintColor = "#ffffff",
  onDragStartFromCamera,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isFolded, setIsFolded] = useState(false);
  const [selectedTintIndex, setSelectedTintIndex] = useState(0);
  const [isFlashEnabled, setIsFlashEnabled] = useState(false);

  const currentTint = TINT_OPTIONS[selectedTintIndex];

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        setPermissionError("Camera access denied.");
      }
    };

    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (isPrinting || currentPrintUrl) setIsFolded(false);
  }, [isPrinting, currentPrintUrl]);

  const handleShutterPress = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (isPrinting || isFolded) return;

      if (isFlashEnabled) {
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 150);
      }

      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const size = Math.min(video.videoWidth, video.videoHeight);
      const xOffset = (video.videoWidth - size) / 2;
      const yOffset = (video.videoHeight - size) / 2;

      canvas.width = size;
      canvas.height = size;

      ctx.save();
      ctx.translate(size, 0);
      ctx.scale(-1, 1);

      let filterString = "";

      if (currentTint.id === "blue") {
        if (isFlashEnabled) {
          filterString =
            "hue-rotate(-36deg) saturate(0.32) brightness(1.48) contrast(1.58)";
        } else {
          filterString =
            "hue-rotate(-20deg) saturate(0.50) brightness(1.22) contrast(1.12)";
        }
      } else {
        filterString = isFlashEnabled
          ? "contrast(1.4) brightness(1.3) saturate(1.1) sepia(0.05)"
          : "contrast(0.9) brightness(1.1) saturate(0.85) sepia(0.15) hue-rotate(-5deg)";
      }

      ctx.filter = filterString;
      ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, size, size);
      ctx.restore();

      if (isFlashEnabled && currentTint.id === "blue") {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(0, 0, 25, 0.25)";
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
      }

      if (currentTint.id === "blue") {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(220, 245, 255, 0.25)";
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(180, 240, 255, 0.12)";
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
      } else if (currentTint.overlay) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = currentTint.overlay;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
      }

      if (!isFlashEnabled) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.filter = "blur(14px) opacity(0.35)";
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, size, size);
        ctx.restore();
      }

      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      let gradient;
      if (isFlashEnabled) {
        gradient = ctx.createRadialGradient(
          size / 2,
          size / 2,
          size * 0.22,
          size / 2,
          size / 2,
          size * 0.88
        );
      } else {
        gradient = ctx.createRadialGradient(
          size / 2,
          size / 2,
          size * 0.45,
          size / 2,
          size / 2,
          size * 1.05
        );
      }
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, currentTint.vignette);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      if (currentTint.id === "blue") {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(45, 70, 140, 0.18)";
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
      }

      try {
        const img = ctx.getImageData(0, 0, size, size);
        const data = img.data;
        const grain = currentTint.id === "blue" ? 14 : 22;
        for (let i = 0; i < data.length; i += 4) {
          const n = (Math.random() - 0.5) * grain;
          data[i] += n;
          data[i + 1] += n;
          data[i + 2] += n;
        }
        ctx.putImageData(img, 0, 0);
      } catch (err) {
        console.log("grain error", err);
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setTimeout(() => onCapture(dataUrl), 100);
    },
    [isPrinting, isFolded, onCapture, currentTint, isFlashEnabled]
  );

  return (
    <div
      className={`relative w-[320px] h-[340px] select-none transition-transform duration-700 pointer-events-none ${
        isFolded ? "translate-y-[270px]" : "translate-y-0"
      }`}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsFolded(!isFolded);
        }}
        className="absolute -top-10 right-6 w-16 h-10 bg-gray-800 rounded-t-xl flex items-center justify-center shadow-md border-t border-x border-gray-700 cursor-pointer hover:bg-gray-700 z-50 group pointer-events-auto"
      >
        <div className="flex flex-col items-center gap-0.5">
          {isFolded ? (
            <>
              <ChevronUp className="text-white w-5 h-5 animate-bounce" />
              <span className="text-[8px] text-white uppercase">Open</span>
            </>
          ) : (
            <ChevronDown className="text-gray-400 w-5 h-5 group-hover:text-white" />
          )}
        </div>
      </button>

      {flashActive && (
        <div className="fixed inset-0 bg-white/80 z-[100] animate-flash pointer-events-none" />
      )}

      {/* Photo eject - Uses onPointerDown for mobile support */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-full pointer-events-none z-0">
        {currentPrintUrl && (
          <div
            className={`absolute top-[20px] w-full p-3 pb-10 shadow-xl transform cursor-grab active:cursor-grabbing pointer-events-auto ${
              isPrinting ? "animate-eject" : "-translate-y-[60%]"
            }`}
            style={{ height: "290px", backgroundColor: currentPrintColor, touchAction: "none" }}
            onPointerDown={onDragStartFromCamera}
          >
            <div className="w-full h-[216px] bg-black overflow-hidden relative">
              <img
                src={currentPrintUrl}
                alt="Developing"
                className="w-full h-full object-cover animate-develop"
              />
            </div>
            <div className="mt-4 text-center opacity-50">
              <p className="font-hand text-gray-400 text-sm rotate-[-2deg]">
                PulseSnap
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Camera Body */}
      <div className="relative w-full h-full z-10">
        <div className="absolute top-[80px] w-full h-[260px] bg-[#fdfbf7] rounded-b-[40px] rounded-t-[10px] shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-b-8 border-gray-200 flex flex-col items-center pointer-events-auto">
           <div className="absolute inset-0 opacity-10 pointer-events-none rounded-b-[40px] rounded-t-[10px] bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] mix-blend-multiply"></div>

          <div className="relative w-[180px] h-[180px] bg-[#1a1a1a] rounded-full shadow-2xl border-[6px] border-[#2a2a2a] flex items-center justify-center mt-4 z-10">
            <div className="w-[140px] h-[140px] bg-black rounded-full border-[8px] border-[#333] relative overflow-hidden shadow-inner" />
            <div className="absolute -bottom-2 w-6 h-6 bg-gray-800 rounded-full border-2 border-gray-600" />
            <div className="absolute top-4 right-6 w-6 h-3 bg-white opacity-10 rotate-[-45deg] rounded-full blur-sm pointer-events-none"></div>
          </div>
          <div className="absolute bottom-4 right-8 font-sans font-bold text-gray-400 tracking-widest text-xs uppercase z-10 drop-shadow-sm">
            PulseSnap
          </div>
        </div>

        {/* Top controls */}
        <div
          className="absolute top-0 w-full h-[90px] bg-[#fdfbf7] rounded-t-[20px] shadow-md z-20 flex items-center justify-between px-6 border-b border-gray-200 pointer-events-auto"
          onClick={() => isFolded && setIsFolded(false)}
        >
           <div className="absolute inset-0 opacity-10 pointer-events-none rounded-t-[20px] bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] mix-blend-multiply"></div>

          {/* Tint selector */}
          <div
            className={`absolute top-2 left-4 flex flex-col gap-1 z-30 ${
              isFolded ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest ml-1 mb-1">
              Filter
            </div>
            <div className="flex gap-1 bg-gray-200/80 p-1.5 rounded-full border border-gray-300/50 backdrop-blur-sm shadow-sm">
              {TINT_OPTIONS.map((t, idx) => (
                <button
                  key={t.id}
                  title={t.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTintIndex(idx);
                  }}
                  className={`w-3.5 h-3.5 rounded-full ${t.color} shadow-sm hover:scale-125 active:scale-95 transition-all ${
                    selectedTintIndex === idx
                      ? "ring-2 ring-offset-1 ring-gray-400 scale-125"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Flash Unit */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsFlashEnabled(!isFlashEnabled);
            }}
            className={`relative w-[80px] h-[44px] bg-[#2a2a2a] rounded-[4px] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.3)] border-[2px] border-[#444] ml-auto mr-[70px] cursor-pointer group overflow-hidden z-30 transition-all duration-300 hover:border-gray-400 ${
              isFolded ? "opacity-20 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="absolute inset-1 bg-gray-800 border border-gray-700 rounded-[2px] overflow-hidden">
               <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.1)_3px)] pointer-events-none z-10"></div>
               <div className={`absolute inset-0 bg-gradient-to-br from-gray-700 to-black transition-opacity duration-300 ${isFlashEnabled ? 'opacity-0' : 'opacity-100'}`}></div>
               <div className={`absolute inset-0 bg-[#fffec8] transition-opacity duration-100 ${isFlashEnabled ? 'opacity-100 shadow-[0_0_20px_rgba(255,255,200,0.9)]' : 'opacity-0'}`}></div>
               <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-20"></div>
            </div>
            <Zap
              className={`relative z-30 w-4 h-4 transition-all duration-300 ${
                isFlashEnabled
                  ? "text-orange-500 opacity-60"
                  : "text-white/20"
              }`}
            />
          </div>

          {/* Viewfinder */}
          <div
            className={`absolute top-[15px] right-6 w-[60px] h-[60px] bg-[#111] rounded border-4 border-[#333] overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,1)] z-30 ${
              isFolded ? "opacity-0" : "opacity-100"
            }`}
          >
            {!stream && !permissionError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="text-gray-600 animate-pulse" />
              </div>
            )}
            {permissionError && (
              <div className="absolute inset-0 bg-red-900 flex items-center justify-center p-1">
                <span className="text-[8px] text-white text-center leading-tight">
                  No Access
                </span>
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

        {/* Shutter */}
        <button
          type="button"
          onClick={handleShutterPress}
          disabled={isPrinting || isFolded}
          className={`absolute -right-4 top-[140px] w-14 h-14 rounded-full bg-red-600 shadow-[inset_0_-4px_4px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.4)] border-4 border-[#cc0000] flex items-center justify-center hover:bg-red-500 active:scale-95 ${
            isPrinting || isFolded ? "opacity-50 cursor-not-allowed scale-75" : ""
          } pointer-events-auto z-30`}
        >
          <div className="w-8 h-8 rounded-full border border-red-800/30 bg-gradient-to-br from-red-400 to-red-700" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SpriteCanvas } from './SpriteCanvas';

export const BeforeAfterSlider: React.FC<{
  originalSrc: string | null;
  originalWidth: number;
  originalHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  spriteData: number[][][];
  spriteWidth: number;
  spriteHeight: number;
  spriteContentX?: number;
  spriteContentY?: number;
  spriteContentW?: number;
  spriteContentH?: number;
  zoom: number;
}> = ({ 
    originalSrc, originalWidth, originalHeight,
    cropX, cropY, cropWidth, cropHeight, 
    spriteData, spriteWidth, spriteHeight,
    spriteContentX, spriteContentY, spriteContentW, spriteContentH,
    zoom 
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [originalImageObj, setOriginalImageObj] = useState<HTMLImageElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load the full original image object once
  useEffect(() => {
    if (!originalSrc) return;
    const img = new Image();
    img.onload = () => setOriginalImageObj(img);
    img.src = originalSrc;
  }, [originalSrc]);

  // Draw the specific crop to the canvas whenever parameters change
  useEffect(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !originalImageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Ensure canvas internal resolution matches the crop size
    // This is important for pixel-perfect rendering when scaled up by CSS
    if (canvas.width !== cropWidth || canvas.height !== cropHeight) {
        canvas.width = cropWidth;
        canvas.height = cropHeight;
    }
    
    // Disable smoothing for pixel art look in the draw step if browser supports it here (though CSS usually handles it)
    ctx.imageSmoothingEnabled = false;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        originalImageObj,
        cropX, cropY, cropWidth, cropHeight, // Source Rect
        0, 0, cropWidth, cropHeight          // Dest Rect (Matches canvas size)
    );
  }, [originalImageObj, cropX, cropY, cropWidth, cropHeight]);

  const calculatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only Left Click
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    calculatePos(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    calculatePos(e.touches[0].clientX);
  };

  // Setup global event listeners for smooth dragging outside the container
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        e.preventDefault();
        calculatePos(e.clientX);
    };
    const handleUp = () => {
        isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging.current) return;
        e.preventDefault(); // Prevent scroll while dragging
        calculatePos(e.touches[0].clientX);
    };
    const handleTouchEnd = () => {
        isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [calculatePos]);

  // Determine scaling to match Original Crop to Sprite Content
  const sCX = spriteContentX ?? 0;
  const sCY = spriteContentY ?? 0;
  // If content width is 0 or undefined, fall back to sprite width to avoid infinity
  const sCW = spriteContentW || spriteWidth;
  const sCH = spriteContentH || spriteHeight;

  // The container is sized to match the crop at the given zoom level
  const widthPx = cropWidth * zoom;
  const heightPx = cropHeight * zoom;

  // Calculate scale required for the sprite so that its content matches the crop size
  const scaleX = widthPx / sCW;
  const scaleY = heightPx / sCH;

  const bgStyle = {
      backgroundImage: `
          linear-gradient(45deg, #333 25%, transparent 25%), 
          linear-gradient(-45deg, #333 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #333 75%), 
          linear-gradient(-45deg, transparent 75%, #333 75%)`,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundColor: '#222'
  };

  return (
       <div 
         ref={containerRef}
         className="relative overflow-hidden shadow-2xl rounded-lg border border-[#3e3e42] select-none pointer-events-auto"
         style={{ width: widthPx, height: heightPx, ...bgStyle }}
         onMouseDown={handleMouseDown}
         onTouchStart={handleTouchStart}
         onClick={(e) => e.stopPropagation()}
       >
          {/* Layer 1: Original (Right Side / Background) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <canvas 
                 ref={originalCanvasRef}
                 width={cropWidth}
                 height={cropHeight}
                 className="absolute inset-0 w-full h-full object-contain pointer-events-none image-pixelated"
                 style={{
                     imageRendering: 'pixelated'
                 }}
             />
          </div>

          {/* Layer 2: Sprite Result (Left Side / Clipped) */}
          <div 
             className="absolute inset-0 pointer-events-none"
             style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
              <div className="relative w-full h-full">
                 {spriteData && (
                     <SpriteCanvas 
                         data={spriteData} 
                         width={spriteWidth} 
                         height={spriteHeight} 
                         style={{ 
                             width: spriteWidth * scaleX, 
                             height: spriteHeight * scaleY,
                             transform: `translate(${-sCX * scaleX}px, ${-sCY * scaleY}px)`,
                             transformOrigin: '0 0'
                         }}
                         className="pointer-events-none" 
                     />
                 )}
              </div>
          </div>
          
           {/* Label for Original */}
           <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1 rounded backdrop-blur-sm pointer-events-none">Original</div>
           {/* Label for Processed */}
           <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1 rounded backdrop-blur-sm z-20">Processed</div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_5px_rgba(0,0,0,0.5)] z-10 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)"/></svg>
             </div>
          </div>
       </div>
  );
};

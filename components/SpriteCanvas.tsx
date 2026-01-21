
import React, { useRef, useEffect } from 'react';

export const SpriteCanvas: React.FC<{ 
  data: number[][][]; 
  width: number; 
  height: number; 
  style?: React.CSSProperties; 
  className?: string 
}> = ({ data, width, height, style, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(width, height);
      const flatData = data.flat(2);
      if (flatData.length !== width * height * 4) return;
      
      imgData.data.set(flatData);
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.error("Error rendering sprite:", e);
    }
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={style}
      className={`image-pixelated ${className || ''}`}
    />
  );
};


import React, { useMemo } from 'react';

export const PaletteDisplay: React.FC<{ data: number[][][] }> = ({ data }) => {
  const uniqueColors = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const colors = new Set<string>();
    try {
        data.forEach(row => {
          if(!Array.isArray(row)) return;
          row.forEach(pixel => {
            if(!Array.isArray(pixel) || pixel.length < 4) return;
            if (pixel[3] > 10) { // Ignore transparent
               const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
               colors.add(hex);
            }
          });
        });
    } catch(e) { console.error("Palette extract error", e); return []; }
    return Array.from(colors).sort();
  }, [data]);

  return (
    <div className="flex flex-wrap gap-1">
      {uniqueColors.map(color => (
        <div 
          key={color} 
          className="w-5 h-5 rounded-sm border border-white/10 relative group cursor-pointer"
          style={{ backgroundColor: color }}
          title={color}
          onClick={() => navigator.clipboard.writeText(color)}
        >
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-[10px] px-1 rounded whitespace-nowrap z-50">
                 {color}
             </div>
        </div>
      ))}
    </div>
  );
};

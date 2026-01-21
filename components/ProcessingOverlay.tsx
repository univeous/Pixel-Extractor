import React from 'react';

interface ProcessingOverlayProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  progressMsg: string;
  progressStep: number;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  imageUrl, imageWidth, imageHeight, progressMsg, progressStep
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-[#1e1e1e]/95">
      {/* Background image */}
      <img 
        src={imageUrl} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover opacity-10"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Progress Card */}
      <div className="relative w-80 bg-[#252526] border border-[#3e3e42] rounded-xl p-6 shadow-2xl text-center">
        {/* Thumbnail */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-lg overflow-hidden border border-[#3e3e42] bg-black/50">
          <img 
            src={imageUrl} 
            alt="" 
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        {/* Spinner */}
        <div className="w-10 h-10 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        
        <div className="text-white font-medium mb-1 truncate">{progressMsg}</div>
        <div className="text-xs text-gray-500 mb-3 font-mono">{Math.round(progressStep)}%</div>
        
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#3e3e42] rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${progressStep}%` }}
          />
        </div>
        
        {/* File info */}
        <div className="mt-3 text-[10px] text-gray-500 font-mono">
          {imageWidth} × {imageHeight}px
        </div>
      </div>
    </div>
  );
};

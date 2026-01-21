
import React, { useRef } from 'react';

export const PanZoomContainer: React.FC<{ 
    children: React.ReactNode; 
    className?: string;
    onZoomChange?: (deltaMultiplier: number) => void;
    pan: { x: number; y: number };
    onPanChange: (newPan: { x: number; y: number }) => void;
}> = ({ children, className, onZoomChange, pan, onPanChange }) => {
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Middle button (1) or Right button (2) for panning
        if (e.button === 1 || e.button === 2) {
            isDragging.current = true;
            lastPos.current = { x: e.clientX, y: e.clientY };
            hasMoved.current = false;
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            hasMoved.current = true;
        }

        onPanChange({ x: pan.x + dx, y: pan.y + dy });
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (hasMoved.current) {
            e.preventDefault();
            hasMoved.current = false;
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (onZoomChange) {
            e.preventDefault();
            e.stopPropagation();
            const multiplier = e.deltaY < 0 ? 1.02 : 0.98;
            onZoomChange(multiplier);
        }
    };

    return (
        <div 
            className={`overflow-hidden cursor-move relative w-full h-full flex items-center justify-center bg-[#1e1e1e] ${className}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
        >
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, transition: isDragging.current ? 'none' : 'transform 0.1s ease-out' }}>
                {children}
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 pointer-events-none bg-black/30 px-2 py-1 rounded whitespace-nowrap z-20">
                Middle Mouse Button + Drag to Pan | Wheel to Zoom
            </div>
        </div>
    );
};

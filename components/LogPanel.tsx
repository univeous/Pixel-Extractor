
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { WorkerStatus } from '../types';

export const LogPanel: React.FC<{ logs: string[], status: WorkerStatus }> = ({ logs, status }) => {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-expand on error
  useEffect(() => {
    if (status === 'error') setExpanded(true);
  }, [status]);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (expanded && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expanded]);

  const lastLog = logs.length > 0 ? logs[logs.length - 1] : (status === 'init' ? "Initializing system..." : "Ready to process.");

  return (
    <div className="bg-[#252526] border-t border-[#3e3e42] flex flex-col shrink-0" style={{ height: expanded ? '12rem' : '2rem', transition: 'height 0.3s ease' }}>
       <div 
         className="h-8 min-h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-[#2d2d30] select-none shrink-0"
         onClick={() => setExpanded(!expanded)}
       >
          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 truncate flex-1">
              <span className={`font-bold ${status === 'error' ? 'text-red-400' : status === 'processing' ? 'text-yellow-400' : (status === 'ready' ? 'text-green-500' : 'text-gray-500')}`}>
                  {status === 'processing' ? '>>' : status === 'error' ? '!!' : (status === 'ready' ? 'OK' : '..')}
              </span>
              <span className="truncate">{lastLog}</span>
          </div>
          <div className="text-gray-500">
             {expanded ? <Icons.ChevronDown /> : <Icons.ChevronUp />}
          </div>
       </div>
       {expanded && (
         <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] text-gray-400 bg-[#1e1e1e]">
             {logs.map((log, i) => (
                 <div key={i} className="hover:bg-[#333] px-1 rounded">{log}</div>
             ))}
             <div ref={scrollRef} />
         </div>
       )}
    </div>
  );
};

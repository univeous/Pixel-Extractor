
import React from 'react';

export const GlobalLoader: React.FC<{ logs: string[] }> = ({ logs }) => {
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : 'Loading Python Environment...';
    
    return (
        <div className="fixed inset-0 z-[100] bg-[#1e1e1e] flex flex-col items-center justify-center text-center p-8">
             <div className="relative mb-8">
                 <div className="w-16 h-16 border-4 border-[#3e3e42] rounded-full"></div>
                 <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
             </div>
             <h1 className="text-2xl font-bold text-white mb-2">Initializing System</h1>
             <p className="text-gray-400 max-w-md animate-pulse font-mono text-sm">{lastLog}</p>
        </div>
    );
}

import React from 'react';
import { Icons } from './Icons';
import { WorkerStatus } from '../types';
import { TranslationKey } from '../i18n/index';

interface UploadAreaProps {
  status: WorkerStatus;
  onFileSelect: (file: File) => void;
  t: (key: TranslationKey) => string;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ status, onFileSelect, t }) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
  };

  return (
    <div 
      className={`flex-1 flex flex-col items-center justify-center border-4 border-dashed m-8 rounded-3xl transition-all cursor-pointer min-h-0 ${status === 'ready' ? 'border-[#3e3e42] hover:border-blue-500 hover:bg-blue-500/5' : 'border-red-900/50 opacity-50'}`}
      onClick={() => document.getElementById('file-upload')?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        id="file-upload" 
        className="hidden" 
        accept="image/*"
        onChange={handleFileInput} 
      />
      <div className="p-6 bg-[#252526] rounded-full mb-6 text-blue-500 shadow-2xl transform hover:scale-110 transition-transform">
        <Icons.Upload />
      </div>
      <h3 className="text-3xl font-light text-white mb-2">{t('uploadTitle')}</h3>
      <p className="text-gray-500 text-lg">{t('uploadSubtitle')}</p>
      <p className="text-xs text-gray-600 mt-4 font-mono">{t('uploadFormats')}</p>
    </div>
  );
};

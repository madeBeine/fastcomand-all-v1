import React from 'react';

const SlideIn: React.FC<{ isOpen: boolean; onClose: () => void; title?: string; children?: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="ml-auto w-full sm:w-96 bg-white dark:bg-gray-900 h-full shadow-lg p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium">{title}</div>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-300">✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default SlideIn;

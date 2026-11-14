import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface MediaViewerModalProps {
  mediaUrl: string;
  fileName?: string;
  senderName?: string;
  createdAt?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaUrl,
  fileName = 'image.jpg',
  senderName,
  createdAt,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-xl p-4"
      onClick={onClose}
      dir="rtl"
    >
      {/* Top action toolbar */}
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate max-w-[180px] sm:max-w-md">{fileName}</span>
          {senderName && (
            <span className="text-xs text-slate-400">
              أرسلها: {senderName} {createdAt ? `· ${new Date(createdAt).toLocaleTimeString('ar-SA')}` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#0E121B]/85 border border-white/[0.1] p-1.5 rounded-2xl backdrop-blur-xl shadow-2xl shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تكبير"
            aria-label="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تصغير"
            aria-label="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="تدوير"
            aria-label="تدوير"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="min-h-[40px] px-3 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="تحميل"
            aria-label="تحميل"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تحميل</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media container */}
      <div
        className="max-w-5xl max-h-[85vh] overflow-hidden flex items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={mediaUrl}
          alt={fileName}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out',
          }}
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl select-none"
        />
      </div>
    </div>
  );
};

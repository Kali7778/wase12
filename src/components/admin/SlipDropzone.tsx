import React, { useCallback, useRef, useState } from 'react';
import { FileUp, Loader2, Upload } from 'lucide-react';

interface SlipDropzoneProps {
  onFiles: (files: File[]) => void;
  busy?: boolean;
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';

/** Drop area for a day's delivery slips. Accepts many files at once. */
export const SlipDropzone: React.FC<SlipDropzoneProps> = ({ onFiles, busy }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !busy && inputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        dragging
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400'
      } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {busy ? 'Reading files…' : 'Drop today’s delivery slips here'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload all of them at once — click to browse, or drag files in
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <FileUp className="w-3.5 h-3.5" />
          <span>PDF is read automatically · images and Word files need manual entry</span>
        </div>
      </div>
    </div>
  );
};

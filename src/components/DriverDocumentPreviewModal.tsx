import React from 'react';
import { DriverDocumentInfo, DocumentExpiryStatus } from '../types';
import {
  X,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check
} from 'lucide-react';

interface DriverDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DriverDocumentInfo | null;
  title: string;
  driverName?: string;
  expiryStatus?: DocumentExpiryStatus;
  expiryDate?: string;
}

export const DriverDocumentPreviewModal: React.FC<DriverDocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  title,
  driverName,
  expiryStatus,
  expiryDate,
}) => {
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  if (!isOpen || !document) return null;

  const isPdf = document.fileType === 'pdf' || document.fileName.toLowerCase().endsWith('.pdf');
  const previewSource = document.fileDataUrl || document.publicUrl || '';

  const handleCopyPath = () => {
    const textToCopy = document.storagePath || document.publicUrl || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!previewSource) return;
    const a = window.document.createElement('a');
    a.href = previewSource;
    a.download = document.fileName || 'driver_document';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <div
      id="driver-document-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                {expiryStatus === 'valid' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid
                  </span>
                )}
                {expiryStatus === 'expiring_soon' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Expiring Soon
                  </span>
                )}
                {expiryStatus === 'expired' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{driverName || 'Driver Record'}</span>
                {expiryDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Expiry: {expiryDate}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Download Document"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Supabase Storage Reference Bar */}
        <div className="px-5 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold">Supabase Storage:</span>
            <code className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 truncate max-w-sm">
              {document.storagePath || `driver-documents/${document.fileName}`}
            </code>
          </div>

          <button
            onClick={handleCopyPath}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedUrl ? 'Copied Reference!' : 'Copy Path'}</span>
          </button>
        </div>

        {/* Preview Viewport */}
        <div className="flex-1 overflow-auto p-5 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[380px]">
          {isPdf ? (
            previewSource.startsWith('data:application/pdf') || previewSource.endsWith('.pdf') ? (
              <iframe
                src={previewSource}
                title={document.fileName}
                className="w-full h-[520px] rounded-2xl border border-slate-300 dark:border-slate-800 bg-white shadow-sm"
              />
            ) : (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md space-y-3">
                <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{document.fileName}</h4>
                <p className="text-xs text-slate-500">
                  This PDF document reference is saved in Supabase Storage. You can download or view it directly.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2 mx-auto"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            )
          ) : previewSource ? (
            <div className="relative max-h-[520px] flex items-center justify-center">
              <img
                src={previewSource}
                alt={document.fileName}
                className="max-h-[500px] max-w-full object-contain rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800"
              />
            </div>
          ) : (
            <div className="text-center p-8 text-slate-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No image preview available</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/60 dark:bg-slate-900">
          <div className="text-slate-500 flex items-center gap-3">
            <span>
              <strong>File:</strong> {document.fileName}
            </span>
            {document.fileSize && (
              <span>
                <strong>Size:</strong> {(document.fileSize / 1024).toFixed(1)} KB
              </span>
            )}
            {document.uploadedAt && (
              <span>
                <strong>Uploaded:</strong> {new Date(document.uploadedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl transition-all cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { BrokerLoad } from '../types';
import { useApp } from '../context/AppContext';
import { X, FileText, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface BrokerPdfViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: BrokerLoad | null;
}

export const BrokerPdfViewModal: React.FC<BrokerPdfViewModalProps> = ({
  isOpen,
  onClose,
  load,
}) => {
  const { attachBrokerPdf, showToast } = useApp();

  if (!isOpen || !load) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      attachBrokerPdf(load.id, reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!load.attachedPdfUrl) return;
    const a = document.createElement('a');
    a.href = load.attachedPdfUrl;
    a.download = load.attachedPdfName || `${load.dnNumber}_DeliverySlip.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download Started', `Downloading ${load.attachedPdfName || 'document'}`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Delivery Slip / Consignment PDF</h2>
              <p className="text-xs text-slate-400">
                DN: <strong className="font-mono text-amber-400">{load.dnNumber}</strong> • {load.brokerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {load.attachedPdfUrl && (
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {load.attachedPdfUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs">
                <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>{load.attachedPdfName || 'Consignment_Document.pdf'}</span>
                </div>
                <label className="text-[11px] font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer">
                  Replace File
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preview Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden flex items-center justify-center min-h-[360px] max-h-[500px]">
                {load.attachedPdfUrl.startsWith('data:image') || load.attachedPdfUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={load.attachedPdfUrl}
                    title="PDF Document Preview"
                    className="w-full h-[460px] rounded-xl border-0 bg-white"
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <FileText className="w-16 h-16 text-purple-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Document Ready
                    </p>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-2 mx-auto"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Document</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Document Attached Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Upload a delivery slip, physical POD scan, or freight confirmation PDF for this consignment.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95">
                <Upload className="w-4 h-4" />
                <span>Upload Delivery Slip (PDF/Image)</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Footer Close */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

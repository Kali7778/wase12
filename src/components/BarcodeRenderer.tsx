import React, { useState } from 'react';
import { encodeCode128, formatBarcodeLabel } from '../utils/barcode';
import { Copy, Check, Barcode as BarcodeIcon, Scan, ShieldCheck } from 'lucide-react';

interface BarcodeRendererProps {
  value: string;
  type?: 'SO' | 'DN' | 'SKU' | 'GENERIC';
  title?: string;
  subtitle?: string;
  height?: number;
  moduleWidth?: number;
  showText?: boolean;
  showCopy?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  id?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  type = 'GENERIC',
  title,
  subtitle,
  height = 54,
  moduleWidth = 2,
  showText = true,
  showCopy = true,
  className = '',
  id,
}) => {
  const [copied, setCopied] = useState(false);
  const rawText = value || '0000000000';
  const { bars, totalWidth } = encodeCode128(rawText, moduleWidth);

  const displayTitle =
    title ||
    (type === 'SO'
      ? 'SO BARCODE (Sales Order)'
      : type === 'DN'
      ? 'DN BARCODE (Delivery Note)'
      : type === 'SKU'
      ? 'SKU BARCODE'
      : 'CODE 128 BARCODE');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={id || `barcode-${type.toLowerCase()}-${rawText.replace(/[^a-zA-Z0-9]/g, '_')}`}
      className={`group relative flex flex-col items-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print:shadow-none print:border-slate-300 print:bg-white print:p-2 ${className}`}
    >
      {/* Header / Type Label */}
      <div className="w-full flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800/80 print:border-slate-200">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wider shrink-0 ${
              type === 'SO'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 print:bg-slate-100 print:text-slate-900'
                : type === 'DN'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 print:bg-slate-100 print:text-slate-900'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {type === 'SO' ? 'SO' : type === 'DN' ? 'DN' : 'CODE 128'}
          </span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate uppercase tracking-tight print:text-slate-900">
            {displayTitle}
          </span>
        </div>

        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copy barcode data"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors print:hidden shrink-0 cursor-pointer"
          >
            {copied ? (
              <span className="flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="w-3 h-3 mr-0.5" /> Copied
              </span>
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* SVG Barcode Vector Display */}
      <div className="w-full overflow-x-auto flex justify-center py-1 bg-white rounded print:py-0.5">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${totalWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="max-h-[64px] w-auto shrink-0 print:max-h-[50px]"
          style={{ minWidth: '130px', maxWidth: '240px' }}
        >
          {/* Background white */}
          <rect x="0" y="0" width={totalWidth} height={height} fill="#ffffff" />
          {/* Black Barcode Bars */}
          {bars.map((bar, index) => (
            <rect
              key={index}
              x={bar.x}
              y={0}
              width={bar.width}
              height={height}
              fill="#0f172a"
              shapeRendering="crispEdges"
            />
          ))}
        </svg>
      </div>

      {/* Human Readable Value */}
      {showText && (
        <div className="mt-1 flex flex-col items-center text-center">
          <div className="font-mono text-xs font-black tracking-widest text-slate-900 dark:text-slate-100 print:text-black">
            {type === 'SO' && !rawText.startsWith('SO-') && !rawText.startsWith('SO#')
              ? `*SO-${rawText}*`
              : type === 'DN' && !rawText.startsWith('DN-') && !rawText.startsWith('DN#')
              ? `*DN-${rawText}*`
              : `*${rawText}*`}
          </div>
          {subtitle && (
            <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 print:text-slate-600">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface SlipBarcodePairProps {
  soNumber?: string;
  dnNumber: string;
  itemSku?: string;
  compact?: boolean;
  className?: string;
}

export const SlipBarcodePair: React.FC<SlipBarcodePairProps> = ({
  soNumber,
  dnNumber,
  itemSku,
  compact = false,
  className = '',
}) => {
  // If no explicit SO number provided, derive a linked sales order number
  const effectiveSoNumber = soNumber || (dnNumber ? `9100${dnNumber.slice(-6)}` : '9100042352');
  const effectiveDnNumber = dnNumber || '9010043436';

  return (
    <div
      id="slip-barcode-pair-container"
      className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 print:bg-white print:border-slate-300 print:p-2 ${className}`}
    >
      {/* 1. SO Barcode */}
      <BarcodeRenderer
        id="slip-so-barcode"
        value={effectiveSoNumber}
        type="SO"
        title="Sales Order (SO) Barcode"
        subtitle="Logistics & Dispatch Verification"
        height={compact ? 42 : 50}
        moduleWidth={2}
      />

      {/* 2. DN Barcode */}
      <BarcodeRenderer
        id="slip-dn-barcode"
        value={effectiveDnNumber}
        type="DN"
        title="Delivery Note (DN) Barcode"
        subtitle="Receiver & Inward Gate Clearance"
        height={compact ? 42 : 50}
        moduleWidth={2}
      />
    </div>
  );
};

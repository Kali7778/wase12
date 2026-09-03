import React from 'react';
import { BrokerLoad } from '../types';
import { X, Printer, Download, MapPin, Truck, User, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface BrokerPrintDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: BrokerLoad | null;
}

export const BrokerPrintDetailsModal: React.FC<BrokerPrintDetailsModalProps> = ({
  isOpen,
  onClose,
  load,
}) => {
  if (!isOpen || !load) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalQty = (load.dropLocations || []).reduce((sum, s) => sum + (Number(s.deliveryQty) || 0), 0);
  const netFreight = (Number(load.freightAmount) || 0) - (Number(load.brokerCommission) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Modal Top Control Bar (Hidden during actual print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Print Broker Load Manifest</h2>
              <p className="text-xs text-slate-400">
                Official Multi-Drop Waybill for DN: <strong className="text-amber-400 font-mono">{load.dnNumber}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div id="printable-broker-load" className="p-8 bg-white text-slate-900 space-y-6 print:p-0 print:space-y-4">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
            <div className="space-y-1">
              <div className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono font-black text-xs uppercase tracking-wider mb-1">
                Broker Consignment Manifest
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                LOGIFLOW LOGISTICS &amp; HEAVY TRANSPORT
              </h1>
              <p className="text-xs text-slate-600">
                Kingdom of Saudi Arabia • Unified Transport Operations &amp; Brokerage
              </p>
              <p className="text-[11px] text-slate-500">
                Tax / CR: 1010892014 • VAT No: 31008892100003
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="font-mono text-xs font-black text-slate-500">DELIVERY NOTE NO.</div>
              <div className="font-mono text-xl font-black text-amber-600">
                {load.dnNumber}
              </div>
              <div className="text-xs font-bold text-slate-700">
                Date: <span className="font-mono">{load.slipDate}</span>
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider bg-slate-100 border-slate-300">
                Status: {load.loadStatus}
              </div>
            </div>
          </div>

          {/* Barcode & Manifest Bar */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Barcode Identifier</span>
              <div className="font-mono text-sm tracking-widest font-black text-slate-900">
                *{load.dnNumber.replace(/[^A-Z0-9]/g, '')}*
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-500">Load Type: </span>
              <strong className="text-slate-900 font-bold">Broker Consignment (Multi-Drop)</strong>
            </div>
          </div>

          {/* 2-Column Metadata Box */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Column 1: Cargo & Broker */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Consignment Details</span>
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Broker Name:</span>
                  <strong className="text-slate-900">{load.brokerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material / Item:</span>
                  <strong className="text-slate-900">{load.materialItem}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Location:</span>
                  <strong className="text-slate-900 text-right max-w-[200px]">{load.pickupLocation}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Delivery Stops:</span>
                  <strong className="text-slate-900 font-mono">{load.dropLocations?.length || 0} Stops</strong>
                </div>
              </div>
            </div>

            {/* Column 2: Driver & Vehicle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Assigned Fleet &amp; Driver</span>
              </h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Driver:</span>
                  <strong className="text-slate-900">{load.assignedDriverName || 'Unassigned'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver Phone:</span>
                  <strong className="text-slate-900 font-mono">{load.assignedDriverPhone || '—'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Truck Plate:</span>
                  <strong className="text-slate-900 font-mono">{load.assignedTruckPlate || '—'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TLB No.:</span>
                  <strong className="text-slate-900 font-mono">{load.assignedTruckTlbNo || '—'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* MULTIPLE DROP LOCATIONS TABLE */}
          <div className="space-y-2">
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Delivery Stops Schedule &amp; Proof of Delivery (POD)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Total Planned Qty: <strong>{totalQty.toLocaleString()} units</strong>
              </span>
            </h3>

            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-300">
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-14">Stop</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Drop Location / Site</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Delivery Qty</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Status</th>
                  <th className="py-2.5 px-3 w-40 text-center">Receiver Sign &amp; Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(load.dropLocations || []).map((stop, idx) => (
                  <tr key={stop.id} className="min-h-[48px]">
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-bold">
                      #{stop.stopNumber || idx + 1}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{stop.dropLocation}</div>
                      {stop.deliveredAt && (
                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                          Delivered: {stop.deliveredAt}
                        </div>
                      )}
                      {stop.recipientName && (
                        <div className="text-[10px] text-slate-500">
                          Received by: {stop.recipientName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                      {stop.deliveryQty} {stop.unit || 'BAG'}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        stop.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : stop.status === 'In Transit'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {stop.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center align-bottom">
                      <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1 text-[10px] text-slate-400">
                        Sign / Stamp
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Freight Amount</span>
              <span className="font-mono font-black text-sm text-slate-900">
                {load.freightAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Broker Commission</span>
              <span className="font-mono font-black text-sm text-amber-700">
                {load.brokerCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Net Freight</span>
              <span className="font-mono font-black text-sm text-emerald-700">
                {netFreight.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
              </span>
            </div>
          </div>

          {/* Notes */}
          {load.notes && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-900 uppercase text-[10px]">Notes &amp; Instructions:</span>
              <p className="text-slate-800">{load.notes}</p>
            </div>
          )}

          {/* Sign-off Boxes */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-xs">
            <div className="space-y-12">
              <span className="font-bold text-slate-700 block uppercase text-[10px]">1. Dispatcher Release</span>
              <div className="border-b border-slate-900 pt-8" />
              <p className="text-[10px] text-slate-500 text-center">Name &amp; Date</p>
            </div>
            <div className="space-y-12">
              <span className="font-bold text-slate-700 block uppercase text-[10px]">2. Driver Acknowledgment</span>
              <div className="border-b border-slate-900 pt-8" />
              <p className="text-[10px] text-slate-500 text-center">{load.assignedDriverName || 'Driver Sign'}</p>
            </div>
            <div className="space-y-12">
              <span className="font-bold text-slate-700 block uppercase text-[10px]">3. Operations Stamp</span>
              <div className="h-16 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                Official Stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

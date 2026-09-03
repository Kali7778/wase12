import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Printer, Check, Truck, ShieldCheck, MapPin, Calendar, Clock, Download, Barcode as BarcodeIcon } from 'lucide-react';
import { formatCurrency } from '../utils/i18n';
import { BarcodeRenderer, SlipBarcodePair } from './BarcodeRenderer';

export const DeliveryNoteModal: React.FC = () => {
  const { selectedTripForDn, setSelectedTripForDn, updateTripStatus, language, companySettings, showToast } = useApp();
  const [signatureName, setSignatureName] = useState('');
  const [signSubmitting, setSignSubmitting] = useState(false);

  if (!selectedTripForDn) return null;

  const trip = selectedTripForDn;
  const dn = trip.deliveryNote;

  const handlePrint = () => {
    window.print();
  };

  const handleCompleteDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) {
      showToast('Signature Required', 'Please enter the receiver authorized name.', 'warning');
      return;
    }
    setSignSubmitting(true);
    updateTripStatus(trip.id, 'delivered', `Signed by: ${signatureName.trim()}`);
    setSelectedTripForDn(null);
    setSignSubmitting(false);
  };

  return (
    <div
      id="dn-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={() => setSelectedTripForDn(null)}
    >
      <div
        id="dn-modal-container"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delivery Note: <span className="font-mono text-blue-600 dark:text-blue-400">{dn.dnNumber}</span>
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                    trip.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : trip.status === 'in_transit'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {trip.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Linked Trip: {trip.tripNumber} • Created {dn.issueDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dn-print-btn"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              id="dn-close-btn"
              onClick={() => setSelectedTripForDn(null)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-delivery-note" className="p-8 space-y-6 bg-white dark:bg-slate-900">
          {/* Company Branding & DN Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                  LF
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {companySettings.companyName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-arabic">
                    {companySettings.companyNameAr}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                CR: {companySettings.crNumber} | VAT: {companySettings.vatNumber}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {companySettings.address}, {companySettings.city}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-xs font-mono uppercase text-slate-400">OFFICIAL CARGO MANIFEST</div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">{dn.dnNumber}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center sm:justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date: {dn.issueDate}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center sm:justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5" /> ETA: {dn.expectedDelivery}
              </div>
            </div>
          </div>

          {/* Sender & Receiver Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shipper / Origin</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{dn.senderName}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                <span>{dn.senderAddress}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Contact: {dn.senderContact}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consignee / Destination</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{dn.receiverName}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                <span>{dn.receiverAddress}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contact: {dn.receiverContact} {dn.receiverVatNumber && `| VAT: ${dn.receiverVatNumber}`}
              </p>
            </div>
          </div>

          {/* Transport & Carrier Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Assigned Driver:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{trip.driverName}</span>
              <div className="text-[10px] text-slate-500">{trip.driverPhone}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Vehicle Plate:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{trip.vehiclePlate}</span>
              <div className="text-[10px] text-slate-500">{trip.vehicleType.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cargo Nature:</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">{trip.cargoType}</span>
              {trip.temperatureRequired && (
                <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  {trip.temperatureRequired}
                </div>
              )}
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total Cargo Load:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{(dn.totalWeightKg ?? 0).toLocaleString()} kg</span>
              <div className="text-[10px] text-slate-500">{dn.totalVolumeCbm ?? 0} CBM • {dn.packagesCount ?? 0} pkgs</div>
            </div>
          </div>

          {/* Cargo Manifest Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Description of Goods</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Weight (KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {(dn.items || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{item.sku}</td>
                    <td className="p-3">
                      <div>{item.name}</div>
                      {item.temperatureRequired && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          Reefer: {item.temperatureRequired}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">{(item.quantity ?? 0).toLocaleString()}</td>
                    <td className="p-3 text-center text-slate-500">{item.unit || 'Pkg'}</td>
                    <td className="p-3 text-right font-mono">{(item.weightKg ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/70 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td colSpan={3} className="p-3 text-right">Total Summary:</td>
                  <td className="p-3 text-center">{dn.packagesCount ?? 0} Pkgs</td>
                  <td className="p-3 text-center">{dn.totalVolumeCbm ?? 0} m³</td>
                  <td className="p-3 text-right font-mono">{(dn.totalWeightKg ?? 0).toLocaleString()} kg</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Special Instructions */}
          {dn.specialInstructions && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-200">Special Handling Instructions:</span>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">{dn.specialInstructions}</p>
            </div>
          )}

          {/* Official SO & DN Dual Barcode Slip Verification */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>Trip Dispatch Barcodes (SO & DN Codes)</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">ISO/IEC 15417 Code 128</span>
            </div>
            <SlipBarcodePair
              soNumber={dn.soNumber || (trip.dnNumber ? `9100${trip.dnNumber.slice(-6)}` : '9100042352')}
              dnNumber={dn.dnNumber}
              itemSku={dn.items?.[0]?.sku}
            />
          </div>

          {/* Proof of Delivery / Signature Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Consignee Proof of Delivery (POD)</span>
              </div>
              {trip.status === 'delivered' ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Confirmed Delivered & Signed
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Signee: <span className="font-semibold">{dn.receiverSignature || 'Authorized Receiving Clerk'}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Timestamp: {dn.actualDelivery || dn.podSignedAt || 'Completed'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCompleteDelivery} className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">
                    Cargo in transit. Sign below upon receiving goods:
                  </span>
                  <input
                    type="text"
                    placeholder="Receiver Full Name / ID..."
                    value={signatureName ?? ""}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={signSubmitting}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Sign & Complete Delivery
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-4 text-right">
              <div className="inline-block p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                <div className="font-mono text-[10px] text-slate-400">BARCODE VERIFICATION</div>
                <div className="text-xl font-mono tracking-widest font-bold text-slate-800 dark:text-slate-200">
                  *{dn.dnNumber.replace(/[^A-Z0-9]/g, '')}*
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                LogiFlow Cloud Logistics System • Generated electronically and legally binding under KSA transport laws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

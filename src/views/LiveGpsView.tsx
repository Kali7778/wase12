import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Navigation,
  Truck,
  MapPin,
  Play,
  Pause,
  Zap,
  Thermometer,
  Gauge,
  Phone,
  FileText,
  Shield,
  Layers,
  Compass,
  AlertCircle
} from 'lucide-react';

export const LiveGpsView: React.FC = () => {
  const { trips, vehicles, setSelectedTripForDn } = useApp();
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || '');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [truckPositions, setTruckPositions] = useState<Record<string, number>>({});

  // Initialize progress
  useEffect(() => {
    const initial: Record<string, number> = {};
    trips.forEach((t) => {
      initial[t.id] = t.progressPercent || 30;
    });
    setTruckPositions(initial);
  }, []);

  // Animation ticker for active trips
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTruckPositions((prev) => {
        const next = { ...prev };
        trips.forEach((t) => {
          if (t.status === 'in_transit') {
            const current = next[t.id] ?? t.progressPercent;
            const inc = (0.5 * simSpeed);
            next[t.id] = current >= 100 ? 0 : current + inc;
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, trips]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const selectedVehicle = vehicles.find((v) => v.id === selectedTrip?.vehicleId) || vehicles[0];

  // Cities on Map (Saudi Arabia Projection Coordinates on 800x500 SVG Canvas)
  const mapNodes: Record<string, { x: number; y: number; name: string; nameAr: string }> = {
    Riyadh: { x: 440, y: 260, name: 'Riyadh Hub', nameAr: 'الرياض' },
    Jeddah: { x: 190, y: 310, name: 'Jeddah Seaport', nameAr: 'جدة' },
    Dammam: { x: 560, y: 220, name: 'Dammam Port', nameAr: 'الدمام' },
    Medina: { x: 230, y: 230, name: 'Medina Depot', nameAr: 'المدينة' },
    Buraidah: { x: 380, y: 190, name: 'Qassim Hub', nameAr: 'القصيم' },
    Tabuk: { x: 140, y: 110, name: 'Tabuk North', nameAr: 'تبوك' },
    Abha: { x: 270, y: 440, name: 'Abha South', nameAr: 'أبها' },
  };

  return (
    <div id="live-gps-view" className="space-y-6">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400">TELEMETRY STREAM: CONNECTED</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Live Fleet GPS & Telemetry Radar</h1>
          <p className="text-xs text-slate-400">
            Real-time highway coordinates, electronic seal status, Reefer temperature sensors, and geofencing.
          </p>
        </div>

        {/* Simulation Speed Controls */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isSimulating ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulating ? 'Pause Radar' : 'Resume Radar'}</span>
          </button>

          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                simSpeed === spd
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Live Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Radar Map (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-mono flex items-center gap-1.5 text-slate-300">
              <Compass className="w-4 h-4 text-blue-400" /> KSA NATIONAL ARTERY CORRIDOR
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {trips.filter((t) => t.status === 'in_transit').length} TRUCKS LIVE ON ARTERIAL HIGHWAYS
            </span>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full aspect-[16/10] my-2">
            <svg viewBox="0 0 700 480" className="w-full h-full select-none">
              {/* Radar Grid Lines */}
              <defs>
                <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                </pattern>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect width="700" height="480" fill="url(#radarGrid)" />

              {/* Highway Inter-City Corridor Lines */}
              {/* Riyadh to Jeddah (Route 40) */}
              <line x1="440" y1="260" x2="190" y2="310" stroke="#334155" strokeWidth="3" strokeDasharray="4 4" />
              {/* Riyadh to Dammam (Route 80) */}
              <line x1="440" y1="260" x2="560" y2="220" stroke="#334155" strokeWidth="3" strokeDasharray="4 4" />
              {/* Riyadh to Qassim (Route 65) */}
              <line x1="440" y1="260" x2="380" y2="190" stroke="#334155" strokeWidth="3" strokeDasharray="4 4" />
              {/* Qassim to Medina */}
              <line x1="380" y1="190" x2="230" y2="230" stroke="#334155" strokeWidth="2.5" strokeDasharray="4 4" />
              {/* Medina to Jeddah */}
              <line x1="230" y1="230" x2="190" y2="310" stroke="#334155" strokeWidth="2.5" strokeDasharray="4 4" />
              {/* Qassim to Tabuk */}
              <line x1="380" y1="190" x2="140" y2="110" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              {/* Jeddah to Abha */}
              <line x1="190" y1="310" x2="270" y2="440" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

              {/* Major Hub Markers */}
              {Object.entries(mapNodes).map(([city, node]) => (
                <g key={city} className="cursor-pointer">
                  <circle cx={node.x} cy={node.y} r="7" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
                  <circle cx={node.x} cy={node.y} r="3" fill="#60a5fa" />
                  <text
                    x={node.x + 10}
                    y={node.y + 4}
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {node.name}
                  </text>
                  <text
                    x={node.x + 10}
                    y={node.y + 16}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="sans-serif"
                  >
                    {node.nameAr}
                  </text>
                </g>
              ))}

              {/* Active Moving Truck Markers on Routes */}
              {trips.map((trip) => {
                const originCity = trip.origin.city;
                const destCity = trip.destination.city;
                const originCoord = mapNodes[originCity] || mapNodes.Riyadh;
                const destCoord = mapNodes[destCity] || mapNodes.Jeddah;

                const progress = (truckPositions[trip.id] ?? trip.progressPercent) / 100;
                const curX = originCoord.x + (destCoord.x - originCoord.x) * progress;
                const curY = originCoord.y + (destCoord.y - originCoord.y) * progress;

                const isSelected = trip.id === selectedTripId;

                return (
                  <g
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className="cursor-pointer transition-transform duration-300"
                  >
                    {/* Pulsing selection aura */}
                    {isSelected && (
                      <circle cx={curX} cy={curY} r="18" fill="#3b82f6" opacity="0.3" className="animate-ping" />
                    )}

                    <circle
                      cx={curX}
                      cy={curY}
                      r="10"
                      fill={isSelected ? '#3b82f6' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Truck icon / label */}
                    <text
                      x={curX}
                      y={curY - 14}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="bg-slate-900"
                    >
                      {trip.vehiclePlate}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Route 40 (East-West Highway) • Route 65 (North-South Trans-Arabian)</span>
            <span className="text-blue-400 font-mono">Click any truck to inspect live telemetry</span>
          </div>
        </div>

        {/* Right Side: Selected Vehicle Live Telemetry Gauge Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedTrip ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {selectedTrip.tripNumber}
                  </span>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {selectedTrip.vehiclePlate}
                  </h3>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedTrip.status.replace('_', ' ')}
                </span>
              </div>

              {/* Driver & Consignee */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Driver in Command:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTrip.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Number:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTrip.driverPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consignee:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                    {selectedTrip.customerName}
                  </span>
                </div>
              </div>

              {/* Telemetry Gauges Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Speed */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <Gauge className="w-4 h-4 text-blue-500" />
                    <span>Speed</span>
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {selectedTrip.currentSpeedKmH || 86} <span className="text-xs font-normal text-slate-400">km/h</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Highway Compliant</span>
                </div>

                {/* Reefer Temperature */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <Thermometer className="w-4 h-4 text-emerald-500" />
                    <span>Reefer Cargo</span>
                  </div>
                  <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {selectedTrip.temperatureActual ? `+${selectedTrip.temperatureActual}°C` : '+4.2°C'}
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold">Set: +2°C to +8°C</span>
                </div>
              </div>

              {/* Route Progress Visual */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>{selectedTrip.origin.city}</span>
                  <span>{selectedTrip.destination.city}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${truckPositions[selectedTrip.id] ?? selectedTrip.progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Progress: {Math.round(truckPositions[selectedTrip.id] ?? selectedTrip.progressPercent)}%</span>
                  <span>ETA: {selectedTrip.estimatedArrivalTime.substring(11)}</span>
                </div>
              </div>

              {/* Delivery Note Action Button */}
              <button
                onClick={() => setSelectedTripForDn(selectedTrip)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Open Delivery Note ({selectedTrip.deliveryNote.dnNumber})</span>
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">Select a truck from the map</div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileStack, Loader2, RefreshCw, Stamp, Truck } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import type { DeliveryNoteWithLines } from '../models/deliveryNote';

/**
 * The driver's own delivery notes.
 *
 * Shows only the slips the GM has handed to this driver. The copy offered here
 * is the stamped one, because that is the document carrying the approval the
 * driver may be asked to show.
 */
export const DriverSlipsView: React.FC = () => {
  const { profile } = useAuth();
  const [slips, setSlips] = useState<DeliveryNoteWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      setSlips(await deliveryNoteService.listForDriver(profile.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your delivery notes');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openSlip = async (slip: DeliveryNoteWithLines) => {
    const path = slip.stampedPdfPath ?? slip.pdfStoragePath;
    if (!path) return;
    setOpeningId(slip.id);
    const url = await deliveryNoteService.getSignedUrl(path);
    setOpeningId(null);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Deliveries"
        description="Delivery notes assigned to you by the General Manager."
        stats={[{ label: 'assigned', value: slips.length }]}
        actions={
          <Button icon={RefreshCw} size="sm" onClick={refresh} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="px-3 py-2 rounded-panel bg-risk-soft text-risk text-tiny">{error}</div>
      )}

      <Panel flush>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          </div>
        ) : slips.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No deliveries assigned"
            description="When the General Manager assigns a delivery note to you, it will appear here."
          />
        ) : (
          <ul className="divide-line">
            {slips.map((slip) => {
              const line = slip.lines[0];
              return (
                <li
                  key={slip.id}
                  className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center hover:bg-raised transition-colors"
                >
                  <span className="w-9 h-9 rounded-control bg-sunken border border-line flex items-center justify-center shrink-0">
                    <FileStack className="w-4 h-4 text-ink-faint" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-tiny font-semibold text-ink" data-numeric>
                        DN {slip.dnNumber}
                      </span>
                      {slip.stampedPdfPath && (
                        <Badge tone="ok" icon={Stamp}>
                          Approved
                        </Badge>
                      )}
                    </div>
                    <p className="text-micro text-ink-faint mt-0.5 truncate">
                      {line ? line.itemDescription : 'No item'}
                      {slip.shipFrom && ` · from ${slip.shipFrom}`}
                    </p>
                    {slip.driverSentAt && (
                      <p className="text-micro text-ink-faint mt-0.5">
                        Assigned {new Date(slip.driverSentAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 shrink-0 sm:px-4">
                    <div>
                      <p className="text-micro text-ink-faint">Quantity</p>
                      <p className="text-tiny font-semibold text-ink" data-numeric>
                        {line ? `${line.pdfQty} ${line.uom}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-micro text-ink-faint">SO</p>
                      <p className="text-tiny text-ink-soft" data-numeric>
                        {slip.soNumber}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    icon={Download}
                    loading={openingId === slip.id}
                    disabled={!slip.stampedPdfPath && !slip.pdfStoragePath}
                    onClick={() => openSlip(slip)}
                  >
                    Open slip
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};

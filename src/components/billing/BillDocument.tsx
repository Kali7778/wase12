import React from 'react';
import { formatSar } from '../../models/pricing';
import { TERMS_LABEL } from '../../models/deliveryNote';
import { billState, type BillWithLines } from '../../models/billing';

/**
 * The bill as it goes on paper: A4, English with Arabic beside it (D61).
 *
 * Everything printed comes from the bill itself — the company details were
 * copied onto it when it was written — so a bill reprinted next year looks
 * exactly as it did on the day. Paper is white whatever the screen theme.
 *
 * The labels are fixed bilingual print, not interface text: the same sheet
 * goes to every customer whichever language the office is using.
 */
const L = {
  invoice: ['Invoice', 'فاتورة'],
  number: ['Invoice no.', 'رقم الفاتورة'],
  date: ['Date', 'التاريخ'],
  billTo: ['Bill to', 'العميل'],
  phone: ['Phone', 'الهاتف'],
  terms: ['Terms', 'طريقة الدفع'],
  slip: ['Delivery note', 'إشعار التسليم'],
  cr: ['CR', 'س.ت'],
  vat: ['VAT no.', 'الرقم الضريبي'],
  desc: ['Description', 'الوصف'],
  qty: ['Qty', 'الكمية'],
  unit: ['Unit', 'الوحدة'],
  price: ['Unit price', 'سعر الوحدة'],
  amount: ['Amount (SAR)', 'المبلغ (ريال)'],
  goods: ['Goods', 'البضاعة'],
  services: ['Services', 'الخدمات'],
  total: ['Total (SAR)', 'الإجمالي (ريال)'],
  paid: ['Paid', 'مدفوع'],
  unpaid: ['Unpaid — on account', 'غير مدفوع — على الحساب'],
  cancelled: ['Cancelled', 'ملغاة'],
  preparedBy: ['Prepared by', 'أعدها'],
} as const;

const TERMS_AR = { cash: 'نقدي', weekly: 'حساب أسبوعي' } as const;

const Both: React.FC<{ label: readonly [string, string]; className?: string }> = ({ label, className = '' }) => (
  <span className={className}>
    {label[0]} <span dir="rtl" lang="ar">{label[1]}</span>
  </span>
);

interface BillDocumentProps {
  bill: BillWithLines;
  logoUrl: string | null;
}

export const BillDocument: React.FC<BillDocumentProps> = ({ bill, logoUrl }) => {
  const c = bill.company;
  const state = billState(bill);
  const goods = bill.lines.filter((l) => l.kind === 'goods');
  const services = bill.lines.filter((l) => l.kind !== 'goods');
  const created = new Date(bill.createdAt);

  return (
    <article className="bill-sheet relative bg-white text-black mx-auto" aria-label={`Bill ${bill.billNumber}`}>
      {state === 'cancelled' && (
        <div className="bill-void" aria-hidden>
          {L.cancelled[0].toUpperCase()}
        </div>
      )}

      {/* The company */}
      <div className="flex items-start justify-between gap-6 pb-4 border-b-2 border-black">
        <div className="flex items-start gap-3 min-w-0">
          {logoUrl && <img src={logoUrl} alt="" className="h-16 w-auto max-w-[9rem] object-contain" />}
          <div className="min-w-0">
            <p className="text-[17px] font-bold leading-tight">{c.name_en}</p>
            {c.address_en && <p className="text-[11px] mt-1">{c.address_en}</p>}
            {c.phone && <p className="text-[11px]">{c.phone}</p>}
          </div>
        </div>
        <div className="text-right min-w-0" dir="rtl" lang="ar">
          {c.name_ar && <p className="text-[17px] font-bold leading-tight">{c.name_ar}</p>}
          {c.address_ar && <p className="text-[11px] mt-1">{c.address_ar}</p>}
        </div>
      </div>

      {(c.cr_number || c.vat_number) && (
        <p className="flex flex-wrap gap-x-6 text-[11px] py-2 border-b border-neutral-300">
          {c.cr_number && (
            <span>
              <Both label={L.cr} />: <span className="tabular-nums">{c.cr_number}</span>
            </span>
          )}
          {c.vat_number && (
            <span>
              <Both label={L.vat} />: <span className="tabular-nums">{c.vat_number}</span>
            </span>
          )}
        </p>
      )}

      {/* The bill */}
      <section className="flex items-end justify-between gap-6 mt-5">
        <h1 className="text-[26px] font-bold tracking-wide leading-none">
          {L.invoice[0].toUpperCase()}{' '}
          <span dir="rtl" lang="ar" className="font-semibold">
            {L.invoice[1]}
          </span>
        </h1>
        <dl className="text-[12px] grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-right">
          <dt className="text-neutral-600"><Both label={L.number} /></dt>
          <dd className="font-bold tabular-nums">{bill.billNumber}</dd>
          <dt className="text-neutral-600"><Both label={L.date} /></dt>
          <dd className="tabular-nums">
            {created.toLocaleDateString('en-GB')} {created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </dd>
          {bill.dnNumber && (
            <>
              <dt className="text-neutral-600"><Both label={L.slip} /></dt>
              <dd className="tabular-nums">{bill.dnNumber}</dd>
            </>
          )}
        </dl>
      </section>

      {/* Who it is for */}
      <section className="mt-5 p-3 border border-neutral-400 rounded-sm text-[12px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        <span className="text-neutral-600"><Both label={L.billTo} /></span>
        <span>
          <span className="font-bold">{bill.customerName}</span>
          {bill.customerNameAr && (
            <span dir="rtl" lang="ar" className="ml-3 font-semibold">
              {bill.customerNameAr}
            </span>
          )}
        </span>
        {bill.customerPhone && (
          <>
            <span className="text-neutral-600"><Both label={L.phone} /></span>
            <span className="tabular-nums">{bill.customerPhone}</span>
          </>
        )}
        <span className="text-neutral-600"><Both label={L.terms} /></span>
        <span>
          {TERMS_LABEL[bill.customerTerms]}{' '}
          <span dir="rtl" lang="ar">{TERMS_AR[bill.customerTerms]}</span>
        </span>
      </section>

      {/* What was sold */}
      <table className="w-full mt-5 text-[12px] border-collapse">
        <thead>
          <tr className="border-y-2 border-black text-left">
            <th className="py-1.5 pr-2 w-8">#</th>
            <th className="py-1.5 pr-2"><Both label={L.desc} /></th>
            <th className="py-1.5 px-2 text-right"><Both label={L.qty} /></th>
            <th className="py-1.5 px-2"><Both label={L.unit} /></th>
            <th className="py-1.5 px-2 text-right"><Both label={L.price} /></th>
            <th className="py-1.5 pl-2 text-right"><Both label={L.amount} /></th>
          </tr>
        </thead>
        <tbody>
          {goods.map((l, i) => (
            <tr key={l.lineNo} className="border-b border-neutral-300 align-top">
              <td className="py-1.5 pr-2 tabular-nums">{i + 1}</td>
              <td className="py-1.5 pr-2">
                {l.description}
                {l.itemNumber && <span className="block text-[10px] text-neutral-600 tabular-nums">{l.itemNumber}</span>}
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums">{l.qty.toLocaleString('en-US')}</td>
              <td className="py-1.5 px-2">{l.uom}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">{formatSar(l.unitPrice)}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums">{formatSar(l.amount)}</td>
            </tr>
          ))}
          {services.map((l) => (
            <tr key={l.lineNo} className="border-b border-neutral-300">
              <td className="py-1.5 pr-2" />
              <td className="py-1.5 pr-2" colSpan={4}>
                {l.description}{' '}
                <span dir="rtl" lang="ar">{l.kind === 'transport' ? 'النقل' : 'العمالة'}</span>
              </td>
              <td className="py-1.5 pl-2 text-right tabular-nums">{formatSar(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals — every charge is already its own line above, so only the
          goods subtotal (when there are services beside it) and the total. */}
      <section className="flex justify-end mt-3">
        <dl className="w-72 text-[12px] grid grid-cols-[1fr_auto] gap-y-1">
          {services.length > 0 && (
            <>
              <dt><Both label={L.goods} /></dt>
              <dd className="text-right tabular-nums">{formatSar(bill.goodsTotal)}</dd>
              <dt><Both label={L.services} /></dt>
              <dd className="text-right tabular-nums">{formatSar(bill.servicesTotal)}</dd>
            </>
          )}
          <dt className="font-bold text-[14px] border-t-2 border-black pt-1"><Both label={L.total} /></dt>
          <dd className="font-bold text-[14px] text-right tabular-nums border-t-2 border-black pt-1">
            {formatSar(bill.total)}
          </dd>
        </dl>
      </section>

      {/* Standing */}
      <section className="mt-6 flex items-start justify-between gap-6">
        <div className="text-[11px] min-w-0">
          {bill.note && <p className="mb-2">{bill.note}</p>}
          {bill.createdByName && (
            <p className="text-neutral-600">
              <Both label={L.preparedBy} />: {bill.createdByName}
            </p>
          )}
          {state === 'cancelled' && (
            <p className="mt-2 font-semibold">
              <Both label={L.cancelled} />
              {bill.cancelledAt ? ` ${new Date(bill.cancelledAt).toLocaleDateString('en-GB')}` : ''}
              {bill.cancelReason ? ` — ${bill.cancelReason}` : ''}
            </p>
          )}
        </div>
        {state !== 'cancelled' && (
          <p className={`bill-stamp ${state === 'paid' ? 'bill-stamp-paid' : ''}`}>
            {state === 'paid' ? (
              <Both label={L.paid} />
            ) : (
              <Both label={L.unpaid} />
            )}
          </p>
        )}
      </section>
    </article>
  );
};

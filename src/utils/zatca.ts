import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface DecodedZatcaTlv {
  isValid: boolean;
  rawBase64: string;
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalAmountWithVat: number;
  vatAmount: number;
  invoiceHash?: string;
  digitalSignature?: string;
  publicKey?: string;
  tags: {
    tag: number;
    tagMeaning: string;
    value: string;
    rawHex: string;
    length: number;
  }[];
  validationErrors: string[];
}

/**
 * Standard ZATCA E-Invoicing Phase 1 & Phase 2 QR Code TLV Generator
 * Encodes:
 * Tag 1: Seller's Name (اسم المورد)
 * Tag 2: VAT Registration Number (الرقم الضريبي للمنشأة 15 رقماً)
 * Tag 3: Time stamp in ISO 8601 (وقت وتاريخ إصدار الفاتورة)
 * Tag 4: Invoice Total with VAT (إجمالي الفاتورة شامل الضريبة)
 * Tag 5: VAT Total (مجموع ضريبة القيمة المضافة)
 * Tag 6 (Phase 2): SHA-256 Hash of XML invoice (تجزئة الفاتورة)
 * Tag 7 (Phase 2): ECDSA Digital Signature (التوقيع الرقمي)
 * Tag 8 (Phase 2): Public Key (المفتاح العام للتشفير)
 */
export function generateZatcaTlvBase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmountWithVat: number | string,
  vatAmount: number | string,
  invoiceHash?: string,
  digitalSignature?: string,
  publicKey?: string
): string {
  const encoder = new TextEncoder();

  const toTlv = (tag: number, value: string): Uint8Array => {
    const valBytes = encoder.encode(value);
    const tagByte = tag;
    const lenByte = valBytes.length;
    const result = new Uint8Array(2 + lenByte);
    result[0] = tagByte;
    result[1] = lenByte;
    result.set(valBytes, 2);
    return result;
  };

  const tag1 = toTlv(1, sellerName || 'LogiFlow Transport & Logistics Co.');
  const tag2 = toTlv(2, vatNumber || '300881928300003');
  const tag3 = toTlv(3, timestamp || new Date().toISOString());
  const tag4 = toTlv(4, typeof totalAmountWithVat === 'number' ? totalAmountWithVat.toFixed(2) : String(totalAmountWithVat));
  const tag5 = toTlv(5, typeof vatAmount === 'number' ? vatAmount.toFixed(2) : String(vatAmount));

  const tagArrays = [tag1, tag2, tag3, tag4, tag5];

  if (invoiceHash) {
    tagArrays.push(toTlv(6, invoiceHash));
  }
  if (digitalSignature) {
    tagArrays.push(toTlv(7, digitalSignature));
  }
  if (publicKey) {
    tagArrays.push(toTlv(8, publicKey));
  }

  const totalLength = tagArrays.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  tagArrays.forEach((arr) => {
    combined.set(arr, offset);
    offset += arr.length;
  });

  // Convert Uint8Array to binary string, then base64
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export const generateInvoiceTlvBase64 = generateZatcaTlvBase64;
export const generateTaxInvoiceQrBase64 = generateZatcaTlvBase64;

/**
 * Decodes a ZATCA Base64 TLV string into human-readable tags and values
 */
export function decodeZatcaTlvBase64(base64String: string): DecodedZatcaTlv {
  const result: DecodedZatcaTlv = {
    isValid: false,
    rawBase64: base64String.trim(),
    sellerName: '',
    vatNumber: '',
    timestamp: '',
    totalAmountWithVat: 0,
    vatAmount: 0,
    tags: [],
    validationErrors: [],
  };

  try {
    const cleanB64 = base64String.trim().replace(/\s+/g, '');
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoder = new TextDecoder('utf-8');
    let idx = 0;

    const tagMeanings: Record<number, string> = {
      1: "Seller's Name (اسم المورد)",
      2: "Seller's VAT Number (الرقم الضريبي للمنشأة)",
      3: "Invoice Timestamp (وقت وتاريخ الفاتورة)",
      4: "Invoice Total with VAT (إجمالي الفاتورة شامل الضريبة)",
      5: "VAT Total Amount (مجموع ضريبة القيمة المضافة)",
      6: "Invoice Hash SHA-256 (تجزئة الفاتورة)",
      7: "ECDSA Digital Signature (التوقيع الرقمي)",
      8: "Public Key (المفتاح العام)",
    };

    while (idx < bytes.length) {
      if (idx + 2 > bytes.length) {
        result.validationErrors.push(`Truncated TLV header at byte index ${idx}`);
        break;
      }

      const tag = bytes[idx];
      const length = bytes[idx + 1];
      const valStart = idx + 2;
      const valEnd = valStart + length;

      if (valEnd > bytes.length) {
        result.validationErrors.push(`TLV Tag ${tag} declared length ${length} exceeds remaining buffer bytes`);
        break;
      }

      const valBytes = bytes.slice(valStart, valEnd);
      let stringVal = '';
      try {
        stringVal = decoder.decode(valBytes);
      } catch {
        stringVal = Array.from(valBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      }

      const rawHex = Array.from(valBytes).map((b) => b.toString(16).padStart(2, '0')).join(' ');

      result.tags.push({
        tag,
        tagMeaning: tagMeanings[tag] || `Custom Tag ${tag}`,
        value: stringVal,
        rawHex,
        length,
      });

      if (tag === 1) result.sellerName = stringVal;
      if (tag === 2) result.vatNumber = stringVal;
      if (tag === 3) result.timestamp = stringVal;
      if (tag === 4) result.totalAmountWithVat = parseFloat(stringVal) || 0;
      if (tag === 5) result.vatAmount = parseFloat(stringVal) || 0;
      if (tag === 6) result.invoiceHash = stringVal;
      if (tag === 7) result.digitalSignature = stringVal;
      if (tag === 8) result.publicKey = stringVal;

      idx = valEnd;
    }

    // Validation checks
    if (!result.sellerName) {
      result.validationErrors.push('Missing Tag 1 (Seller Name)');
    }
    if (!result.vatNumber) {
      result.validationErrors.push('Missing Tag 2 (VAT Number)');
    } else if (!/^\d{15}$/.test(result.vatNumber)) {
      result.validationErrors.push(`VAT Number "${result.vatNumber}" should be exactly 15 digits according to ZATCA rules`);
    }
    if (!result.timestamp) {
      result.validationErrors.push('Missing Tag 3 (Timestamp)');
    }
    if (result.totalAmountWithVat <= 0) {
      result.validationErrors.push('Missing or invalid Tag 4 (Total Amount with VAT)');
    }

    result.isValid = result.validationErrors.length === 0 && result.tags.length >= 4;
  } catch (err: any) {
    result.validationErrors.push(`Base64 decode error: ${err.message || 'Invalid base64 encoding'}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Scan and extract QR Code from an HTML Image or File
 */
export async function decodeQrFromImage(imageSrc: string | File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      resolve(null);
    };

    if (typeof imageSrc === 'string') {
      img.src = imageSrc;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(imageSrc);
    }
  });
}

/**
 * Scan video element frame for QR code using jsQR
 */
export function scanQrFromVideoFrame(videoElement: HTMLVideoElement): string | null {
  if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });

  return code ? code.data : null;
}

/**
 * Asynchronously renders a Data URL image from the Base64 TLV payload
 */
export async function generateQrDataUrl(tlvPayload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(tlvPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code Data URL', err);
    return '';
  }
}

/**
 * Generate standard compliant UBL 2.1 invoice XML string preview
 */
export function generateZatcaUblXml(invoice: {
  invoiceNumber: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  sellerName: string;
  sellerVat: string;
  sellerCr: string;
  buyerName: string;
  buyerVat?: string;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  currency: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
    <cbc:UUID>${invoice.uuid}</cbc:UUID>
    <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${invoice.issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>${invoice.currency}</cbc:TaxCurrencyCode>
    
    <!-- Seller Party Info -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${invoice.sellerCr}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${invoice.sellerName}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.sellerVat}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Buyer Party Info -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${invoice.buyerName}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.buyerVat || '300000000000003'}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Monetary Totals -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.grandTotal.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;
}

/**
 * Exports invoice list to CSV / Excel spreadsheet format
 */
export function exportInvoicesToCsv(invoices: any[]): void {
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Customer / Buyer',
    'Buyer VAT #',
    'DN / Load Number',
    'Product / Service',
    'Quantity',
    'Unit Price (SAR)',
    'Discount (SAR)',
    'Subtotal (SAR)',
    'VAT Rate (%)',
    'VAT Amount (SAR)',
    'Grand Total (SAR)',
    'Payment Status',
    'Paid Amount (SAR)',
    'Outstanding Due (SAR)',
    'ZATCA Status',
  ];

  const rows = invoices.map((inv) => {
    const item = inv.items?.[0] || {};
    return [
      `"${inv.invoiceNumber || ''}"`,
      `"${inv.issueDate || inv.invoiceDate || ''}"`,
      `"${(inv.customerName || inv.buyerName || '').replace(/"/g, '""')}"`,
      `"${inv.customerVatNumber || inv.buyerVatNumber || ''}"`,
      `"${inv.dnNumber || inv.tripNumber || ''}"`,
      `"${(inv.productService || item.description || '').replace(/"/g, '""')}"`,
      inv.quantity || item.quantity || 1,
      inv.unitPrice || item.unitPrice || 0,
      inv.discountTotal || item.discount || 0,
      inv.subtotal || 0,
      ((inv.vatRate ?? 0.15) * 100).toFixed(0) + '%',
      inv.vatAmount || inv.totalVat || 0,
      inv.grandTotal || inv.totalAmount || 0,
      `"${(inv.paymentStatus || (inv.isPaid ? 'PAID' : 'UNPAID')).toUpperCase()}"`,
      inv.paidAmount || (inv.isPaid ? inv.grandTotal : 0) || 0,
      inv.outstandingAmount || (inv.isPaid ? 0 : inv.grandTotal) || 0,
      `"${(inv.status || 'SUBMITTED').toUpperCase()}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ZATCA_Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

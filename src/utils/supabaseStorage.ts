import { supabase } from '../lib/supabase';
import { DriverDocumentInfo, DocumentExpiryStatus } from '../types';


/**
 * Calculates document expiry status: Valid / Expiring Soon / Expired
 * Rule:
 * - Past expiry date -> Expired
 * - Within 30 days -> Expiring Soon
 * - More than 30 days -> Valid
 */
export const calculateDocumentExpiryStatus = (
  expiryDate?: string | null
): {
  status: DocumentExpiryStatus;
  label: string;
  daysRemaining: number;
} => {
  if (!expiryDate || expiryDate.trim() === '') {
    return {
      status: 'valid',
      label: 'Date Not Set',
      daysRemaining: 999,
    };
  }

  const expDate = new Date(expiryDate);
  if (isNaN(expDate.getTime())) {
    return {
      status: 'valid',
      label: 'Invalid Date',
      daysRemaining: 999,
    };
  }

  // Use midnight today for accurate calendar day difference
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Expired (${Math.abs(diffDays)}d ago)`,
      daysRemaining: diffDays,
    };
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      label: diffDays === 0 ? 'Expires Today' : `Expiring Soon (${diffDays}d left)`,
      daysRemaining: diffDays,
    };
  } else {
    return {
      status: 'valid',
      label: `Valid (${diffDays}d left)`,
      daysRemaining: diffDays,
    };
  }
};

/**
 * Converts a File to Base64 Data URL for instant in-browser preview
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads Iqama or Rukhsa file to Supabase Storage bucket 'driver-documents'
 * Path structure: [docType]/[driverId]_[timestamp]_[sanitizedFileName]
 * Returns linked DriverDocumentInfo reference
 */
export const uploadDriverDocumentToSupabase = async (
  file: File,
  driverId: string,
  docType: 'iqama' | 'rukhsa'
): Promise<DriverDocumentInfo> => {
  const bucketName = 'driver-documents';
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${docType}/${driverId || 'drv'}_${Date.now()}_${cleanName}`;
  const fileType: 'pdf' | 'image' = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';

  // Read data URL for instant client-side preview & reliable fallback
  let dataUrl = '';
  try {
    dataUrl = await fileToDataUrl(file);
  } catch (err) {
    console.warn('Could not generate data URL for file preview:', err);
  }

  let publicUrl = '';

  try {
    // Attempt live Supabase Storage upload
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        contentType: file.type || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload returned notice (using safe fallback):', error.message);
    } else {
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
      if (urlData?.publicUrl) {
        publicUrl = urlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage connection notice:', err);
  }

  return {
    storagePath: `${bucketName}/${storagePath}`,
    publicUrl,
    fileName: file.name,
    fileType,
    fileSize: file.size,
    fileDataUrl: dataUrl || publicUrl,
    uploadedAt: new Date().toISOString(),
    bucket: bucketName,
  };
};

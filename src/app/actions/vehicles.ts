'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { deleteOldStorageFile, moveStorageFile } from '@/app/actions/upload';
import { logActivity } from '@/app/actions/activity';
import { buildDiff } from '@/lib/diff';
import { Vehicle } from '@/types';
import { DASHBOARD_TAG, VEHICLES_TAG } from '@/lib/cache-tags';

const VEHICLE_FIELDS: Record<string, string> = {
  nickname: 'Nickname', brand: 'Brand', model: 'Model', year: 'Year', color: 'Color',
  type: 'Type', status: 'Status', current_km: 'Current KM',
  next_service_km: 'Next Service KM', daily_rate: 'Daily Rate', notes: 'Notes',
  registration_document_url: 'Registration Document', bank: 'Bank', account_number: 'Account Number', branch: 'Branch',
};

async function _fetchVehicles(params?: {
  search?: string;
  type?: string;
  status?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = supabaseAdmin
    .from('vehicles')
    .select('id, reg_number, brand, model, year, type, source, daily_rate, current_km, next_service_km, next_service_date, status, created_at', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (params?.search) {
    query = query.or(`reg_number.ilike.%${params.search}%,brand.ilike.%${params.search}%,model.ilike.%${params.search}%`);
  }
  if (params?.type && params.type !== 'all') query = query.eq('type', params.type);
  if (params?.status && params.status !== 'all') query = query.eq('status', params.status);
  if (params?.source && params.source !== 'all') query = query.eq('source', params.source);

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data: data as Vehicle[], count: count ?? 0 };
}

const _cachedGetVehicles = unstable_cache(
  _fetchVehicles,
  ['vehicles-list'],
  { tags: [VEHICLES_TAG], revalidate: false },
);

export async function getVehicles(params?: {
  search?: string;
  type?: string;
  status?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  return _cachedGetVehicles(params);
}

async function _fetchVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*, supplier:suppliers(id, name, bank, account_number, branch), company:companies(id, name), photos:vehicle_photos(*), rate_tiers(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Vehicle;
}

const _cachedGetVehicleById = unstable_cache(
  _fetchVehicleById,
  ['vehicle-by-id'],
  { tags: [VEHICLES_TAG], revalidate: false },
);

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  await requireAuth();
  return _cachedGetVehicleById(id);
}

function parseVehicleFields(formData: FormData) {
  return {
    reg_number: (formData.get('reg_number') as string)?.toUpperCase(),
    brand: formData.get('brand') as string,
    model: formData.get('model') as string,
    nickname: formData.get('nickname') as string || null,
    year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
    color: formData.get('color') as string || null,
    type: formData.get('type') as string,
    fuel_type: formData.get('fuel_type') as string || null,
    transmission: formData.get('transmission') as string || null,
    source: formData.get('source') as string,
    supplier_id: formData.get('supplier_id') as string || null,
    company_id: formData.get('company_id') as string || null,
    current_km: parseInt(formData.get('current_km') as string) || 0,
    next_service_km: parseInt(formData.get('next_service_km') as string) || 5000,
    next_service_date: formData.get('next_service_date') as string || null,
    last_service_date: formData.get('last_service_date') as string || null,
    last_service_km: parseInt(formData.get('last_service_km') as string) || null,
    insurance_expiry: formData.get('insurance_expiry') as string || null,
    revenue_license_expiry: formData.get('revenue_license_expiry') as string || null,
    eco_test_expiry: formData.get('eco_test_expiry') as string || null,
    agreement_start_date: formData.get('agreement_start_date') as string || null,
    agreement_period: formData.get('agreement_period') as string || null,
    renew_date: formData.get('renew_date') as string || null,
    registration_document_url: (formData.get('registration_document_url') as string) || null,
    registration_document_path: (formData.get('registration_document_path') as string) || null,
    revenue_license_url: (formData.get('revenue_license_url') as string) || null,
    revenue_license_path: (formData.get('revenue_license_path') as string) || null,
    eco_test_url: (formData.get('eco_test_url') as string) || null,
    eco_test_path: (formData.get('eco_test_path') as string) || null,
    insurance_url: (formData.get('insurance_url') as string) || null,
    insurance_path: (formData.get('insurance_path') as string) || null,
    service_tag_url: (formData.get('service_tag_url') as string) || null,
    service_tag_path: (formData.get('service_tag_path') as string) || null,
    monthly_cost: formData.get('monthly_cost') ? parseFloat(formData.get('monthly_cost') as string) : null,
    payment_frequency: (formData.get('payment_frequency') as string) || null,
    payment_days: (formData.get('payment_days') as string) || null,
    notes: formData.get('notes') as string || null,
  };
}

async function organizeNewVehicleDocuments(
  regNumber: string,
  vehicleId: string,
  docData: {
    registration_document_url?: string | null;
    registration_document_path?: string | null;
    revenue_license_url?: string | null;
    revenue_license_path?: string | null;
    eco_test_url?: string | null;
    eco_test_path?: string | null;
    insurance_url?: string | null;
    insurance_path?: string | null;
    service_tag_url?: string | null;
    service_tag_path?: string | null;
  }
) {
  const docTypes = [
    { urlField: 'registration_document_url' as const, pathField: 'registration_document_path' as const, subfolder: 'registration' },
    { urlField: 'revenue_license_url' as const, pathField: 'revenue_license_path' as const, subfolder: 'revenue_license' },
    { urlField: 'eco_test_url' as const, pathField: 'eco_test_path' as const, subfolder: 'eco_test' },
    { urlField: 'insurance_url' as const, pathField: 'insurance_path' as const, subfolder: 'insurance' },
    { urlField: 'service_tag_url' as const, pathField: 'service_tag_path' as const, subfolder: 'service_tag' },
  ];

  const updates: Record<string, string | null> = {};

  for (const { urlField, pathField, subfolder } of docTypes) {
    const oldPath = docData[pathField];
    if (!oldPath || !oldPath.startsWith('vehicles/new/')) continue;

    const filename = oldPath.split('/').pop();
    if (!filename) continue;

    const newPath = `${regNumber}/${subfolder}/${filename}`;

    const result = await moveStorageFile('vehicle-documents', oldPath, newPath);
    if (result.error) {
      console.warn(`Failed to move ${subfolder} document: ${result.error}`);
      continue;
    }

    updates[urlField] = result.url!;
    updates[pathField] = result.path!;
  }

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin.from('vehicles').update(updates).eq('id', vehicleId);
  }
}

export async function createVehicle(formData: FormData) {
  await requireAuth();

  const tiersJson = formData.get('rate_tiers') as string;
  const tiers = tiersJson ? JSON.parse(tiersJson) : [];

  // Use the lowest tier rate (Below 1 Week) as daily_rate fallback
  const dailyRate = tiers.length > 0 ? tiers[0].rate_per_day : 0;

  const vehicleData = {
    ...parseVehicleFields(formData),
    daily_rate: dailyRate,
  };

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .insert(vehicleData)
    .select()
    .single();

  if (error) return { error: error.message };

  // Insert rate tiers
  if (tiers.length > 0) {
    await supabaseAdmin.from('rate_tiers').insert(
      tiers.map((t: { days_from: number; days_to?: number | null; rate_per_day: number; label?: string }) => ({
        vehicle_id: data.id,
        days_from: t.days_from,
        days_to: t.days_to ?? null,
        rate_per_day: t.rate_per_day,
      }))
    );
  }

  // Insert photos if any were uploaded during creation
  const photoUrls = formData.getAll('vehicle_photos_url') as string[];
  const photoPaths = formData.getAll('vehicle_photos_path') as string[];
  if (photoUrls.length > 0 && photoUrls.length === photoPaths.length) {
    const photoInserts = photoUrls.map((url, i) => ({
      vehicle_id: data.id,
      url,
      storage_path: photoPaths[i],
      is_primary: i === 0, // first photo is primary
    }));
    await supabaseAdmin.from('vehicle_photos').insert(photoInserts);
  }

  // Move uploaded documents from temp 'vehicles/new/...' to '{reg_number}/...' structure
  const regNumber = vehicleData.reg_number;
  if (regNumber) {
    await organizeNewVehicleDocuments(regNumber, data.id, vehicleData);
  }

  revalidatePath('/vehicles');
  revalidateTag(VEHICLES_TAG);
  revalidateTag(DASHBOARD_TAG);
  await logActivity({ action: 'created', module: 'Vehicles', entity_id: data.id, entity_label: `${data.brand} ${data.model} (${data.reg_number})` });
  return { data };
}

export async function updateVehicle(id: string, formData: FormData) {
  await requireAuth();

  const tiersJson = formData.get('rate_tiers') as string;
  const tiers = tiersJson ? JSON.parse(tiersJson) : null;

  const vehicleData = {
    ...parseVehicleFields(formData),
    daily_rate: tiers && tiers.length > 0 ? tiers[0].rate_per_day : 0,
  };

  // Fetch current record for diff before updating
  const { data: current } = await supabaseAdmin.from('vehicles')
    .select('nickname, brand, model, year, color, type, status, current_km, next_service_km, daily_rate, notes, reg_number, registration_document_url, registration_document_path, revenue_license_url, eco_test_url, insurance_url, service_tag_url')
    .eq('id', id).single();

  // Clean up old document if changed
  if (current) {
    await Promise.all([
      (vehicleData.registration_document_url !== current.registration_document_url) ? deleteOldStorageFile(current.registration_document_url, vehicleData.registration_document_url ?? null) : Promise.resolve(),
      (vehicleData.revenue_license_url !== current.revenue_license_url) ? deleteOldStorageFile(current.revenue_license_url, vehicleData.revenue_license_url ?? null) : Promise.resolve(),
      (vehicleData.eco_test_url !== current.eco_test_url) ? deleteOldStorageFile(current.eco_test_url, vehicleData.eco_test_url ?? null) : Promise.resolve(),
      (vehicleData.insurance_url !== current.insurance_url) ? deleteOldStorageFile(current.insurance_url, vehicleData.insurance_url ?? null) : Promise.resolve(),
      (vehicleData.service_tag_url !== current.service_tag_url) ? deleteOldStorageFile(current.service_tag_url, vehicleData.service_tag_url ?? null) : Promise.resolve(),
    ]);
  }

  // Remove reg_number from update (shouldn't change)
  const { reg_number, ...updateData } = vehicleData;

  const { error } = await supabaseAdmin.from('vehicles').update(updateData).eq('id', id);
  if (error) return { error: error.message };

  // Update rate tiers
  if (tiers !== null) {
    await supabaseAdmin.from('rate_tiers').delete().eq('vehicle_id', id);
    if (tiers.length > 0) {
      await supabaseAdmin.from('rate_tiers').insert(
        tiers.map((t: { days_from: number; days_to?: number | null; rate_per_day: number }) => ({
          vehicle_id: id,
          days_from: t.days_from,
          days_to: t.days_to ?? null,
          rate_per_day: t.rate_per_day,
        }))
      );
    }
  }

  revalidatePath('/vehicles');
  revalidatePath(`/vehicles/${id}`);
  revalidateTag(VEHICLES_TAG);
  revalidateTag(DASHBOARD_TAG);
  const label = current ? `${current.brand} ${current.model} (${current.reg_number})` : id;
  const diff = current ? buildDiff(current as Record<string, unknown>, updateData as Record<string, unknown>, VEHICLE_FIELDS) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Vehicles', entity_id: id, entity_label: label, ...diff });
  return { success: true };
}

async function deleteStorageFolder(bucket: string, prefix: string) {
  try {
    const allPaths: string[] = [];
    const dirsToProcess = [prefix];

    while (dirsToProcess.length > 0) {
      const dir = dirsToProcess.shift()!;
      const { data } = await supabaseAdmin.storage.from(bucket).list(dir, { limit: 500 });

      if (!data) continue;

      for (const item of data) {
        if (item.metadata) {
          allPaths.push(`${dir}${item.name}`);
        } else {
          dirsToProcess.push(`${dir}${item.name}`);
        }
      }
    }

    if (allPaths.length > 0) {
      await supabaseAdmin.storage.from(bucket).remove(allPaths);
    }
  } catch (e) {
    console.warn(`Failed to clean up storage: ${bucket}/${prefix}`, e);
  }
}

export async function deleteVehicle(id: string) {
  await requireAuth();
  const { data: v } = await supabaseAdmin.from('vehicles')
    .select('brand, model, reg_number, registration_document_path, revenue_license_path, eco_test_path, insurance_path, service_tag_path')
    .eq('id', id).single();
  const label = v ? `${v.brand} ${v.model} (${v.reg_number})` : id;

  const { count } = await supabaseAdmin.from('rentals').select('*', { count: 'exact', head: true }).eq('vehicle_id', id);

  if (count === 0) {
    // Collect all storage paths to delete
    const storagePaths: { bucket: string; path: string }[] = [];

    // Document paths from vehicle record
    if (v) {
      const docPathFields = ['registration_document_path', 'revenue_license_path', 'eco_test_path', 'insurance_path', 'service_tag_path'] as const;
      for (const field of docPathFields) {
        const docPath = (v as Record<string, string | null>)[field];
        if (docPath) storagePaths.push({ bucket: 'vehicle-documents', path: docPath });
      }
    }

    // Vehicle photos from vehicle_photos table
    const { data: photos } = await supabaseAdmin.from('vehicle_photos').select('storage_path').eq('vehicle_id', id);
    if (photos) {
      for (const photo of photos) {
        if (photo.storage_path) storagePaths.push({ bucket: 'vehicle-documents', path: photo.storage_path });
      }
    }

    // Delete individual files
    for (const { bucket, path } of storagePaths) {
      await supabaseAdmin.storage.from(bucket).remove([path]);
    }

    // Clean up any remaining files under the reg_number folder in vehicle-documents
    if (v?.reg_number) {
      await deleteStorageFolder('vehicle-documents', `${v.reg_number}/`);
    }

    const { error } = await supabaseAdmin.from('vehicles').delete().eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabaseAdmin.from('vehicles').update({ is_active: false }).eq('id', id);
    if (error) return { error: error.message };
  }

  revalidatePath('/vehicles');
  revalidateTag(VEHICLES_TAG);
  revalidateTag(DASHBOARD_TAG);
  await logActivity({ action: 'deleted', module: 'Vehicles', entity_id: id, entity_label: label });
  return { success: true };
}

export async function updateVehicleStatus(id: string, status: Vehicle['status']) {
  await requireAuth();
  const { error } = await supabaseAdmin.from('vehicles').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vehicles');
  revalidateTag(VEHICLES_TAG);
  revalidateTag(DASHBOARD_TAG);
  const { data: v } = await supabaseAdmin.from('vehicles').select('brand, model, reg_number').eq('id', id).single();
  await logActivity({ action: 'status_changed', module: 'Vehicles', entity_id: id, entity_label: v ? `${v.brand} ${v.model} (${v.reg_number})` : id, details: `Status → ${status}` });
  return { success: true };
}

export async function uploadVehiclePhoto(vehicleId: string, file: File, isPrimary = false) {
  await requireAuth();

  const { data: vehicle } = await supabaseAdmin.from('vehicles')
    .select('reg_number').eq('id', vehicleId).single();
  const regNumber = vehicle?.reg_number || vehicleId;

  const ext = file.name.split('.').pop();
  const path = `${regNumber}/photos/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('vehicle-documents')
    .upload(path, file);

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabaseAdmin.storage.from('vehicle-documents').getPublicUrl(path);

  const { data: inserted, error } = await supabaseAdmin.from('vehicle_photos').insert({
    vehicle_id: vehicleId,
    url: urlData.publicUrl,
    storage_path: path,
    is_primary: isPrimary,
  }).select('id').single();

  if (error) return { error: error.message };

  revalidatePath(`/vehicles/${vehicleId}`);
  revalidateTag(VEHICLES_TAG);
  return { success: true, url: urlData.publicUrl, path, id: inserted.id };
}

export async function deleteVehiclePhoto(photoId: string, storagePath: string, vehicleId: string) {
  await requireAuth();
  await supabaseAdmin.storage.from('vehicle-documents').remove([storagePath]);
  await supabaseAdmin.from('vehicle_photos').delete().eq('id', photoId);
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidateTag(VEHICLES_TAG);
  return { success: true };
}

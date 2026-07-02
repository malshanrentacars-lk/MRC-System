export type UserRole = 'admin' | 'employee';
export type VehicleStatus = 'available' | 'rented' | 'booked' | 'in_garage';
export type VehicleType = 'Sedan' | 'Hatchback' | 'SUV' | 'Van' | 'Pickup' | 'Bus' | 'Other';
export type VehicleSource = 'Company' | 'Supplier';
export type RentalStatus = 'booked' | 'active' | 'paused' | 'returned' | 'cancelled' | 'overdue' | 'completed' | 'extended' | 'swapped';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'balance_due' | 'refund_pending';
export type TodoType = 'rental_end' | 'service_due' | 'service_overdue' | 'booked_pickup' | 'custom';

export interface AddressParts {
  street_address?: string;
  street_address_2?: string;
  city?: string;
  postal_code?: string;
  address?: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings extends AddressParts {
  id: string;
  company_name: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  service_interval_km: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Company extends AddressParts {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  logo_url?: string;
  logo_path?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export interface Supplier extends AddressParts {
  id: string;
  name: string;
  phone?: string;
  phone2?: string;
  email?: string;
  nic?: string;
  bank?: string;
  account_number?: string;
  branch?: string;
  notes?: string;
  is_active: boolean;
  nic_front_url?: string;
  nic_back_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  reg_number: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  type: VehicleType;
  fuel_type?: string;
  transmission?: string;
  source: VehicleSource;
  supplier_id?: string;
  supplier?: Supplier;
  company_id?: string;
  company?: Company;
  status: VehicleStatus;
  daily_rate: number;
  current_km: number;
  next_service_km: number;
  next_service_date?: string;
  last_service_date?: string;
  last_service_km?: number;
  insurance_expiry?: string;
  revenue_license_expiry?: string;
  eco_test_expiry?: string;
  agreement_start_date?: string;
  agreement_period?: string;
  renew_date?: string;
  handover_date?: string;
  agreement_end_date?: string;
  payment_type?: string;
  notes?: string;
  registration_document_url?: string;
  registration_document_path?: string;
  revenue_license_url?: string;
  revenue_license_path?: string;
  eco_test_url?: string;
  eco_test_path?: string;
  insurance_url?: string;
  insurance_path?: string;
  service_tag_url?: string;
  service_tag_path?: string;
  monthly_cost?: number;
  payment_frequency?: string;
  payment_days?: string;
  is_active: boolean;
  photos?: VehiclePhoto[];
  rate_tiers?: RateTier[];
  created_at: string;
  updated_at: string;
}

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  created_at: string;
}

export interface RateTier {
  id: string;
  vehicle_id: string;
  days_from: number;
  days_to?: number;
  rate_per_day: number;
}

export interface Customer extends AddressParts {
  id: string;
  name: string;
  nic?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  license_number?: string;
  license_expiry?: string;
  notes?: string;
  is_active: boolean;
  nic_front_url?: string;
  nic_back_url?: string;
  photo_url?: string;
  utility_bill_url?: string;
  driving_license_front_url?: string;
  driving_license_back_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Guarantor extends AddressParts {
  id: string;
  customer_id?: string;
  customer?: Customer;
  name: string;
  nic?: string;
  phone?: string;
  phone2?: string;
  relationship?: string;
  notes?: string;
  nic_front_url?: string;
  nic_back_url?: string;
  photo_url?: string;
  utility_bill_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  rental_number: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  customer_id: string;
  customer?: Customer;
  guarantor_id?: string;
  guarantor?: Guarantor;
  created_by?: string;
  created_by_user?: User;
  start_date: string;
  end_date: string;
  actual_return_date?: string;
  pickup_km: number;
  return_km?: number;
  daily_rate: number;
  applied_rate?: number;
  rental_duration?: number;
  total_days: number;
  subtotal?: number;
  additional_charges: number;
  discount: number;
  total_amount?: number;
  deposit: number;
  advance_paid?: number;
  security_deposit_amount?: number;
  is_deposit_collected?: boolean;
  km_limit?: number;
  extra_km_rate?: number;
  extra_day_rate?: number;
  refund_amount_due?: number;
  status: RentalStatus;
  payment_status: PaymentStatus;
  amount_paid?: number;
  payment_method?: string;
  payment_notes?: string;
  last_payment_date?: string;
  pickup_notes?: string;
  return_notes?: string;
  notes?: string;
  signed_agreement_url?: string;
  signed_agreement_path?: string;
  agreements?: SignedAgreement[];
  exchanges?: VehicleExchange[];
  created_at: string;
  updated_at: string;
}

export interface SignedAgreement {
  id: string;
  rental_id: string;
  file_name: string;
  storage_url: string;
  storage_path: string;
  uploaded_at: string;
}

export interface VehicleExchange {
  id: string;
  rental_id: string;
  old_vehicle_id: string;
  old_vehicle?: Vehicle;
  new_vehicle_id: string;
  new_vehicle?: Vehicle;
  exchange_date: string;
  reason?: string;
  additional_charge: number;
  old_vehicle_km?: number;
  new_vehicle_km?: number;
  approved_by?: string;
  notes?: string;
  created_at: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  type: TodoType;
  reference_id?: string;
  is_done: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'On Time' | 'Late' | 'Absent';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  working_hours?: string | null;
  created_at: string;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  working: number;
  totalEmployees: number;
}

export interface AttendanceReportRow {
  employee_id: string;
  employee_name: string;
  employee_email?: string | null;
  total: number;
  present: number;
  late: number;
  absent: number;
  working: number;
}

// Dashboard types
export interface DashboardStats {
  activeRentals: number;
  availableVehicles: number;
  bookedVehicles: number;
  inGarageVehicles: number;
  totalVehicles: number;
  todayRevenue: number;
  totalDeposit: number;
  overdueRentals: number;
  completedToday: number;
}

export interface TopVehicle {
  vehicle_id: string;
  reg_number: string;
  brand: string;
  model: string;
  rental_count: number;
  total_revenue: number;
}

export interface TopCustomer {
  customer_id: string;
  name: string;
  phone: string;
  rental_count: number;
  total_spent: number;
}

// Auth
export interface SessionUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  email?: string;
}

-- ================================================================
-- MRC Fleet Management System — Comprehensive Demo Data
-- ================================================================
-- Erases existing demo data and re-inserts fresh records.
-- Run via: supabase db reset
-- All IDs are fixed UUIDs for consistent FK references.
-- ================================================================

BEGIN;

-- Clean all demo data (keep migration-seeded whatsapp_templates if any)
DELETE FROM activity_logs;
DELETE FROM signed_agreements;
DELETE FROM vehicle_exchanges;
DELETE FROM todos;
DELETE FROM attendance;
DELETE FROM rate_tiers;
DELETE FROM vehicle_photos;
DELETE FROM rentals;
DELETE FROM guarantors;
DELETE FROM customers;
DELETE FROM vehicles;
DELETE FROM suppliers;
DELETE FROM company_settings;
DELETE FROM users;
DELETE FROM companies;

-- ================================================================
-- 1. COMPANIES (3)
-- ================================================================
INSERT INTO companies (id, name, phone, email, street_address, street_address_2, city, postal_code, address, notes, logo_url, logo_path, is_active)
VALUES
('10000000-0000-0000-0000-000000000001', 'MRC Rentals', '+94 11 234 5678', 'info@mrc.lk', '42 Galle Road', 'Suite 3A', 'Colombo', '00300', 'Colombo 03, Sri Lanka', 'Main operating company', 'https://placehold.co/200x80/2563eb/white?text=MRC', 'company-assets/mrc-logo.png', true),
('10000000-0000-0000-0000-000000000002', 'City Motors Ltd', '+94 11 345 6789', 'info@citymotors.lk', '78 Kandy Road', NULL, 'Colombo', '01000', 'Kiribathgoda, Sri Lanka', 'Partner company for fleet expansion', 'https://placehold.co/200x80/dc2626/white?text=CM', 'company-assets/city-motors-logo.png', true),
('10000000-0000-0000-0000-000000000003', 'Lanka Vehicle Services', '+94 71 555 1234', 'hello@lankavehicles.lk', '15 Havelock Road', 'Unit B', 'Colombo', '00500', 'Colombo 05, Sri Lanka', 'Vehicle service and maintenance partner', 'https://placehold.co/200x80/16a34a/white?text=LVS', 'company-assets/lvs-logo.png', true);

-- ================================================================
-- 2. USERS (5: 1 admin + 4 employees)
-- ================================================================
-- amil: Admin@1234  |  others: password123
INSERT INTO users (id, username, full_name, email, password_hash, role, is_active, avatar_url)
VALUES
('20000000-0000-0000-0000-000000000001', 'amil', 'Amil Fernando', 'amil@mrc.lk', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true, 'https://api.dicebear.com/9.x/initials/svg?seed=AF&backgroundColor=2563eb'),
('20000000-0000-0000-0000-000000000002', 'chanuka', 'Chanuka Wijesinghe', 'chanuka@mrc.lk', '$2a$10$Lr42l0Knmek9046jTPL9V.PeXaaMLg2DK3izTi0H6i/59FL7PgbKu', 'employee', true, 'https://api.dicebear.com/9.x/initials/svg?seed=CW&backgroundColor=dc2626'),
('20000000-0000-0000-0000-000000000003', 'saman', 'Saman Jayasuriya', 'saman@mrc.lk', '$2a$10$Lr42l0Knmek9046jTPL9V.PeXaaMLg2DK3izTi0H6i/59FL7PgbKu', 'employee', true, 'https://api.dicebear.com/9.x/initials/svg?seed=SJ&backgroundColor=16a34a'),
('20000000-0000-0000-0000-000000000004', 'sunil', 'Sunil Rathnayake', 'sunil@mrc.lk', '$2a$10$Lr42l0Knmek9046jTPL9V.PeXaaMLg2DK3izTi0H6i/59FL7PgbKu', 'employee', true, 'https://api.dicebear.com/9.x/initials/svg?seed=SR&backgroundColor=ca8a04'),
('20000000-0000-0000-0000-000000000005', 'kamal', 'Kamal Perera', 'kamal@mrc.lk', '$2a$10$Lr42l0Knmek9046jTPL9V.PeXaaMLg2DK3izTi0H6i/59FL7PgbKu', 'employee', true, 'https://api.dicebear.com/9.x/initials/svg?seed=KP&backgroundColor=7c3aed');

-- ================================================================
-- 3. COMPANY_SETTINGS (1)
-- ================================================================
INSERT INTO company_settings (id, company_name, street_address, street_address_2, city, postal_code, address, phone, email, logo_url, service_interval_km, currency)
VALUES
('00000000-0000-0000-0000-000000000001', 'MRC Vehicle Rentals', '42 Galle Road', 'Suite 3A', 'Colombo', '00300', '42 Galle Road, Colombo 03, Sri Lanka', '+94 11 234 5678', 'info@mrc.lk', 'https://placehold.co/200x80/2563eb/white?text=MRC', 5000, 'LKR');

-- ================================================================
-- 4. SUPPLIERS (5)
-- ================================================================
INSERT INTO suppliers (id, name, phone, phone2, email, street_address, street_address_2, city, postal_code, address, nic, notes, bank, account_number, branch, nic_front_url, nic_back_url, photo_url, company_id, is_active)
VALUES
('30000000-0000-0000-0000-000000000001', 'Perera Motors', '+94 71 234 5678', '+94 77 876 5432', 'perera@motors.lk', '120 Negombo Road', NULL, 'Colombo', '00100', '120 Negombo Road, Colombo 01', '197805123456V', 'Reliable supplier for economy vehicles — 5 year partnership', 'Bank of Ceylon', '00123456789', 'Colombo Fort', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', '10000000-0000-0000-0000-000000000001', true),
('30000000-0000-0000-0000-000000000002', 'Lanka Auto Traders', '+94 77 345 6789', NULL, 'lanka@auto.lk', '56 High Level Road', NULL, 'Nugegoda', '10250', '56 High Level Road, Nugegoda', '198502987654V', 'Premium vehicle supplier — specializes in SUVs and vans', 'Sampath Bank', '00987654321', 'Nugegoda', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', '10000000-0000-0000-0000-000000000002', true),
('30000000-0000-0000-0000-000000000003', 'Southern Vehicle Hub', '+94 91 567 8901', '+94 76 111 2233', 'southern@vehicles.lk', '12 Matara Road', 'Ground Floor', 'Galle', '80000', '12 Matara Road, Galle', '197212345678V', 'Southern province supplier — offers competitive monthly rates', 'HNB', '00555666777', 'Galle', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', '10000000-0000-0000-0000-000000000003', true),
('30000000-0000-0000-0000-000000000004', 'Colombo Car Rentals', '+94 11 234 9876', '+94 72 987 6543', 'rentals@ccr.lk', '200 Galle Road', NULL, 'Colombo', '00400', '200 Galle Road, Colombo 04', '198803456789V', 'Long-term rental partner — 10+ vehicles supplied', 'Commercial Bank', '00444555666', 'Bambalapitiya', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', '10000000-0000-0000-0000-000000000001', true),
('30000000-0000-0000-0000-000000000005', 'Kandy City Autos', '+94 81 345 1122', '+94 75 334 4556', 'kandy@autos.lk', '45 Peradeniya Road', '1st Floor', 'Kandy', '20000', '45 Peradeniya Road, Kandy', '199510987654V', 'Hill country specialist — provides 4WD and SUV vehicles', 'NSB', '00999888777', 'Kandy', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', '10000000-0000-0000-0000-000000000002', true);

-- ================================================================
-- 5. VEHICLES (10 — all types, sources, and statuses)
-- ================================================================
INSERT INTO vehicles (id, reg_number, brand, model, nickname, year, color, type, fuel_type, transmission, source, supplier_id, company_id, status, daily_rate, current_km, next_service_km, next_service_date, last_service_date, last_service_km, engine_number, chassis_number, insurance_expiry, revenue_license_expiry, eco_test_expiry, agreement_start_date, agreement_period, renew_date, handover_date, agreement_end_date, payment_type, registration_document_url, registration_document_path, revenue_license_url, revenue_license_path, eco_test_url, eco_test_path, insurance_url, insurance_path, service_tag_url, service_tag_path, monthly_cost, payment_frequency, payment_days, notes, is_active)
VALUES
-- Vehicle 1: Company Sedan — Available
('40000000-0000-0000-0000-000000000001', 'CAR-0001', 'Toyota', 'Axio', 'Silver Arrow', 2022, 'Silver', 'Sedan', 'Petrol', 'Automatic', 'Company', NULL, '10000000-0000-0000-0000-000000000001', 'available', 5000.00, 15200, 20000, '2026-09-01', '2026-05-15', 14500, '2NZ-FE-1234567', 'NZE141-1234567', '2027-01-15', '2027-02-20', '2027-03-10', '2025-06-01', '12', '2027-05-31', '2025-06-01', '2027-05-31', 'Full', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'CAR-0001/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'CAR-0001/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'CAR-0001/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'CAR-0001/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'CAR-0001/service_tag/tag.pdf', NULL, NULL, NULL, 'Well-maintained company vehicle — excellent fuel economy', true),

-- Vehicle 2: Company Hatchback — Rented
('40000000-0000-0000-0000-000000000002', 'CAR-0002', 'Toyota', 'Prius', 'Green Machine', 2020, 'Pearl White', 'Hatchback', 'Hybrid', 'Automatic', 'Company', NULL, '10000000-0000-0000-0000-000000000001', 'rented', 5500.00, 38200, 43000, '2026-08-15', '2026-04-20', 37500, '2ZR-FXE-2345678', 'ZVW30-2345678', '2027-03-20', '2027-04-10', '2027-05-25', '2025-03-01', '12', '2026-02-28', '2025-03-01', '2026-02-28', 'Full', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'CAR-0002/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'CAR-0002/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'CAR-0002/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'CAR-0002/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'CAR-0002/service_tag/tag.pdf', NULL, NULL, NULL, 'Hybrid — most fuel-efficient vehicle in fleet', true),

-- Vehicle 3: Supplier Hatchback — Available
('40000000-0000-0000-0000-000000000003', 'ABC-1234', 'Honda', 'Fit', 'Blue Bolt', 2019, 'Blue', 'Hatchback', 'Petrol', 'Automatic', 'Supplier', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'available', 3500.00, 52000, 57000, '2026-10-01', '2026-06-01', 51000, 'L15A-3456789', 'GE6-3456789', '2027-06-30', '2027-08-15', '2027-09-01', '2025-08-15', '12', '2026-08-14', '2025-08-15', '2026-08-14', 'Half', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'ABC-1234/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'ABC-1234/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'ABC-1234/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'ABC-1234/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'ABC-1234/service_tag/tag.pdf', 35000.00, '1_month', '30', 'From Perera Motors — consistent performer', true),

-- Vehicle 4: Company SUV — Available
('40000000-0000-0000-0000-000000000004', 'CAR-0003', 'Mitsubishi', 'Outlander', 'Mountain King', 2021, 'Black', 'SUV', 'Diesel', 'Automatic', 'Company', NULL, '10000000-0000-0000-0000-000000000001', 'available', 8500.00, 61000, 66000, '2026-11-01', '2026-07-01', 59000, '4B11-4567890', 'CW5W-4567890', '2027-09-15', '2027-11-20', '2027-12-05', '2025-11-01', '12', '2026-10-31', '2025-11-01', '2026-10-31', 'Full', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'CAR-0003/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'CAR-0003/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'CAR-0003/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'CAR-0003/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'CAR-0003/service_tag/tag.pdf', NULL, NULL, NULL, 'Popular for family trips and long-distance travel', true),

-- Vehicle 5: Supplier Van — Available
('40000000-0000-0000-0000-000000000005', 'WP-5678', 'Toyota', 'KDH Van', 'Big Daddy', 2018, 'White', 'Van', 'Diesel', 'Manual', 'Supplier', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'available', 9000.00, 105000, 112000, '2026-09-15', '2026-05-10', 103000, '1KD-5678901', 'KDH200-5678901', '2027-04-10', '2027-06-25', '2027-07-15', '2025-09-01', '6', '2026-02-28', '2025-09-01', '2026-02-28', 'Half', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'WP-5678/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'WP-5678/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'WP-5678/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'WP-5678/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'WP-5678/service_tag/tag.pdf', 65000.00, '15_days', '15,30', 'High-demand 12-seater van for group transport', true),

-- Vehicle 6: Company Sedan — In Garage
('40000000-0000-0000-0000-000000000006', 'CAR-0004', 'Nissan', 'Bluebird', 'Blue Birdie', 2020, 'Navy Blue', 'Sedan', 'Petrol', 'Automatic', 'Company', NULL, '10000000-0000-0000-0000-000000000001', 'in_garage', 4500.00, 78500, 83000, '2026-08-01', '2026-04-05', 77500, 'HR15-6789012', 'G11-6789012', '2027-02-28', '2027-03-15', '2027-04-20', '2025-04-01', '12', '2026-03-31', '2025-04-01', '2026-03-31', 'Full', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'CAR-0004/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'CAR-0004/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'CAR-0004/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'CAR-0004/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'CAR-0004/service_tag/tag.pdf', NULL, NULL, NULL, 'In garage — gearbox overhaul. Expected return: 2026-07-20', true),

-- Vehicle 7: Supplier SUV — Booked
('40000000-0000-0000-0000-000000000007', 'CAB-9012', 'Toyota', 'Land Cruiser Prado', 'The Beast', 2022, 'Dark Green', 'SUV', 'Diesel', 'Automatic', 'Supplier', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'booked', 15000.00, 28000, 33000, '2026-12-01', '2026-08-01', 26500, '1GD-7890123', 'GDJ150-7890123', '2027-10-20', '2027-12-10', '2027-12-30', '2025-12-01', '6', '2026-05-31', '2025-12-01', '2026-05-31', 'Half', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'CAB-9012/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'CAB-9012/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'CAB-9012/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'CAB-9012/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'CAB-9012/service_tag/tag.pdf', 120000.00, '1_month', '5', 'Premium SUV from Southern Vehicle Hub — luxury bookings', true),

-- Vehicle 8: Company Pickup — Available
('40000000-0000-0000-0000-000000000008', 'CAR-0005', 'Toyota', 'Hilux', 'Workhorse', 2023, 'Orange', 'Pickup', 'Diesel', 'Manual', 'Company', NULL, '10000000-0000-0000-0000-000000000001', 'available', 7000.00, 9500, 15000, '2026-12-15', '2026-06-20', 8800, '2GD-8901234', 'GUN125-8901234', '2027-05-30', '2027-07-18', '2027-08-05', '2025-07-01', '12', '2026-06-30', '2025-07-01', '2026-06-30', 'Full', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'CAR-0005/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'CAR-0005/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'CAR-0005/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'CAR-0005/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'CAR-0005/service_tag/tag.pdf', NULL, NULL, NULL, 'Newest addition — ideal for cargo and rough terrain', true),

-- Vehicle 9: Supplier Van — Rented
('40000000-0000-0000-0000-000000000009', 'SP-3456', 'Nissan', 'Caravan', 'People Mover', 2019, 'Silver', 'Van', 'Petrol', 'Automatic', 'Supplier', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'rented', 7500.00, 64000, 69000, '2026-10-15', '2026-06-15', 62500, 'QR20-9012345', 'E25-9012345', '2027-01-05', '2027-03-20', '2027-04-10', '2025-10-15', '12', '2026-10-14', '2025-10-15', '2026-10-14', 'Half', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'SP-3456/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'SP-3456/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'SP-3456/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'SP-3456/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'SP-3456/service_tag/tag.pdf', 55000.00, '1_month', '15', 'From Colombo Car Rentals — popular 9-seater', true),

-- Vehicle 10: Company Bus — Available
('40000000-0000-0000-0000-000000000010', 'NB-7890', 'Toyota', 'Coaster', 'Tour Master', 2020, 'White/Green', 'Bus', 'Diesel', 'Manual', 'Company', NULL, '10000000-0000-0000-0000-000000000001', 'available', 18000.00, 128000, 133000, '2026-11-20', '2026-07-10', 126500, 'N04C-0123456', 'XZB50-0123456', '2027-08-15', '2027-10-30', '2027-11-15', '2025-11-01', '12', '2026-10-31', '2025-11-01', '2026-10-31', 'Full', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Registration+Doc', 'NB-7890/registration/reg.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Revenue+License', 'NB-7890/revenue_license/rl.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Eco+Test', 'NB-7890/eco_test/eco.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Insurance', 'NB-7890/insurance/ins.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Service+Tag', 'NB-7890/service_tag/tag.pdf', NULL, NULL, NULL, '25-seater tourist bus — high season demand', true);

-- ================================================================
-- 6. VEHICLE_PHOTOS (2-3 per vehicle = 25 photos)
-- ================================================================
INSERT INTO vehicle_photos (id, vehicle_id, url, storage_path, is_primary)
VALUES
-- Vehicle 1
('b0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'https://placehold.co/800x600/2563eb/white?text=Axio+Front', 'CAR-0001/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'https://placehold.co/800x600/2563eb/white?text=Axio+Side', 'CAR-0001/photos/side.jpg', false),
('b0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'https://placehold.co/800x600/2563eb/white?text=Axio+Interior', 'CAR-0001/photos/interior.jpg', false),
-- Vehicle 2
('b0000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 'https://placehold.co/800x600/16a34a/white?text=Prius+Front', 'CAR-0002/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', 'https://placehold.co/800x600/16a34a/white?text=Prius+Rear', 'CAR-0002/photos/rear.jpg', false),
-- Vehicle 3
('b0000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', 'https://placehold.co/800x600/2563eb/white?text=Fit+Front', 'ABC-1234/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000003', 'https://placehold.co/800x600/2563eb/white?text=Fit+Side', 'ABC-1234/photos/side.jpg', false),
-- Vehicle 4
('b0000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000004', 'https://placehold.co/800x600/1e293b/white?text=Outlander+Front', 'CAR-0003/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000004', 'https://placehold.co/800x600/1e293b/white?text=Outlander+Side', 'CAR-0003/photos/side.jpg', false),
('b0000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000004', 'https://placehold.co/800x600/1e293b/white?text=Outlander+Interior', 'CAR-0003/photos/interior.jpg', false),
-- Vehicle 5
('b0000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000005', 'https://placehold.co/800x600/eab308/white?text=KDH+Front', 'WP-5678/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000005', 'https://placehold.co/800x600/eab308/white?text=KDH+Rear', 'WP-5678/photos/rear.jpg', false),
-- Vehicle 6
('b0000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000006', 'https://placehold.co/800x600/1e3a5f/white?text=Bluebird+Front', 'CAR-0004/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000006', 'https://placehold.co/800x600/1e3a5f/white?text=Bluebird+Side', 'CAR-0004/photos/side.jpg', false),
-- Vehicle 7
('b0000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000007', 'https://placehold.co/800x600/166534/white?text=Prado+Front', 'CAB-9012/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000007', 'https://placehold.co/800x600/166534/white?text=Prado+Side', 'CAB-9012/photos/side.jpg', false),
('b0000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000007', 'https://placehold.co/800x600/166534/white?text=Prado+Interior', 'CAB-9012/photos/interior.jpg', false),
-- Vehicle 8
('b0000000-0000-0000-0000-000000000018', '40000000-0000-0000-0000-000000000008', 'https://placehold.co/800x600/c2410c/white?text=Hilux+Front', 'CAR-0005/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000019', '40000000-0000-0000-0000-000000000008', 'https://placehold.co/800x600/c2410c/white?text=Hilux+Side', 'CAR-0005/photos/side.jpg', false),
-- Vehicle 9
('b0000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000009', 'https://placehold.co/800x600/9ca3af/white?text=Caravan+Front', 'SP-3456/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000009', 'https://placehold.co/800x600/9ca3af/white?text=Caravan+Rear', 'SP-3456/photos/rear.jpg', false),
-- Vehicle 10
('b0000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000010', 'https://placehold.co/800x600/f8fafc/0f172a?text=Coaster+Front', 'NB-7890/photos/front.jpg', true),
('b0000000-0000-0000-0000-000000000023', '40000000-0000-0000-0000-000000000010', 'https://placehold.co/800x600/f8fafc/0f172a?text=Coaster+Side', 'NB-7890/photos/side.jpg', false),
('b0000000-0000-0000-0000-000000000024', '40000000-0000-0000-0000-000000000010', 'https://placehold.co/800x600/f8fafc/0f172a?text=Coaster+Interior', 'NB-7890/photos/interior.jpg', false);

-- ================================================================
-- 7. RATE_TIERS (4 per vehicle = 40 tiers)
-- ================================================================
INSERT INTO rate_tiers (vehicle_id, days_from, days_to, rate_per_day)
VALUES
-- Vehicle 1 (Axio) — daily_rate 5000
('40000000-0000-0000-0000-000000000001', 1, 7, 5000.00),
('40000000-0000-0000-0000-000000000001', 8, 14, 4750.00),
('40000000-0000-0000-0000-000000000001', 15, 21, 4500.00),
('40000000-0000-0000-0000-000000000001', 22, 30, 4250.00),
-- Vehicle 2 (Prius) — daily_rate 5500
('40000000-0000-0000-0000-000000000002', 1, 7, 5500.00),
('40000000-0000-0000-0000-000000000002', 8, 14, 5200.00),
('40000000-0000-0000-0000-000000000002', 15, 21, 4900.00),
('40000000-0000-0000-0000-000000000002', 22, 30, 4600.00),
-- Vehicle 3 (Fit) — daily_rate 3500
('40000000-0000-0000-0000-000000000003', 1, 7, 3500.00),
('40000000-0000-0000-0000-000000000003', 8, 14, 3300.00),
('40000000-0000-0000-0000-000000000003', 15, 21, 3100.00),
('40000000-0000-0000-0000-000000000003', 22, 30, 2900.00),
-- Vehicle 4 (Outlander) — daily_rate 8500
('40000000-0000-0000-0000-000000000004', 1, 7, 8500.00),
('40000000-0000-0000-0000-000000000004', 8, 14, 8000.00),
('40000000-0000-0000-0000-000000000004', 15, 21, 7500.00),
('40000000-0000-0000-0000-000000000004', 22, 30, 7000.00),
-- Vehicle 5 (KDH) — daily_rate 9000
('40000000-0000-0000-0000-000000000005', 1, 7, 9000.00),
('40000000-0000-0000-0000-000000000005', 8, 14, 8500.00),
('40000000-0000-0000-0000-000000000005', 15, 21, 8000.00),
('40000000-0000-0000-0000-000000000005', 22, 30, 7500.00),
-- Vehicle 6 (Bluebird) — daily_rate 4500
('40000000-0000-0000-0000-000000000006', 1, 7, 4500.00),
('40000000-0000-0000-0000-000000000006', 8, 14, 4250.00),
('40000000-0000-0000-0000-000000000006', 15, 21, 4000.00),
('40000000-0000-0000-0000-000000000006', 22, 30, 3750.00),
-- Vehicle 7 (Prado) — daily_rate 15000
('40000000-0000-0000-0000-000000000007', 1, 7, 15000.00),
('40000000-0000-0000-0000-000000000007', 8, 14, 14250.00),
('40000000-0000-0000-0000-000000000007', 15, 21, 13500.00),
('40000000-0000-0000-0000-000000000007', 22, 30, 12750.00),
-- Vehicle 8 (Hilux) — daily_rate 7000
('40000000-0000-0000-0000-000000000008', 1, 7, 7000.00),
('40000000-0000-0000-0000-000000000008', 8, 14, 6650.00),
('40000000-0000-0000-0000-000000000008', 15, 21, 6300.00),
('40000000-0000-0000-0000-000000000008', 22, 30, 5950.00),
-- Vehicle 9 (Caravan) — daily_rate 7500
('40000000-0000-0000-0000-000000000009', 1, 7, 7500.00),
('40000000-0000-0000-0000-000000000009', 8, 14, 7125.00),
('40000000-0000-0000-0000-000000000009', 15, 21, 6750.00),
('40000000-0000-0000-0000-000000000009', 22, 30, 6375.00),
-- Vehicle 10 (Coaster) — daily_rate 18000
('40000000-0000-0000-0000-000000000010', 1, 7, 18000.00),
('40000000-0000-0000-0000-000000000010', 8, 14, 17100.00),
('40000000-0000-0000-0000-000000000010', 15, 21, 16200.00),
('40000000-0000-0000-0000-000000000010', 22, 30, 15300.00);

-- ================================================================
-- 8. CUSTOMERS (8)
-- ================================================================
INSERT INTO customers (id, name, nic, phone, phone2, email, street_address, street_address_2, city, postal_code, address, license_number, license_expiry, notes, nic_front_url, nic_back_url, photo_url, utility_bill_url, utility_bill_path, driving_license_front_url, driving_license_front_path, driving_license_back_url, driving_license_back_path, is_active)
VALUES
('50000000-0000-0000-0000-000000000001', 'Kasun Perera', '199012345678', '+94 77 123 4567', '+94 71 987 6543', 'kasun.p@gmail.com', '25 Galle Road', 'Apt 4B', 'Colombo', '00300', '25 Galle Road, Colombo 03', 'B1234567', '2028-06-15', 'Regular customer — prefers Toyota vehicles', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/kasun_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/kasun_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/kasun_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000002', 'Nimali Fernando', '198505678901', '+94 76 234 5678', NULL, 'nimali.f@gmail.com', '78 Kandy Road', NULL, 'Kadawatha', '11850', '78 Kandy Road, Kadawatha', 'C2345678', '2027-11-20', 'Prefers automatic transmission — repeat customer', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/nimali_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/nimali_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/nimali_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000003', 'Rohan Silva', '198201234567', '+94 71 345 6789', '+94 77 876 5432', 'rohan.s@gmail.com', '12 Duplication Road', 'Shop 3', 'Colombo', '00400', '12 Duplication Road, Colombo 04', 'A9876543', '2026-09-30', 'Business customer — rents vans for tours', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/rohan_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/rohan_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/rohan_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000004', 'Priyanka Jayawardena', '199306789012', '+94 72 456 7890', NULL, 'priya.j@gmail.com', '45 Havelock Road', NULL, 'Colombo', '00500', '45 Havelock Road, Colombo 05', 'D3456789', '2028-03-12', 'First-time customer — referred by Kasun', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/priyanka_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/priyanka_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/priyanka_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000005', 'Thushara Wickramasinghe', '197805890123', '+94 75 567 8901', '+94 71 234 5678', 'thushara.w@outlook.com', '90 Negombo Road', '1st Floor', 'Negombo', '11500', '90 Negombo Road, Negombo', 'E4567890', '2027-05-18', 'Corporate account — monthly rentals', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/thushara_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/thushara_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/thushara_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000006', 'Sanduni Rathnayake', '199507890123', '+94 77 678 9012', NULL, 'sanduni.r@gmail.com', '15 Matara Road', NULL, 'Matara', '81000', '15 Matara Road, Matara', 'F5678901', '2027-08-22', 'Southern province customer — occasional rentals', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/sanduni_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/sanduni_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/sanduni_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000007', 'Dinesh Gunasekara', '198807890123', '+94 71 789 0123', '+94 76 345 6789', 'dinesh.g@company.lk', '200 Baseline Road', 'Suite 2A', 'Colombo', '00900', '200 Baseline Road, Colombo 09', 'G6789012', '2026-12-31', 'Tour operator — bulk bookings for tourists', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/dinesh_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/dinesh_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/dinesh_dl_back.jpg', true),
('50000000-0000-0000-0000-000000000008', 'Malini Abeywardena', '198101234567', '+94 72 890 1234', NULL, 'malini.a@yahoo.com', '55 Peradeniya Road', NULL, 'Kandy', '20000', '55 Peradeniya Road, Kandy', 'H7890123', '2028-01-15', 'Kandy-based — prefers SUV for hill country', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'customers/utility/malini_bill.pdf', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Front', 'customers/licenses/malini_dl_front.jpg', 'https://placehold.co/800x500/e2e8f0/64748b?text=DL+Back', 'customers/licenses/malini_dl_back.jpg', true);

-- ================================================================
-- 9. GUARANTORS (5)
-- ================================================================
INSERT INTO guarantors (id, customer_id, name, nic, phone, phone2, street_address, street_address_2, city, postal_code, address, relationship, notes, nic_front_url, nic_back_url, photo_url, utility_bill_url, utility_bill_path)
VALUES
('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Lakshman Perera', '196512345678', '+94 77 111 2222', NULL, '25 Galle Road', 'Apt 4B', 'Colombo', '00300', '25 Galle Road, Colombo 03', 'Father', 'Verified — stable income, government employee', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'guarantors/utility/lakshman_bill.pdf'),
('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', 'Shirani Silva', '198503456789', '+94 72 333 4444', '+94 71 555 6666', '12 Duplication Road', 'Shop 3', 'Colombo', '00400', '12 Duplication Road, Colombo 04', 'Spouse', 'Co-owner of the tour business', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'guarantors/utility/shirani_bill.pdf'),
('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 'Asanka Jayawardena', '199007890123', '+94 76 777 8888', NULL, '45 Havelock Road', NULL, 'Colombo', '00500', '45 Havelock Road, Colombo 05', 'Brother', 'Software engineer — verified salary', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'guarantors/utility/asanka_bill.pdf'),
('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005', 'Dilani Wickramasinghe', '198202345678', '+94 71 999 0000', NULL, '90 Negombo Road', '1st Floor', 'Negombo', '11500', '90 Negombo Road, Negombo', 'Spouse', 'Joint director of the company', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'guarantors/utility/dilani_bill.pdf'),
('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000007', 'Nuwan Gunasekara', '198605678901', '+94 77 222 3333', '+94 72 444 5555', '200 Baseline Road', 'Suite 2A', 'Colombo', '00900', '200 Baseline Road, Colombo 09', 'Brother', 'Co-partner in tour operations', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Front', 'https://placehold.co/400x250/e2e8f0/64748b?text=NIC+Back', 'https://placehold.co/200x200/e2e8f0/64748b?text=Photo', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Utility+Bill', 'guarantors/utility/nuwan_bill.pdf');

-- ================================================================
-- 10. RENTALS (12 — all statuses and payment statuses)
-- ================================================================
-- rental_number auto-generated by trigger; total_days auto-computed
INSERT INTO rentals (id, vehicle_id, customer_id, guarantor_id, created_by, start_date, end_date, actual_return_date, pickup_km, return_km, daily_rate, subtotal, additional_charges, discount, total_amount, deposit, status, payment_status, amount_paid, payment_method, payment_notes, last_payment_date, signed_agreement_url, signed_agreement_path, applied_rate, rental_duration, advance_paid, security_deposit_amount, is_deposit_collected, km_limit, extra_km_rate, extra_day_rate, refund_amount_due, pickup_notes, return_notes, notes)
VALUES
-- R1: Active rental — Prius (CAR-0002)
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2026-07-10', '2026-07-20', NULL, 38200, NULL, 5500.00, 55000.00, 0, 0, 55000.00, 10000.00, 'active', 'partial', 25000.00, 'Bank Transfer', 'First installment paid on pickup', '2026-07-10', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement', 'agreements/rental_r1.pdf', 5500.00, 10, 15000.00, 20000.00, true, 1000, 50.00, 3000.00, 0, 'Clean, full tank, minor scratch on rear bumper noted', NULL, 'Customer requested 2-day extension — pending approval'),

-- R2: Active rental — Caravan (SP-3456)
('70000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '2026-07-12', '2026-07-17', NULL, 64000, NULL, 7500.00, 37500.00, 1500.00, 1000.00, 38000.00, 15000.00, 'active', 'pending', 0, NULL, NULL, NULL, NULL, NULL, 7500.00, 5, 15000.00, 30000.00, true, 500, 40.00, 4000.00, 0, 'Minor dent on left door noted', NULL, 'Tour group transport — extra cleaning fee'),

-- R3: Returned rental — Axio (CAR-0001)
('70000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', NULL, '20000000-0000-0000-0000-000000000004', '2026-06-28', '2026-07-05', '2026-07-05', 15000, 15200, 5000.00, 35000.00, 0, 0, 35000.00, 5000.00, 'returned', 'paid', 35000.00, 'Cash', 'Full payment received on return', '2026-07-05', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement', 'agreements/rental_r3.pdf', 5000.00, 7, 0, 10000.00, false, 700, 45.00, 2500.00, 0, 'Good condition', 'Returned clean, full tank', 'Smooth transaction — customer satisfied'),

-- R4: Returned rental — Outlander (CAR-0003)
('70000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '2026-06-20', '2026-07-01', '2026-07-01', 59500, 61000, 8500.00, 93500.00, 0, 8500.00, 85000.00, 25000.00, 'returned', 'paid', 85000.00, 'Bank Transfer', 'Paid via online transfer', '2026-07-01', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement', 'agreements/rental_r4.pdf', 8500.00, 11, 25000.00, 50000.00, true, 1500, 50.00, 5000.00, 0, 'Customer took for family trip to Nuwara Eliya', 'Returned with minor mud — cleaned', '10% loyalty discount applied'),

-- R5: Returned rental — KDH Van (WP-5678)
('70000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', '2026-07-01', '2026-07-08', '2026-07-09', 103500, 105000, 9000.00, 72000.00, 2000.00, 0, 74000.00, 30000.00, 'returned', 'balance_due', 50000.00, 'Cash + Cheque', 'Balance Rs.24,000 due by 2026-07-16', '2026-07-09', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement', 'agreements/rental_r5.pdf', 9000.00, 8, 30000.00, 30000.00, true, 1000, 60.00, 5000.00, 0, 'Group of 10 tourists', '1 day late — extra day charge applied, 1,500 extra km', 'Tourist group — airport pickup included'),

-- R6: Cancelled rental — Hilux (CAR-0005)
('70000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000006', NULL, '20000000-0000-0000-0000-000000000004', '2026-07-18', '2026-07-22', NULL, NULL, NULL, 7000.00, 28000.00, 0, 0, 28000.00, 0, 'cancelled', 'pending', 0, NULL, 'Customer cancelled due to personal emergency', NULL, NULL, NULL, 7000.00, 4, 0, 0, false, 0, 0, 0, 0, NULL, NULL, 'No charge — cancelled 5 days in advance'),

-- R7: Booked rental — Axio (CAR-0001)
('70000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '2026-07-20', '2026-07-25', NULL, NULL, NULL, 5000.00, 25000.00, 0, 0, 25000.00, 5000.00, 'booked', 'pending', 5000.00, 'Bank Transfer', 'Advance deposit received', '2026-07-13', NULL, NULL, 5000.00, 5, 5000.00, 0, false, 500, 50.00, 3000.00, 0, NULL, NULL, 'First-time customer — pickup at 9 AM'),

-- R8: Booked rental — Prado (CAB-9012)
('70000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000008', NULL, '20000000-0000-0000-0000-000000000005', '2026-08-01', '2026-08-10', NULL, NULL, NULL, 15000.00, 135000.00, 0, 0, 135000.00, 75000.00, 'booked', 'partial', 75000.00, 'Cheque', '50% advance for premium booking', '2026-07-12', NULL, NULL, 13500.00, 10, 75000.00, 50000.00, true, 2000, 75.00, 8000.00, 0, NULL, NULL, 'VIP booking — Prado requested for wedding'),

-- R9: Overdue rental — Fit (ABC-1234)
('70000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', NULL, '20000000-0000-0000-0000-000000000003', '2026-07-01', '2026-07-10', NULL, 51200, NULL, 3500.00, 49000.00, 0, 0, 49000.00, 10000.00, 'overdue', 'pending', 10000.00, 'Cash', 'Only deposit paid — customer not responding', '2026-07-01', NULL, NULL, 3500.00, 14, 10000.00, 0, false, 600, 35.00, 2500.00, 0, 'Customer asked for 2 extra days verbally', NULL, 'OVERDUE by 4 days — attempt contact daily'),

-- R10: Returned rental — Bluebird (CAR-0004)
('70000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '2026-06-15', '2026-06-22', '2026-06-22', 77000, 78500, 4500.00, 31500.00, 500.00, 0, 32000.00, 10000.00, 'returned', 'paid', 32000.00, 'Bank Transfer', 'Full amount settled', '2026-06-22', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement', 'agreements/rental_r10.pdf', 4500.00, 7, 10000.00, 15000.00, true, 800, 40.00, 3000.00, 0, 'Minor scratch on bumper', 'Returned with low fuel — Rs.500 surcharge', 'Refueling fee added'),

-- R11: Booked rental — Coaster (NB-7890)
('70000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '2026-07-25', '2026-07-27', NULL, NULL, NULL, 18000.00, 36000.00, 5000.00, 0, 41000.00, 20000.00, 'booked', 'partial', 20000.00, 'Bank Transfer', 'Deposit for Kandy tour group', '2026-07-11', NULL, NULL, 17100.00, 3, 20000.00, 30000.00, true, 500, 90.00, 10000.00, 0, NULL, NULL, 'School trip — 22 students + 3 teachers'),

-- R12: Returned rental — Hilux (CAR-0005)
('70000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', '2026-06-10', '2026-06-14', '2026-06-14', 8800, 9500, 7000.00, 28000.00, 0, 1400.00, 26600.00, 10000.00, 'returned', 'paid', 26600.00, 'Cash', 'Paid in full on return', '2026-06-14', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement', 'agreements/rental_r12.pdf', 7000.00, 4, 10000.00, 15000.00, true, 500, 50.00, 3500.00, 0, 'Used for construction material transport', 'Returned slightly dusty — within acceptable range', '5% discount for corporate account');

-- ================================================================
-- 11. VEHICLE_EXCHANGES (3)
-- ================================================================
INSERT INTO vehicle_exchanges (id, rental_id, old_vehicle_id, new_vehicle_id, exchange_date, reason, additional_charge, old_vehicle_km, new_vehicle_km, approved_by, notes)
VALUES
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000006', '2026-06-25', 'Customer reported AC not cooling properly — swapped to Bluebird', 0, 60500, 78000, '20000000-0000-0000-0000-000000000001', 'AC issue confirmed by mechanic — Outlander sent to garage'),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', '2026-06-18', 'Bluebird developed engine warning light — swapped to Axio', 0, 78200, 15100, '20000000-0000-0000-0000-000000000001', 'Engine misfire detected — customer upgraded to Axio at no extra cost'),
('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000009', '2026-07-04', 'KDH Van had brake issue — swapped to Caravan for remaining days', 2000.00, 104200, 64500, '20000000-0000-0000-0000-000000000001', 'Brake pads worn — Caravan slightly more expensive, surcharge applied');

-- ================================================================
-- 12. TODOS (10 — all types, mix done/undone)
-- ================================================================
INSERT INTO todos (id, title, description, due_date, type, reference_id, is_done, created_by)
VALUES
-- Service-related
('90000000-0000-0000-0000-000000000001', 'Service — Toyota Axio (CAR-0001)', 'Next service approaching. Current: 15,200 km, Next: 20,000 km', '2026-09-01', 'service_due', '40000000-0000-0000-0000-000000000001', false, '20000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000002', 'Service Overdue — Nissan Bluebird (CAR-0004)', 'Service was due at 78,000 km. Currently under repair.', '2026-07-05', 'service_overdue', '40000000-0000-0000-0000-000000000006', false, '20000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000003', 'Oil Change — Toyota Prius (CAR-0002)', 'Complete oil change and hybrid battery check', '2026-08-15', 'service_due', '40000000-0000-0000-0000-000000000002', false, '20000000-0000-0000-0000-000000000002'),
-- Rental-related
('90000000-0000-0000-0000-000000000004', 'Rental Ending — Toyota Prius (Kasun Perera)', 'Rental ends 2026-07-20. Check vehicle condition and process return.', '2026-07-20', 'rental_end', '70000000-0000-0000-0000-000000000001', false, '20000000-0000-0000-0000-000000000002'),
('90000000-0000-0000-0000-000000000005', 'Rental Ending — Nissan Caravan (Rohan Silva)', 'Rental ends 2026-07-17. Tour group returning.', '2026-07-17', 'rental_end', '70000000-0000-0000-0000-000000000002', false, '20000000-0000-0000-0000-000000000003'),
('90000000-0000-0000-0000-000000000006', 'Overdue Follow-up — Honda Fit (Nimali F.)', 'Rental overdue since 2026-07-10. Contact customer immediately.', '2026-07-11', 'rental_end', '70000000-0000-0000-0000-000000000009', false, '20000000-0000-0000-0000-000000000001'),
-- Booked pickup
('90000000-0000-0000-0000-000000000007', 'Pickup — Toyota Axio (Priyanka J.)', 'Scheduled pickup at 9 AM, 2026-07-20. Prepare vehicle and documents.', '2026-07-20', 'booked_pickup', '70000000-0000-0000-0000-000000000007', false, '20000000-0000-0000-0000-000000000004'),
('90000000-0000-0000-0000-000000000008', 'Pickup — Prado (Malini A.)', 'VIP pickup for wedding on 2026-08-01. Ensure full groom and decoration.', '2026-08-01', 'booked_pickup', '70000000-0000-0000-0000-000000000008', false, '20000000-0000-0000-0000-000000000005'),
-- Custom
('90000000-0000-0000-0000-000000000009', 'Renew Insurance for all vehicles', 'Check and renew expiring insurance policies. Axio expires 2027-01-15.', '2026-12-01', 'custom', NULL, false, '20000000-0000-0000-0000-000000000001'),
('90000000-0000-0000-0000-000000000010', 'Monthly supplier payment — Perera Motors', 'Process monthly payment of Rs.35,000 for Honda Fit (ABC-1234)', '2026-07-05', 'custom', NULL, true, '20000000-0000-0000-0000-000000000001');

-- ================================================================
-- 13. ATTENDANCE (2 weeks: July 1-14, 2026 — dynamically generated)
-- ================================================================
-- Attendance pattern per employee:
--   Amil:   always On Time, 08:00–17:30
--   Chanuka: Late on Jul 2 & 7, else On Time
--   Saman:   Late on Jul 4, else On Time
--   Sunil:   Absent on Jul 3 & 10, Late on Jul 4, else On Time
--   Kamal:   Late on Jul 9, else On Time
DO $$
DECLARE
  emp_id UUID;
  emp_name TEXT;
  emp_email TEXT;
  d DATE;
  st TEXT;
  cin TIMESTAMPTZ;
  cout TIMESTAMPTZ;
BEGIN
  FOR emp_id, emp_name, emp_email IN
    SELECT id, full_name, email FROM users ORDER BY id
  LOOP
    FOR d IN
      SELECT gen_day::date FROM generate_series('2026-07-01'::date, '2026-07-14'::date, '1 day') AS gen_day
      WHERE EXTRACT(DOW FROM gen_day) NOT IN (0, 6)
    LOOP
      st := CASE
        WHEN emp_id = '20000000-0000-0000-0000-000000000004' AND d IN ('2026-07-03','2026-07-10') THEN 'Absent'
        WHEN emp_id = '20000000-0000-0000-0000-000000000002' AND d IN ('2026-07-02','2026-07-07') THEN 'Late'
        WHEN emp_id = '20000000-0000-0000-0000-000000000003' AND d = '2026-07-04' THEN 'Late'
        WHEN emp_id = '20000000-0000-0000-0000-000000000004' AND d = '2026-07-04' THEN 'Late'
        WHEN emp_id = '20000000-0000-0000-0000-000000000005' AND d = '2026-07-09' THEN 'Late'
        ELSE 'On Time'
      END;
      cin := CASE WHEN st = 'Absent' THEN NULL ELSE (d || ' 08:00:00+05:30')::TIMESTAMPTZ END;
      cout := CASE WHEN st = 'Absent' OR d = '2026-07-14' THEN NULL ELSE (d || ' 17:00:00+05:30')::TIMESTAMPTZ END;
      IF st = 'On Time' AND d != '2026-07-14' THEN
        cout := (d || ' 17:30:00+05:30')::TIMESTAMPTZ;
      END IF;
      INSERT INTO attendance (id, employee_id, employee_name, employee_email, check_in, check_out, status, working_hours, created_at)
      VALUES (
        gen_random_uuid(), emp_id, emp_name, emp_email, cin, cout, st,
        CASE WHEN st = 'Absent' THEN NULL ELSE '9h 00m' END,
        (d || ' 00:00:00+05:30')::TIMESTAMPTZ
      );
    END LOOP;
  END LOOP;
END;
$$;

-- ================================================================
-- 14. SIGNED_AGREEMENTS (5)
-- ================================================================
INSERT INTO signed_agreements (id, rental_id, file_name, storage_url, storage_path, created_by)
VALUES
('a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Rental_Agreement_R1_Kasun_Perera.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement+1', 'signed-agreements/RNT-00001_kasun_perera.pdf', '20000000-0000-0000-0000-000000000002'),
('a0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003', 'Rental_Agreement_R3_Nimali.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement+3', 'signed-agreements/RNT-00003_nimali_fernando.pdf', '20000000-0000-0000-0000-000000000004'),
('a0000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000004', 'Rental_Agreement_R4_Thushara.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement+4', 'signed-agreements/RNT-00004_thushara.pdf', '20000000-0000-0000-0000-000000000002'),
('a0000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000005', 'Rental_Agreement_R5_Dinesh.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement+5', 'signed-agreements/RNT-00005_dinesh.pdf', '20000000-0000-0000-0000-000000000003'),
('a0000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000010', 'Rental_Agreement_R10_Kasun_Perera.pdf', 'https://placehold.co/800x1000/e2e8f0/64748b?text=Signed+Agreement+10', 'signed-agreements/RNT-00010_kasun_perera.pdf', '20000000-0000-0000-0000-000000000004');

-- ================================================================
-- 15. ACTIVITY_LOGS (25 — all modules, all actions, with diffs)
-- ================================================================
INSERT INTO activity_logs (id, user_id, user_name, user_role, action, module, entity_id, entity_label, details, old_value, new_value)
VALUES
-- Vehicles
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'created', 'Vehicles', '40000000-0000-0000-0000-000000000001', 'Toyota Axio (CAR-0001)', 'Added new vehicle to fleet', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'created', 'Vehicles', '40000000-0000-0000-0000-000000000002', 'Toyota Prius (CAR-0002)', 'Added new vehicle to fleet', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'employee', 'updated', 'Vehicles', '40000000-0000-0000-0000-000000000006', 'Nissan Bluebird (CAR-0004)', 'Vehicle sent to garage for gearbox repair', '{"status":"available"}', '{"status":"in_garage"}'),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'employee', 'status_changed', 'Vehicles', '40000000-0000-0000-0000-000000000008', 'Toyota Hilux (CAR-0005)', 'Status changed', 'Available', 'Booked'),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'deleted', 'Vehicles', '00000000-0000-0000-0000-000000000099', 'Old Test Vehicle (XX-0000)', 'Removed test vehicle from system', NULL, NULL),
-- Rentals
(gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'employee', 'created', 'Rentals', '70000000-0000-0000-0000-000000000001', 'Toyota Prius - Kasun Perera', 'New rental created — 10 days', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'employee', 'created', 'Rentals', '70000000-0000-0000-0000-000000000002', 'Nissan Caravan - Rohan Silva', 'New rental for tour group', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Sunil Rathnayake', 'employee', 'activated', 'Rentals', '70000000-0000-0000-0000-000000000001', 'Toyota Prius - Kasun Perera', 'Vehicle picked up by customer', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Sunil Rathnayake', 'employee', 'returned', 'Rentals', '70000000-0000-0000-0000-000000000003', 'Toyota Axio - Nimali Fernando', 'Vehicle returned in good condition', '{"payment_status":"pending"}', '{"payment_status":"paid"}'),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'employee', 'returned', 'Rentals', '70000000-0000-0000-0000-000000000004', 'Mitsubishi Outlander - Thushara W.', 'Vehicle returned with full payment', '{"status":"active"}', '{"status":"returned"}'),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'employee', 'cancelled', 'Rentals', '70000000-0000-0000-0000-000000000006', 'Toyota Hilux - Sanduni Rathnayake', 'Cancelled by customer — personal emergency', '{"status":"booked"}', '{"status":"cancelled"}'),
-- Customers
(gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Kamal Perera', 'employee', 'created', 'Customers', '50000000-0000-0000-0000-000000000001', 'Kasun Perera', 'New customer registration', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Kamal Perera', 'employee', 'created', 'Customers', '50000000-0000-0000-0000-000000000002', 'Nimali Fernando', 'New customer registration', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'employee', 'updated', 'Customers', '50000000-0000-0000-0000-000000000001', 'Kasun Perera', 'Updated phone number and address', '{"phone":"+94 77 999 9999"}', '{"phone":"+94 77 123 4567"}'),
-- Suppliers
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'created', 'Suppliers', '30000000-0000-0000-0000-000000000001', 'Perera Motors', 'New supplier added', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'created', 'Suppliers', '30000000-0000-0000-0000-000000000002', 'Lanka Auto Traders', 'New supplier for SUV and van supply', NULL, NULL),
-- Guarantors
(gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'employee', 'created', 'Guarantors', '60000000-0000-0000-0000-000000000001', 'Lakshman Perera', 'New guarantor for Kasun Perera', NULL, NULL),
-- Users
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'created', 'Users', '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'New employee account created', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'created', 'Users', '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'New employee account created', NULL, NULL),
-- Settings
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'updated', 'Settings', '00000000-0000-0000-0000-000000000001', 'Company Settings', 'Updated service interval from 5000 to 7000', '{"service_interval_km":5000}', '{"service_interval_km":7000}'),
-- Uploads
(gen_random_uuid(), '20000000-0000-0000-0000-000000000004', 'Sunil Rathnayake', 'employee', 'uploaded', 'Vehicles', '40000000-0000-0000-0000-000000000001', 'Toyota Axio (CAR-0001)', 'Uploaded insurance and revenue license documents', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000005', 'Kamal Perera', 'employee', 'uploaded', 'Customers', '50000000-0000-0000-0000-000000000001', 'Kasun Perera', 'Uploaded NIC and driving license documents', NULL, NULL),
-- Login
(gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'admin', 'login', 'Users', '20000000-0000-0000-0000-000000000001', 'Amil Fernando', 'User logged in', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'employee', 'login', 'Users', '20000000-0000-0000-0000-000000000002', 'Chanuka Wijesinghe', 'User logged in', NULL, NULL),
(gen_random_uuid(), '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'employee', 'login', 'Users', '20000000-0000-0000-0000-000000000003', 'Saman Jayasuriya', 'User logged in', NULL, NULL);

-- ================================================================
-- 16. WHATSAPP_TEMPLATES (already seeded by migration 00019)
-- ================================================================
-- These 5 templates are auto-inserted by migration — skip if exists:

-- ================================================================
-- 17. WHATSAPP_MESSAGE_LOGS (8)
-- ================================================================
INSERT INTO whatsapp_message_logs (id, customer, channel, message, status)
VALUES
(gen_random_uuid(), 'Kasun Perera', 'both', 'Dear Kasun, your Toyota Prius rental is confirmed for Jul 10-20, 2026. Daily rate: LKR 5,500. Pickup from Colombo 03. Thank you for choosing MRC!', 'Delivered'),
(gen_random_uuid(), 'Nimali Fernando', 'whatsapp', 'Reminder: Your rental return is scheduled for Jul 5, 2026. Please ensure the vehicle is returned with a full tank. Safe travels!', 'Read'),
(gen_random_uuid(), 'Rohan Silva', 'both', 'Your Nissan Caravan rental is active from Jul 12-17. For any assistance, call +94 11 234 5678. Thank you!', 'Delivered'),
(gen_random_uuid(), 'Thushara Wickramasinghe', 'email', 'Invoice #RNT-00004: Total LKR 85,000. Thank you for your business. Payment received via bank transfer.', 'Sent'),
(gen_random_uuid(), 'Priyanka Jayawardena', 'both', 'Reminder: Your Toyota Axio pickup is on Jul 20 at 9:00 AM. Please bring your driving license and NIC. We look forward to serving you!', 'Delivered'),
(gen_random_uuid(), 'Malini Abeywardena', 'whatsapp', 'Your Land Cruiser Prado booking for Aug 1-10 is confirmed. 50% advance (LKR 75,000) received. We will provide a decorated vehicle for the wedding.', 'Read'),
(gen_random_uuid(), 'Dinesh Gunasekara', 'both', 'Happy Birthday, Dinesh! MRC wishes you a wonderful day. Enjoy 10% off on your next rental as our gift.', 'Delivered'),
(gen_random_uuid(), 'Sanduni Rathnayake', 'email', 'Your booking for Toyota Hilux (Jul 18-22) has been cancelled per your request. No cancellation fee applied. We hope to serve you soon.', 'Sent');

-- ================================================================
-- 18. VEHICLE_UPDATES (10 sample entries)
-- ================================================================
INSERT INTO vehicle_updates (vehicle_id, update_date, current_km, description, update_type, created_by) VALUES
('40000000-0000-0000-0000-000000000001', '2026-07-10', 15100, 'Oil change and filter replacement', 'service', '20000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000001', '2026-06-25', 14700, 'Front brake pads replaced', 'insurance', '20000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000002', '2026-07-05', 38000, 'Hybrid battery health check - passed', 'general', '20000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000002', '2026-06-15', 37000, 'Tire rotation and alignment', 'revenue_license', '20000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000004', '2026-06-20', 60000, 'AC gas refill', 'service', '20000000-0000-0000-0000-000000000004'),
('40000000-0000-0000-0000-000000000005', '2026-07-01', 104000, 'Full service - all filters replaced', 'service', '20000000-0000-0000-0000-000000000005'),
('40000000-0000-0000-0000-000000000003', '2026-07-12', 51800, 'Wiper blades replaced', 'eco_test', '20000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000008', '2026-07-08', 9400, 'First service - 10,000km check', 'service', '20000000-0000-0000-0000-000000000004'),
('40000000-0000-0000-0000-000000000006', '2026-04-10', 78000, 'Gearbox overhaul - major repair', 'service', '20000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000010', '2026-06-30', 127500, 'Air filter and cabin filter replaced', 'service', '20000000-0000-0000-0000-000000000005');

COMMIT;

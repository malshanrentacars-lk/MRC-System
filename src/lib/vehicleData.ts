// MRC vehicle reference data

export const BRANDS = [
  { name: "Toyota", models: ["Corolla","Axio","Premio","Allion","Vitz","Aqua","Prius","Raize","CHR","Land Cruiser Prado","Land Cruiser","Rush","KDH","Hiace","Noah","Voxy","Yaris","Belta", "Other"] },
  { name: "Suzuki", models: ["Alto","Japan-Alto","Wagon R","Baleno","Celerio","Swift","Every","Spacia","Other"] },
  { name: "Nissan", models: ["Sunny","X-Trail","Leaf","March","Dayz","Caravan","magnite ","Other"] },
  { name: "Honda", models: ["Fit","Vezel","Civic","Grace","CR-V","insight","GP01","GP05","Other"] },
  { name: "Mitsubishi", models: ["Lancer","Outlander","Montero","Pajero","Eclipse Cross","Other"] },
  { name: "Mazda", models: ["Demio","Axela","CX-5","Other"] },
  { name: "Hyundai", models: ["Grand i10","Eon","Tucson","Santa Fe","Other"] },
  { name: "Kia", models: ["Picanto","Sportage","Sorento","Other"] },
  { name: "Daihatsu", models: ["Mira","Tanto","Hijet","Other"] },
  { name: "Perodua", models: ["Axia","Bezza","Myvi","Other"] },
  { name: "BMW", models: ["3 Series","5 Series","X1","X5","Other"] },
  { name: "Mercedes-Benz", models: ["C-Class","E-Class","Other"] },
  { name: "Audi", models: ["A4","Q5","Other"] },
  { name: "Land Rover", models: ["Range Rover","Other"] },
  { name: "MG", models: ["ZS"] },
  { name: "DFSK", models: ["I Auto"] },
  { name: "Renault", models: ["Kwid"] },
  { name: "Mahindra", models: ["Kuv 100"] },
  { name: "Other", models: ["Other"] },
] as const;

export type BrandName = (typeof BRANDS)[number]["name"];

export function getModels(brand: string): string[] {
  const found = BRANDS.find(b => b.name === brand);
  return found ? [...found.models] : ["Other"];
}

export const COLORS = [
  "White","Silver","Black","Gray","Red","Blue","Green",
  "Brown","Gold","Maroon","Navy Blue","Pearl White","Other",
];

export const FUEL_TYPES = ["Petrol","Diesel","Hybrid","Electric","Gas","Other"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSION_TYPES = ["Automatic","Manual","Tiptronic"] as const;
export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

export const PAYMENT_TYPES = ["Full","Half"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const VEHICLE_TYPES = ["Sedan","Hatchback","SUV","Van","Pickup","Bus","Other"] as const;

/**
 * Calculate the 4 rate tiers from a monthly rate.
 * Tiers:
 *   1 Week  (1–7 days):   M/30 + 2000
 *   2 Weeks (8–14 days):  M/30 + 1500
 *   3 Weeks (15–21 days): M/30 + 1000
 *   1 Month (22+ days):   M/30
 */
export function calcTiersFromMonthly(monthly: number) {
  const base = monthly / 30;
  return [
    { label: "1 Week",  days_from: 1,  days_to: 7,    rate_per_day: Math.round(base + 2000) },
    { label: "2 Weeks", days_from: 8,  days_to: 14,   rate_per_day: Math.round(base + 1500) },
    { label: "3 Weeks", days_from: 15, days_to: 21,   rate_per_day: Math.round(base + 1000) },
    { label: "1 Month", days_from: 22, days_to: 30, rate_per_day: Math.round(base) },
  ];
}

export const TIER_LABELS = ['1 Week', '2 Weeks', '3 Weeks', '1 Month'];

export const YEARS = Array.from({ length: 2026 - 2000 + 1 }, (_, i) => 2026 - i); // 2026 down to 2000

export const BANKS = [
  "Amana Bank PLC",
  "Bank of Ceylon",
  "Bank of China Ltd",
  "Cargills Bank PLC",
  "Citibank, N.A.",
  "Commercial Bank of Ceylon PLC",
  "Deutsche Bank AG, Colombo Branch",
  "DFCC Bank PLC",
  "Habib Bank Ltd",
  "Hatton National Bank PLC",
  "Indian Bank",
  "Indian Overseas Bank",
  "MCB Bank Ltd",
  "National Development Bank PLC",
  "Nations Trust Bank PLC",
  "Pan Asia Banking Corporation PLC",
  "People's Bank",
  "Public Bank Berhad",
  "Sampath Bank PLC",
  "Seylan Bank PLC",
  "Standard Chartered Bank",
  "State Bank of India",
  "The Hongkong & Shanghai Banking",
  "Union Bank of Colombo PLC",
] as const;
export type Bank = (typeof BANKS)[number];

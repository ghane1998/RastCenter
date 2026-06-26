export interface EqSpec {
  key: string;
  value: string;
}

export type EqCategory = string;

export type EqStatus = 'موجود' | 'اجاره شده' | 'تعمیر';

export interface Equipment {
  id: string;
  name: string;
  category: EqCategory;
  dailyRate: number; // in Tomans
  specs: EqSpec[];
  status: EqStatus;
  assetCode?: string; // Manually defined asset code
  barcode?: string;   // Barcode number for scanning
}

export interface StaffSpecialty {
  role: string;
  wage: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  dailyWage: number; // in Tomans
  experience: string;
  phone: string;
  avatarUrl?: string; // Base64 profile photo data url
  specialties?: StaffSpecialty[]; // List of roles with separate wages
}

export interface ProjectStaff {
  staffId: string;
  customWage: number;
  days: number;
  selectedRole?: string; // which role/specialty is chosen for this project
}

export type ProjectStatus = 'پیش‌نویس' | 'پرداخت بیعانه' | 'تسویه شده' | 'لغو شده';

export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  deliveryTime: string; // HH:MM
  returnTime: string; // HH:MM
  selectedEquipmentIds: string[];
  selectedStaff: ProjectStaff[];
  discountPercent: number;
  equipmentCost: number;
  staffCost: number;
  totalCost: number;
  status: ProjectStatus;
  createdAt: string; // YYYY-MM-DD
  pricingModel?: 'daily' | 'project'; // Pricing model choice: daily or flat project
  equipmentCustomRates?: { [equipmentId: string]: number }; // Project-specific custom daily rate overrides
}

export interface Reservation {
  id: string;
  equipmentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  clientName: string;
  projectName: string;
}

export interface AppSettings {
  defaultDeliveryHour: string;
  defaultReturnHour: string;
  currency: string;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  fontFamily?: 'vazir' | 'sahel' | 'parastoo' | 'gandom' | 'yekan';
  logoUrl?: string; // Base64 logo for printed invoice
  appLogoUrl?: string; // Base64 logo for the app / software navigation
  terms?: string; // Terms and notes printed inside invoice
  signatureLabel?: string; // Legal Stamp/Signature label text
  showSignature?: boolean; // Toggle stamp display on/off
  equipmentCategories?: string[]; // Customizable list of equipment categories
  staffCategories?: string[]; // Customizable list of staff roles / categories
}

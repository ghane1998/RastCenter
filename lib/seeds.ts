import { Equipment, Staff, Project, Reservation, AppSettings } from './types';

// Jalali (Solar Hijri) converters
export function toJalali(gy: number, gm: number, gd: number): string {
  if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return '';
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
  let jy = gy - 621;
  let gd_sum = gd + g_d_m[gm - 1];
  if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    gd_sum++;
  }
  let jd_sum = gd_sum - 79;
  if (jd_sum <= 0) {
    jy--;
    jd_sum += 365 + (((jy % 4 === 0 && jy % 100 !== 0) || jy % 400 === 0) ? 1 : 0);
  }
  let jm = 1;
  if (jd_sum <= 186) {
    jm = Math.floor((jd_sum - 1) / 31) + 1;
    jd_sum = ((jd_sum - 1) % 31) + 1;
  } else {
    const rem = jd_sum - 186;
    jm = Math.floor((rem - 1) / 30) + 7;
    jd_sum = ((rem - 1) % 30) + 1;
  }
  return `${jy}/${jm.toString().padStart(2, '0')}/${jd_sum.toString().padStart(2, '0')}`;
}

export function formatStringDateToJalali(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const gy = parseInt(parts[0]);
  const gm = parseInt(parts[1]);
  const gd = parseInt(parts[2]);
  return toJalali(gy, gm, gd);
}

// Format numbers nicely to Persian/Fa locale currency
export function formatCurrency(amount: number, suffix: string = 'تومان'): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' ' + suffix;
}

export const INITIAL_SETTINGS: AppSettings = {
  defaultDeliveryHour: '09:00',
  defaultReturnHour: '18:00',
  currency: 'تومان',
  companyName: 'گروه هنر و رسانه رَست',
  companyPhone: '۰۲۱-۸۸۸۸۸۸۸۸',
  companyAddress: 'تهران، خیابان ولیعصر، نرسیده به مطهری، پلاک ۱۲، واحد ۳',
  fontFamily: 'vazir',
  logoUrl: '',
  appLogoUrl: '',
  terms: '۱. کالا پس از تحویل در سلامت کامل بوده و مسئولیت نگهداری و پوشش بیمه آن بر عهده مشتری است.\n۲. هرگونه تاخیر در بازگردانی کالا مشمول جریمه معادل نصف هزینه یا کل هزینه یک روز اجاره خواهد بود.\n۳. رنت‌کننده متعهد به رعایت حقوق مادی و معنوی مالک برند و تجهیزات می‌باشد.',
  signatureLabel: 'مهر و امضا گروه هنر و رسانه رَست',
  showSignature: true,
  equipmentCategories: ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه'],
  staffCategories: ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی', 'مدیر تولید / منشی صحنه'],
};

export const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'EQ-01',
    name: 'Sony Alpha A7S III (بدنه)',
    category: 'دوربین',
    dailyRate: 1500000,
    specs: [
      { key: 'وضوح تصویر', value: '12.1 مگاپیکسل' },
      { key: 'کیفیت فیلمبرداری', value: '4K 120p کدهای 10-bit' },
      { key: 'ایزو (ISO)', value: '۸۰ تا ۴۰۹,۶۰۰' },
      { key: 'دهانه نگهدارنده', value: 'سونی E-Mount (Full Frame)' },
      { key: 'لرزشگیر', value: '۵ محوره داخل بدنه' }
    ],
    status: 'موجود',
    assetCode: 'AM-1001',
    barcode: 'AM-1001'
  },
  {
    id: 'EQ-02',
    name: 'RED Komodo 6K Cinema Camera',
    category: 'دوربین',
    dailyRate: 4500000,
    specs: [
      { key: 'وضوح تصویر', value: 'سنسور 19.9MP Super35' },
      { key: 'شاتر', value: 'Global Shutter (بدون اعوجاج)' },
      { key: 'فرمت ضبط', value: 'REDCODE RAW و Apple ProRes' },
      { key: 'دهانه نگهدارنده', value: 'Canon RF' },
      { key: 'پایه خروجی', value: '12G-SDI با کیفیت عالی' }
    ],
    status: 'موجود',
    assetCode: 'AM-1002',
    barcode: 'AM-1002'
  },
  {
    id: 'EQ-03',
    name: 'Canon RF 24-70mm f/2.8L IS USM',
    category: 'لنز',
    dailyRate: 800000,
    specs: [
      { key: 'فاصله کانونی', value: '۲۴ تا ۷۰ میلی‌متر' },
      { key: 'بیشینه دیافراگم', value: 'f/2.8 ثابت' },
      { key: 'مدل مانت', value: 'Canon RF' },
      { key: 'سری لنز', value: 'سری لوکس L قرمز برتر' },
      { key: 'لرزشگیر', value: '۵ پله لرزشگیر اپتیکال' }
    ],
    status: 'موجود',
    assetCode: 'AM-1003',
    barcode: 'AM-1003'
  },
  {
    id: 'EQ-04',
    name: 'Samyang VDSLR Cine Lens Kit (EF mount)',
    category: 'لنز',
    dailyRate: 1200000,
    specs: [
      { key: 'پکیج شامل', value: 'لنزهای فیکس ۲۴، ۳۵، ۵۰ و ۸۵ میلی‌متر' },
      { key: 'دیافراگم سینمایی', value: 'T1.5 برای بوکه جذاب' },
      { key: 'ساختار رینگ', value: 'فوکوس روان دندانه‌دار برای فالوفوکوس' },
      { key: 'مانت لنز', value: 'Canon EF / قابلیت انطباق' }
    ],
    status: 'موجود',
    assetCode: 'AM-1004',
    barcode: 'AM-1004'
  },
  {
    id: 'EQ-05',
    name: 'DJI Ronin 2 Professional Gimbal',
    category: 'تجهیزات حرکتی/پایه',
    dailyRate: 2000000,
    specs: [
      { key: 'تحمل وزن ناخالص', value: 'تا ۱۳.۶ کیلوگرم' },
      { key: 'سیستم باتری', value: 'دوبل هوشمند با قابلیت تعویض گرم' },
      { key: 'سازگاری بدنه', value: 'دوربین‌های آلکسا مینی، رد، سونی' },
      { key: 'متعلقات', value: 'رینگ کینگ شاک، ریموت کنترل، ۲ ست باتری' }
    ],
    status: 'اجاره شده',
    assetCode: 'AM-1005',
    barcode: 'AM-1005'
  },
  {
    id: 'EQ-06',
    name: 'Sachtler Flowtech 75 Tripod System',
    category: 'تجهیزات حرکتی/پایه',
    dailyRate: 500000,
    specs: [
      { key: 'جنس پایه‌ها', value: 'فیبر کربن پیشرفته سبک وزن' },
      { key: 'سر هیدرولیکی', value: 'Sachtler FSB 6/8' },
      { key: 'ارتفاع مجاز', value: '۲۶ تا ۱۵۷ سانتی‌متر' },
      { key: 'مکانیزم بازشو', value: 'قفل‌های ریلی سریع و انقلابی' }
    ],
    status: 'موجود',
    assetCode: 'AM-1006',
    barcode: 'AM-1006'
  },
  {
    id: 'EQ-07',
    name: 'Zoom H6 Portable Handy Recorder',
    category: 'صدابرداری',
    dailyRate: 400000,
    specs: [
      { key: 'ورودی‌ها', value: '۴ ورودی XLR/TRS همزمان + ماژول کپسول' },
      { key: 'رزولوشن ضبط', value: '۲۴ بیت / ۹۶ کیلوهرتز' },
      { key: 'کارت حافظه', value: 'تا ۱۲۸ گیگابایت SDXC' },
      { key: 'کپسول‌های روی پکیج', value: 'میکروفون استریو XY و کپسول Mid-Side' }
    ],
    status: 'موجود',
    assetCode: 'AM-1007',
    barcode: 'AM-1007'
  },
  {
    id: 'EQ-08',
    name: 'Sennheiser ew 112P G4 Wireless Lapel',
    category: 'صدابرداری',
    dailyRate: 600000,
    specs: [
      { key: 'سیستم انتن دهی', value: 'UHF با رنج فرکانس منعطف' },
      { key: 'برد سیگنال مجاز', value: 'تا ۱۰۰ متر شعاع خط دید مستقیم' },
      { key: 'میکروفون متصل', value: 'یقه‌ای ME 2-II ارتقا یافته' },
      { key: 'عمر باتری فرستنده', value: 'حدود ۸ ساعت مداوم' }
    ],
    status: 'موجود',
    assetCode: 'AM-1008',
    barcode: 'AM-1008'
  },
  {
    id: 'EQ-09',
    name: 'Aputure Light Storm LS 600d Pro',
    category: 'نورپردازی',
    dailyRate: 1800000,
    specs: [
      { key: 'حداکثر توان مصرفی', value: '۶۰۰ وات خروجی نوری کالیبره' },
      { key: 'دمای رنگ نوری', value: '۵۶00K (کلوین نور روز)' },
      { key: 'مقاومت فیزیکی', value: 'ضد آب و ضد گرد و خاک IP54' },
      { key: 'دهانه اتصال', value: 'مانت Bowen (دهانه ملحقات نور)' },
      { key: 'لوازم جانبی همراه', value: 'سافت باکس لترن، پایه‌نوری سنگین، چتر' }
    ],
    status: 'موجود',
    assetCode: 'AM-1009',
    barcode: 'AM-1009'
  },
  {
    id: 'EQ-10',
    name: 'Godox SZ150R Zoom RGB LED Light',
    category: 'نورپردازی',
    dailyRate: 700000,
    specs: [
      { key: 'توان مصرفی', value: '۱۵۰ وات تمام رنگی بی رقیب' },
      { key: 'حالت‌های رنگی', value: 'RGB / HSI / CCT با کنترل زوم' },
      { key: 'جلوه‌های ویژه', value: '۳۷ افکت پیش‌فرض محیطی' }
    ],
    status: 'موجود',
    assetCode: 'AM-1010',
    barcode: 'AM-1010'
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: 'ST-01',
    name: 'سهراب امینی',
    role: 'تصویربردار و مدیر فیلمبرداری',
    dailyWage: 2000000,
    experience: '۸ سال حضور حرفه‌ای در سینما و تیزر',
    phone: '۰۹۱۲۱۱۱۱۱۱۱',
    specialties: [
      { role: 'تصویربردار و مدیر فیلمبرداری', wage: 2000000 },
      { role: 'دستیار اول تصویر و فالوفوکوسر', wage: 1200000 }
    ]
  },
  {
    id: 'ST-02',
    name: 'نازنین راد',
    role: 'صدابردار ارشد صحنه',
    dailyWage: 1500000,
    experience: '۵ سال تخصصی ضبط صدای مستقیم فیلم و مستند',
    phone: '۰۹۱۲۲۲۲۲۲۲۲',
    specialties: [
      { role: 'صدابردار ارشد صحنه', wage: 1500000 }
    ]
  },
  {
    id: 'ST-03',
    name: 'بردیا صدر',
    role: 'طراح نور و نورپرداز',
    dailyWage: 1800000,
    experience: '۶ سال طراح تجاری و سینمایی پروژه های تبلیغاتی',
    phone: '۰۹۱۲۳۳۳۳۳۳۳',
    specialties: [
      { role: 'طراح نور و نورپرداز', wage: 1800000 },
      { role: 'اپراتور کرین / دستیار فنی', wage: 1100000 }
    ]
  },
  {
    id: 'ST-04',
    name: 'کیان آریا',
    role: 'دستیار اول تصویر و فالوفوکوسر',
    dailyWage: 900000,
    experience: '۳ سال فعالیت متمرکز کنار مدیران فیلمبرداری',
    phone: '۰۹۱۲۴۴۴۴۴۴۴',
    specialties: [
      { role: 'دستیار اول تصویر و فالوفوکوسر', wage: 900000 }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'RC-1001',
    projectName: 'قصر پاییز (تیزر برندینگ)',
    clientName: 'آژانس تبلیغاتی بادکوبه',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    deliveryTime: '09:00',
    returnTime: '18:00',
    selectedEquipmentIds: ['EQ-01', 'EQ-03', 'EQ-06'], // Sony A7S3, 24-70 lens, Sachtler Tripod. Rent = 1.5M + 0.8M + 0.5M = 2.8M per day. Total Equipment = 3 days * 2.8M = 8.4M.
    selectedStaff: [
      { staffId: 'ST-01', customWage: 2000000, days: 3 }, // Sohrab: 3 * 2.0 = 6.0M
      { staffId: 'ST-04', customWage: 900000, days: 3 } // Kian: 3 * 0.9 = 2.7M
    ],
    discountPercent: 5, // 5% discount
    equipmentCost: 8400000,
    staffCost: 8700000,
    totalCost: 16245000, // (8.4M + 8.7M) * 0.95 = 17.1M * 0.95 = 16,245,000
    status: 'تسویه شده',
    createdAt: '2026-06-08',
  },
  {
    id: 'RC-1002',
    projectName: 'فیلم کوتاه کویر سکوت',
    clientName: 'سازمان سینمایی هنر و نور',
    startDate: '2026-06-18',
    endDate: '2026-06-21',
    deliveryTime: '08:00',
    returnTime: '20:00',
    selectedEquipmentIds: ['EQ-02', 'EQ-05', 'EQ-09'], // RED Komodo, Ronin 2, Aputure 600d. Daily rate = 4.5M + 2M + 1.8M = 8.3M. Total = 4 days * 8.3M = 33,200,000 Toman.
    selectedStaff: [
      { staffId: 'ST-01', customWage: 2000000, days: 4 }, // Sohrab: 4 * 2.0 = 8.0M
      { staffId: 'ST-03', customWage: 1800000, days: 4 } // Bardia: 4 * 1.8 = 7.2M
    ],
    discountPercent: 0,
    equipmentCost: 33200000,
    staffCost: 15200000,
    totalCost: 48400000, // 33.2 + 15.2 = 48.4M
    status: 'پرداخت بیعانه',
    createdAt: '2026-06-15',
  },
  {
    id: 'RC-1003',
    projectName: 'مستند گلهای صخره',
    clientName: 'ستاد مستند حیات ایران',
    startDate: '2026-06-26',
    endDate: '2026-06-28',
    deliveryTime: '10:00',
    returnTime: '17:00',
    selectedEquipmentIds: ['EQ-01', 'EQ-03', 'EQ-07', 'EQ-08'], // Sony A7S3, 24-70 lens, Zoom H6, Wireless mic. Daily rate = 1.5 + 0.8 + 0.4 + 0.6 = 3.3M. Total = 3 days * 3.3M = 9,900,000
    selectedStaff: [
      { staffId: 'ST-02', customWage: 1500000, days: 3 } // Nazanin: 3 * 1.5M = 4.5M
    ],
    discountPercent: 10,
    equipmentCost: 9900000,
    staffCost: 4500000,
    totalCost: 12960000, // (9.9 + 4.5) * 0.9 = 14.4 * 0.9 = 12,960,000
    status: 'پیش‌نویس',
    createdAt: '2026-06-22',
  }
];

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'RES-01',
    equipmentId: 'EQ-01',
    startDate: '2026-06-26',
    endDate: '2026-06-28',
    clientName: 'ستاد مستند حیات ایران',
    projectName: 'مستند گلهای صخره',
  },
  {
    id: 'RES-02',
    equipmentId: 'EQ-03',
    startDate: '2026-06-26',
    endDate: '2026-06-28',
    clientName: 'ستاد مستند حیات ایران',
    projectName: 'مستند گلهای صخره',
  }
];

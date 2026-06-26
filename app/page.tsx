'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Camera, 
  Users, 
  FileText, 
  CalendarDays, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Eye, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Calendar, 
  Clock, 
  UserCheck, 
  Phone, 
  Sliders, 
  Printer, 
  Search, 
  X, 
  Check, 
  RefreshCcw, 
  BadgeHelp,
  Briefcase
} from 'lucide-react';
import { Equipment, Staff, Project, Reservation, AppSettings, ProjectStatus, EqCategory, EqStatus } from '../lib/types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_EQUIPMENT, 
  INITIAL_STAFF, 
  INITIAL_PROJECTS, 
  INITIAL_RESERVATIONS, 
  formatStringDateToJalali, 
  formatCurrency,
  toJalali
} from '../lib/seeds';
import { calculateRentDays, loadLocalStorageState, saveLocalStorageState } from '../lib/state-store';

// --- Jalali-to-Gregorian High-Precision Conversion Algorithm ---
function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  const jy_offset = jy - 979;
  const jm_offset = jm - 1;
  const jd_offset = jd - 1;
  
  let j_day_no = 365 * jy_offset + Math.floor(jy_offset / 33) * 8 + Math.floor(((jy_offset % 33) + 3) / 4);
  for (let i = 0; i < jm_offset; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd_offset;
  
  let g_day_no = j_day_no + 79;
  
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no %= 146097;
  
  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no %= 36524;
    
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }
  
  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;
  
  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }
  
  const m_lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (g_day_no >= m_lengths[gm - 1]) {
    g_day_no -= m_lengths[gm - 1];
    gm++;
  }
  const gd = g_day_no + 1;
  return `${gy}-${gm.toString().padStart(2, '0')}-${gd.toString().padStart(2, '0')}`;
}

function parseGregorianToJalali(dateStr: string) {
  if (!dateStr) return { jy: 1405, jm: 4, jd: 2 };
  const parts = dateStr.split('-');
  const gy = parseInt(parts[0]) || 2026;
  const gm = parseInt(parts[1]) || 6;
  const gd = parseInt(parts[2]) || 23;
  
  const jalStr = toJalali(gy, gm, gd);
  const jalParts = jalStr.split('/');
  return {
    jy: parseInt(jalParts[0]) || 1405,
    jm: parseInt(jalParts[1]) || 4,
    jd: parseInt(jalParts[2]) || 2
  };
}

export default function RustCenterApp() {
  // --- Core Persistent State (Lazy initializers to read from localStorage) ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === 'undefined') return INITIAL_SETTINGS;
    try {
      const s = localStorage.getItem('rc_settings');
      return s ? JSON.parse(s) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => {
    if (typeof window === 'undefined') return INITIAL_EQUIPMENT;
    try {
      const e = localStorage.getItem('rc_equipment');
      return e ? JSON.parse(e) : INITIAL_EQUIPMENT;
    } catch {
      return INITIAL_EQUIPMENT;
    }
  });

  const [staffList, setStaffList] = useState<Staff[]>(() => {
    if (typeof window === 'undefined') return INITIAL_STAFF;
    try {
      const s = localStorage.getItem('rc_staff');
      return s ? JSON.parse(s) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  const [projectList, setProjectList] = useState<Project[]>(() => {
    if (typeof window === 'undefined') return INITIAL_PROJECTS;
    try {
      const p = localStorage.getItem('rc_projects');
      return p ? JSON.parse(p) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [reservationList, setReservationList] = useState<Reservation[]>(() => {
    if (typeof window === 'undefined') return INITIAL_RESERVATIONS;
    try {
      const r = localStorage.getItem('rc_reservations');
      return r ? JSON.parse(r) : INITIAL_RESERVATIONS;
    } catch {
      return INITIAL_RESERVATIONS;
    }
  });

  // --- UI Navigation State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipment' | 'staff' | 'new-order' | 'invoices' | 'settings'>('dashboard');
  
  // --- Selected Item for Detail Views ---
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Project | null>(null);

  // --- Dynamic Form Temporary States ---
  // 1. New Equipment State
  const [isAddingEq, setIsAddingEq] = useState(false);
  const [newEq, setNewEq] = useState({
    name: '',
    category: 'دوربین' as EqCategory,
    dailyRate: 1000000,
    specs: [{ key: '', value: '' }],
    assetCode: '',
    barcode: ''
  });

  // 2. New Staff State
  const [isAddingSt, setIsAddingSt] = useState(false);
  const [newSt, setNewSt] = useState({
    name: '',
    role: '',
    dailyWage: 1200000,
    experience: '',
    phone: '',
    avatarUrl: '',
    specialties: [] as { role: string; wage: number }[]
  });

  const [isEditingEq, setIsEditingEq] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);

  const [isEditingSt, setIsEditingSt] = useState(false);
  const [editingSt, setEditingSt] = useState<Staff | null>(null);

  // 3. New Booking Reservation State
  const [isReserving, setIsReserving] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    equipmentId: '',
    startDate: '',
    endDate: '',
    clientName: '',
    projectName: ''
  });

  // Jalali Calendar Report States for Equipment Detail
  const [calYear, setCalYear] = useState(1405);
  const [calMonth, setCalMonth] = useState(4);

  // Filter and Input States
  const [mounted, setMounted] = useState(false);
  const [stCatFilter, setStCatFilter] = useState('همه');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [orderBarcodeInput, setOrderBarcodeInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Settings tag list temp inputs
  const [newCatInput, setNewCatInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');

  // 4. New Consolidated Order Creator State (Lazily initialized with current settings values)
  const [orderForm, setOrderForm] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    let initialSettings = INITIAL_SETTINGS;
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem('rc_settings');
        if (s) initialSettings = JSON.parse(s);
      } catch {
        // ignore
      }
    }
    return {
      projectName: '',
      clientName: '',
      startDate: today,
      endDate: today,
      deliveryTime: initialSettings.defaultDeliveryHour,
      returnTime: initialSettings.defaultReturnHour,
      selectedEquipmentIds: [] as string[],
      selectedStaff: [] as { staffId: string; customWage: number; days: number; selectedRole?: string }[],
      discountPercent: 0,
      pricingModel: 'daily' as 'daily' | 'project',
      equipmentCustomRates: {} as { [id: string]: number }
    };
  });

  // --- Save to localStorage on state changes ---
  const triggerSave = (
    nextSettings: AppSettings,
    nextEq: Equipment[],
    nextSt: Staff[],
    nextProj: Project[],
    nextRes: Reservation[]
  ) => {
    setSettings(nextSettings);
    setEquipmentList(nextEq);
    setStaffList(nextSt);
    setProjectList(nextProj);
    setReservationList(nextRes);
    saveLocalStorageState(nextSettings, nextEq, nextSt, nextProj, nextRes);
  };

  // --- Reset/Reseed Handler ---
  const handleResetData = () => {
    if (confirm('آیا از بازنشانی اطلاعات به حالت کارخانه‌ای اطمینان دارید؟ تمام فاکتورهای جدید حذف خواهند شد.')) {
      triggerSave(INITIAL_SETTINGS, INITIAL_EQUIPMENT, INITIAL_STAFF, INITIAL_PROJECTS, INITIAL_RESERVATIONS);
      setSelectedInvoice(null);
      setSelectedEquipment(null);
      setSelectedStaff(null);
      setActiveTab('dashboard');
    }
  };

  // --- Search / Filters ---
  const [eqSearch, setEqSearch] = useState('');
  const [eqCatFilter, setEqCatFilter] = useState<string>('همه');
  const [stSearch, setStSearch] = useState('');

  // --- Dashboard Calculated Metrics ---
  const calculateDashboardMetrics = () => {
    // Current date for comparison
    const now = new Date();
    const currentYearMonth = '2026-06'; // Target 2026 June
    
    let totalSales = 0;
    let monthlySales = 0;
    let totalWagesCost = 0;
    let activeRentalsCount = 0;

    projectList.forEach(proj => {
      if (proj.status !== 'لغو شده') {
        totalSales += proj.totalCost;
        
        // Sum staff wages paid as costs
        totalWagesCost += proj.staffCost;
        
        // Check if project is in current month
        if (proj.startDate.startsWith(currentYearMonth) || proj.createdAt.startsWith(currentYearMonth)) {
          monthlySales += proj.totalCost;
        }

        // Active rentals check
        const start = new Date(proj.startDate);
        const end = new Date(proj.endDate);
        if (now >= start && now <= end) {
          activeRentalsCount += proj.selectedEquipmentIds.length;
        }
      }
    });

    const netIncome = totalSales - totalWagesCost;

    return {
      totalSales,
      monthlySales,
      totalWagesCost,
      netIncome,
      activeRentalsCount
    };
  };

  const metrics = calculateDashboardMetrics();

  // --- Equipment Calculations ---
  // Calculates how many times rented, total income, and list of associated projects
  const getEquipmentReport = (eqId: string) => {
    let timesRented = 0;
    let totalRevenue = 0;
    const history: { projectName: string; clientName: string; dateRange: string; revenue: number }[] = [];

    projectList.forEach(proj => {
      if (proj.status !== 'لغو شده' && proj.selectedEquipmentIds.includes(eqId)) {
        timesRented++;
        const days = calculateRentDays(proj.startDate, proj.deliveryTime, proj.endDate, proj.returnTime);
        const itemInfo = equipmentList.find(e => e.id === eqId);
        if (itemInfo) {
          const itemRate = (proj.equipmentCustomRates && proj.equipmentCustomRates[eqId] !== undefined)
            ? proj.equipmentCustomRates[eqId]
            : itemInfo.dailyRate;
          const itemRevenue = itemRate * (proj.pricingModel === 'project' ? 1 : days);
          totalRevenue += itemRevenue;
          history.push({
            projectName: proj.projectName,
            clientName: proj.clientName,
            dateRange: `${formatStringDateToJalali(proj.startDate)} الی ${formatStringDateToJalali(proj.endDate)}`,
            revenue: itemRevenue
          });
        }
      }
    });

    const reservations = reservationList.filter(res => res.equipmentId === eqId);

    return { timesRented, totalRevenue, history, reservations };
  };

  // --- Staff Calculations ---
  // Calculates projects count, total wage, list of projects, and settlement status
  const getStaffReport = (staffId: string) => {
    let projectCount = 0;
    let totalWages = 0;
    const history: { projectName: string; clientName: string; dateRange: string; wage: number; status: ProjectStatus }[] = [];

    projectList.forEach(proj => {
      const match = proj.selectedStaff.find(s => s.staffId === staffId);
      if (match && proj.status !== 'لغو شده') {
        projectCount++;
        const itemWage = match.customWage * match.days;
        totalWages += itemWage;
        history.push({
          projectName: proj.projectName,
          clientName: proj.clientName,
          dateRange: `${formatStringDateToJalali(proj.startDate)} الی ${formatStringDateToJalali(proj.endDate)}`,
          wage: itemWage,
          status: proj.status
        });
      }
    });

    return { projectCount, totalWages, history };
  };

  // --- Add Equipment Handler ---
  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEq.name.trim()) return;

    const nextId = `EQ-${(equipmentList.length + 1).toString().padStart(2, '0')}`;
    const cleanSpecs = newEq.specs.filter(s => s.key.trim() && s.value.trim());

    const createdEq: Equipment = {
      id: nextId,
      name: newEq.name,
      category: newEq.category,
      dailyRate: newEq.dailyRate,
      specs: cleanSpecs.length > 0 ? cleanSpecs : [{ key: 'وضعیت فنی', value: 'کالیبره عالی' }],
      status: 'موجود',
      assetCode: newEq.assetCode || nextId,
      barcode: newEq.barcode || ''
    };

    const nextList = [...equipmentList, createdEq];
    triggerSave(settings, nextList, staffList, projectList, reservationList);

    // Reset Form
    setIsAddingEq(false);
    setNewEq({
      name: '',
      category: 'دوربین',
      dailyRate: 1000000,
      specs: [{ key: '', value: '' }],
      assetCode: '',
      barcode: ''
    });
  };

  // --- Add Staff Handler ---
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSt.name.trim()) return;

    const nextId = `ST-${(staffList.length + 1).toString().padStart(2, '0')}`;
    const createdSt: Staff = {
      id: nextId,
      name: newSt.name,
      role: newSt.role || 'عوامل صحنه',
      dailyWage: newSt.dailyWage,
      experience: newSt.experience || 'آماده به کار',
      phone: newSt.phone || '۰۹---------',
      avatarUrl: newSt.avatarUrl || '',
      specialties: newSt.specialties && newSt.specialties.length > 0 ? newSt.specialties : [{ role: newSt.role || 'عوامل صحنه', wage: newSt.dailyWage }]
    };

    const nextList = [...staffList, createdSt];
    triggerSave(settings, equipmentList, nextList, projectList, reservationList);

    setIsAddingSt(false);
    setNewSt({
      name: '',
      role: '',
      dailyWage: 1200000,
      experience: '',
      phone: '',
      avatarUrl: '',
      specialties: []
    });
  };

  const openReservingModal = (initialEqId: string = '') => {
    const today = new Date().toISOString().split('T')[0];
    setReservationForm({
      equipmentId: initialEqId,
      startDate: today,
      endDate: today,
      clientName: '',
      projectName: ''
    });
    setIsReserving(true);
  };

  // --- Add Custom Reservation Handler ---
  const handleAddReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const { equipmentId, startDate, endDate, clientName, projectName } = reservationForm;
    if (!equipmentId || !startDate || !endDate || !clientName) {
      alert('لطفا تمامی فیلدهای الزامی رزرو را تکمیل کنید.');
      return;
    }

    const nextId = `RES-${Date.now()}`;
    const newRes: Reservation = {
      id: nextId,
      equipmentId,
      startDate,
      endDate,
      clientName,
      projectName: projectName || 'رزرو مستقیم دفتر'
    };

    const nextReservations = [...reservationList, newRes];
    
    // Update target equipment status if dates match current block (optional, visual only)
    const nextEqList = equipmentList.map(eq => {
      if (eq.id === equipmentId) {
        return { ...eq, status: 'اجاره شده' as EqStatus }; // or keep available for multi-booking
      }
      return eq;
    });

    triggerSave(settings, nextEqList, staffList, projectList, nextReservations);
    
    setIsReserving(false);
    setReservationForm({
      equipmentId: '',
      startDate: '',
      endDate: '',
      clientName: '',
      projectName: ''
    });
    alert('رزرو تاریخ دستگاه با موفقیت در پرونده ثبت شد!');
  };

  // --- Delete Reservation ---
  const handleDeleteReservation = (id: string) => {
    if (confirm('آیا از لغو این رزرو اطمینان دارید؟')) {
      const nextRes = reservationList.filter(r => r.id !== id);
      triggerSave(settings, equipmentList, staffList, projectList, nextRes);
      // Refresh current equipment detail report if open
      if (selectedEquipment) {
        setSelectedEquipment({ ...selectedEquipment });
      }
    }
  };

  // --- Order Form Logic (Derived state computed on-the-fly) ---
  const orderRentDays = calculateRentDays(orderForm.startDate, orderForm.deliveryTime, orderForm.endDate, orderForm.returnTime);

  const toggleEquipmentInOrder = (eqId: string) => {
    setOrderForm(prev => {
      const isSelected = prev.selectedEquipmentIds.includes(eqId);
      const nextList = isSelected 
        ? prev.selectedEquipmentIds.filter(id => id !== eqId)
        : [...prev.selectedEquipmentIds, eqId];
      return { ...prev, selectedEquipmentIds: nextList };
    });
  };

  const toggleStaffInOrder = (staffId: string) => {
    setOrderForm(prev => {
      const isSelected = prev.selectedStaff.some(s => s.staffId === staffId);
      const targetStaff = staffList.find(s => s.id === staffId);
      
      let defaultWage = 1500000;
      let defaultRole = '';
      if (targetStaff) {
        if (targetStaff.specialties && targetStaff.specialties.length > 0) {
          defaultWage = targetStaff.specialties[0].wage;
          defaultRole = targetStaff.specialties[0].role;
        } else {
          defaultWage = targetStaff.dailyWage;
          defaultRole = targetStaff.role;
        }
      }

      const nextList = isSelected
        ? prev.selectedStaff.filter(s => s.staffId !== staffId)
        : [...prev.selectedStaff, { 
            staffId, 
            customWage: defaultWage, 
            days: orderRentDays,
            selectedRole: defaultRole
          }];
      return { ...prev, selectedStaff: nextList };
    });
  };

  const updateStaffDaysInOrder = (staffId: string, days: number) => {
    setOrderForm(prev => {
      const nextList = prev.selectedStaff.map(s => {
        if (s.staffId === staffId) {
          return { ...s, days: Math.max(1, days) };
        }
        return s;
      });
      return { ...prev, selectedStaff: nextList };
    });
  };

  const updateStaffWageInOrder = (staffId: string, wage: number) => {
    setOrderForm(prev => {
      const nextList = prev.selectedStaff.map(s => {
        if (s.staffId === staffId) {
          return { ...s, customWage: Math.max(0, wage) };
        }
        return s;
      });
      return { ...prev, selectedStaff: nextList };
    });
  };

  const updateEquipmentRateInOrder = (eqId: string, customRate: number) => {
    setOrderForm(prev => {
      const nextRates = { ...prev.equipmentCustomRates, [eqId]: Math.max(0, customRate) };
      return { ...prev, equipmentCustomRates: nextRates };
    });
  };

  const updateStaffRoleInOrder = (staffId: string, roleName: string) => {
    setOrderForm(prev => {
      const targetStaff = staffList.find(st => st.id === staffId);
      let matchedWage = 0;
      if (targetStaff && targetStaff.specialties) {
        const found = targetStaff.specialties.find(spec => spec.role === roleName);
        if (found) {
          matchedWage = found.wage;
        }
      }
      const nextList = prev.selectedStaff.map(s => {
        if (s.staffId === staffId) {
          return { 
            ...s, 
            selectedRole: roleName, 
            customWage: matchedWage > 0 ? matchedWage : s.customWage 
          };
        }
        return s;
      });
      return { ...prev, selectedStaff: nextList };
    });
  };

  // Calculate live dynamic totals
  const getLiveOrderCosts = () => {
    let eqCost = 0;
    const isProjectBased = orderForm.pricingModel === 'project';
    orderForm.selectedEquipmentIds.forEach(id => {
      const item = equipmentList.find(e => e.id === id);
      if (item) {
        const rate = (orderForm.equipmentCustomRates && orderForm.equipmentCustomRates[id] !== undefined)
          ? orderForm.equipmentCustomRates[id]
          : item.dailyRate;
        eqCost += rate * (isProjectBased ? 1 : orderRentDays);
      }
    });

    let stCost = 0;
    orderForm.selectedStaff.forEach(s => {
      stCost += s.customWage * (isProjectBased ? 1 : s.days);
    });

    const subTotal = eqCost + stCost;
    const discount = subTotal * (orderForm.discountPercent / 100);
    const finalTotal = subTotal - discount;

    return {
      eqCost,
      stCost,
      subTotal,
      discount,
      finalTotal
    };
  };

  const liveCosts = getLiveOrderCosts();

  // --- Jalali Start / End Date Synchronizers for Direct Reservation Modals ---
  const startJalali = parseGregorianToJalali(reservationForm.startDate);
  const endJalali = parseGregorianToJalali(reservationForm.endDate);

  const handleStartJalaliChange = (key: 'jy' | 'jm' | 'jd', val: number) => {
    const nextJalali = { ...startJalali, [key]: val };
    const gregStr = jalaliToGregorian(nextJalali.jy, nextJalali.jm, nextJalali.jd);
    setReservationForm(prev => ({ ...prev, startDate: gregStr }));
  };

  const handleEndJalaliChange = (key: 'jy' | 'jm' | 'jd', val: number) => {
    const nextJalali = { ...endJalali, [key]: val };
    const gregStr = jalaliToGregorian(nextJalali.jy, nextJalali.jm, nextJalali.jd);
    setReservationForm(prev => ({ ...prev, endDate: gregStr }));
  };

  // Create Project Order Handler
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.projectName.trim() || !orderForm.clientName.trim()) {
      alert('لطفا نام پروژه و نام مشتری را وارد کنید.');
      return;
    }
    if (orderForm.selectedEquipmentIds.length === 0 && orderForm.selectedStaff.length === 0) {
      alert('لطفا حداقل یک وسیله یا یک نفر عامل را آفیش کنید.');
      return;
    }

    const nextId = `RC-${(1000 + projectList.length + 1).toString()}`;
    const { eqCost, stCost, finalTotal } = getLiveOrderCosts();

    const createdProject: Project = {
      id: nextId,
      projectName: orderForm.projectName,
      clientName: orderForm.clientName,
      startDate: orderForm.startDate,
      endDate: orderForm.endDate,
      deliveryTime: orderForm.deliveryTime,
      returnTime: orderForm.returnTime,
      selectedEquipmentIds: orderForm.selectedEquipmentIds,
      selectedStaff: orderForm.selectedStaff,
      discountPercent: orderForm.discountPercent,
      equipmentCost: eqCost,
      staffCost: stCost,
      totalCost: finalTotal,
      status: 'پیش‌نویس', // Start as Draft
      createdAt: new Date().toISOString().split('T')[0],
      pricingModel: orderForm.pricingModel,
      equipmentCustomRates: orderForm.equipmentCustomRates
    };

    // Auto create reservations for the equipment to block future dates
    const nextReservations = [...reservationList];
    orderForm.selectedEquipmentIds.forEach(eqId => {
      nextReservations.push({
         id: `RES-${Date.now()}-${eqId}`,
         equipmentId: eqId,
         startDate: orderForm.startDate,
         endDate: orderForm.endDate,
         clientName: orderForm.clientName,
         projectName: orderForm.projectName
      });
    });

    // Update equipment statuses to 'اجاره شده' if dates include current day
    const nextEqList = equipmentList.map(eq => {
      if (orderForm.selectedEquipmentIds.includes(eq.id)) {
        return { ...eq, status: 'اجاره شده' as EqStatus };
      }
      return eq;
    });

    const nextProjects = [createdProject, ...projectList];
    triggerSave(settings, nextEqList, staffList, nextProjects, nextReservations);

    // Reset Order Form
    setOrderForm({
      projectName: '',
      clientName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      deliveryTime: settings.defaultDeliveryHour,
      returnTime: settings.defaultReturnHour,
      selectedEquipmentIds: [],
      selectedStaff: [],
      discountPercent: 0,
      pricingModel: 'daily',
      equipmentCustomRates: {}
    });

    // Auto-open newly created invoice for inspection/printing
    setSelectedInvoice(createdProject);
    setActiveTab('invoices');
    alert('فاکتور جدید با موفقیت ثبت و پیش‌نویس موقت صادر شد!');
  };

  // --- Update Project Status ---
  const handleUpdateProjectStatus = (projectId: string, nextStatus: ProjectStatus) => {
    const nextProjects = projectList.map(proj => {
      if (proj.id === projectId) {
        return { ...proj, status: nextStatus };
      }
      return proj;
    });
    
    // If project is cancelled, release equipment statuses
    let nextEqList = [...equipmentList];
    if (nextStatus === 'لغو شده') {
      const cancelledProj = projectList.find(p => p.id === projectId);
      if (cancelledProj) {
        nextEqList = equipmentList.map(eq => {
          if (cancelledProj.selectedEquipmentIds.includes(eq.id)) {
            // Check if still rented in any other active project
            const isRentedElsewhere = nextProjects.some(p => 
              p.id !== projectId && p.status !== 'لغو شده' && p.selectedEquipmentIds.includes(eq.id)
            );
            return { ...eq, status: isRentedElsewhere ? 'اجاره شده' : 'موجود' as EqStatus };
          }
          return eq;
        });
      }
    }

    triggerSave(settings, nextEqList, staffList, nextProjects, reservationList);
    
    // Sync current open invoice modal
    if (selectedInvoice && selectedInvoice.id === projectId) {
      setSelectedInvoice({ ...selectedInvoice, status: nextStatus });
    }
  };

  // --- Update Settings ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSave(settings, equipmentList, staffList, projectList, reservationList);
    alert('تنظیمات پایه با موفقیت ذخیره شد!');
  };

  // --- Filtering computations ---
  const filteredEquipment = equipmentList.filter(eq => {
    const query = eqSearch.toLowerCase();
    const matchesSearch = 
      eq.name.toLowerCase().includes(query) ||
      (eq.assetCode && eq.assetCode.toLowerCase().includes(query)) ||
      (eq.barcode && eq.barcode.toLowerCase().includes(query)) ||
      eq.id.toLowerCase().includes(query);
    const matchesCat = eqCatFilter === 'همه' || eq.category === eqCatFilter;
    return matchesSearch && matchesCat;
  });

  const filteredStaff = staffList.filter(st => {
    const query = stSearch.toLowerCase();
    const matchesSearch = 
      st.name.toLowerCase().includes(query) || 
      st.role.toLowerCase().includes(query) ||
      (st.specialties && st.specialties.some(s => s.role.toLowerCase().includes(query)));
    
    const matchesCat = 
      stCatFilter === 'همه' || 
      st.role === stCatFilter || 
      (st.specialties && st.specialties.some(s => s.role === stCatFilter));

    return matchesSearch && matchesCat;
  });

  const currentFontClass = 
    settings.fontFamily === 'sahel' ? 'font-sahel' : 
    settings.fontFamily === 'parastoo' ? 'font-parastoo' : 
    settings.fontFamily === 'gandom' ? 'font-gandom' : 
    settings.fontFamily === 'yekan' ? 'font-yekan' : 
    'font-vazir';

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center font-sans text-orange-400">
        <div className="text-center space-y-4">
          <RefreshCcw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
          <p className="text-sm">در حال بارگذاری سیستم رست سنتر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-[#0a0a0c] text-slate-100 overflow-x-hidden ${currentFontClass}`}>
      
      {/* 1. SIDEBAR (Right Hand Side for RTL layout) */}
      <aside className="w-full md:w-80 bg-[#0d0d10] border-l border-slate-800/50 flex flex-col shrink-0">
        
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {settings.appLogoUrl ? (
              <img src={settings.appLogoUrl} alt="Logo" className="w-10 h-10 object-contain bg-[#0a0a0c] border border-slate-800/60 rounded-xl" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-orange-500/20">
                <span className="font-sans text-xs tracking-tighter">رست</span>
              </div>
            )}
            <div>
              <h1 className="text-xs font-black tracking-tight text-white leading-none mb-1">{settings.companyName || 'گروه هنر و رسانه رَست'}</h1>
              <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase leading-none block">Rest Center</span>
            </div>
          </div>
          <div className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-[10px] border border-orange-500/20 font-bold font-mono">
            v2.4
          </div>
        </div>

        {/* Dynamic DateTime Widget */}
        <div className="px-6 py-4 bg-[#0a0a0c]/40 border-b border-slate-800/50 flex flex-col gap-1 text-slate-300">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>امروز: {formatStringDateToJalali('2026-06-23')} شمسی</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>ساعت فعلی: ۱۶:۳۰ UTC</span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedInvoice(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-800/50 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            {activeTab === 'dashboard' ? (
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            ) : (
              <BarChart3 className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>داشبورد وضعیت</span>
          </button>

          <button
            onClick={() => { setActiveTab('equipment'); setSelectedInvoice(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'equipment'
                ? 'bg-slate-800/50 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            {activeTab === 'equipment' ? (
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            ) : (
              <Camera className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>تجهیزات سینمایی</span>
          </button>

          <button
            onClick={() => { setActiveTab('staff'); setSelectedInvoice(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-slate-800/50 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            {activeTab === 'staff' ? (
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            ) : (
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>آفیش عوامل (انسانی)</span>
          </button>

          <button
            onClick={() => { setActiveTab('new-order'); setSelectedInvoice(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'new-order'
                ? 'bg-slate-800/50 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            {activeTab === 'new-order' ? (
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            ) : (
              <Plus className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>ثبت فاکتور و آفیش جدید</span>
          </button>

          <button
            onClick={() => { setActiveTab('invoices'); setSelectedInvoice(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-slate-800/50 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            {activeTab === 'invoices' ? (
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>دفتر ثبت فاکتورها</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setSelectedInvoice(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-800/50 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            {activeTab === 'settings' ? (
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            ) : (
              <SettingsIcon className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>تنظیمات عمومی ساعت</span>
          </button>
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-4 bg-[#0a0a0c]/80 border-t border-slate-800/50 flex flex-col gap-2">
          <div className="text-[11px] text-slate-500 text-center">
            توسعه یافته بر بستر سیستم امنیتی ابری
          </div>
          <button 
            onClick={handleResetData}
            className="w-full py-1.5 px-3 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCcw className="w-3 h-3" />
            <span>بازنشانی کل دیتابیس</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0c] p-6 md:p-8 overflow-y-auto">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Promo Banner / Intro */}
            <div className="p-6 md:p-8 rounded-2xl bg-[#0d0d10] border border-orange-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-300 uppercase tracking-widest">سامانه مدیریت رسانه</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">خوش آمدید به رست سنتر</h2>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  سیستم هوشمند برای کنترل تمام‌عیار تجهیزات، آفیش تصویربرداران، صدابرداران و تیم فنی به همراه صدور زنده فاکتور و پیگیری حقوق پرسنل.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('new-order')}
                className="z-10 shrink-0 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-extrabold transition duration-200 flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت سفارش و آفیش جدید</span>
              </button>
            </div>

            {/* Glowing Metric Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Total Sales */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">کل فروش تفصیلی فاکتورها</span>
                  <div className="p-2 rounded bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xl font-black text-white font-mono break-all">
                    {formatCurrency(metrics.totalSales, '')}
                  </div>
                  <span className="text-xs text-slate-400 font-sans mt-1 inline-block">{settings.currency} (کل فاکتورهای غیر لغو شده)</span>
                </div>
              </div>

              {/* Card 2: Current Month Sales */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">فروش ماه جاری (ژوئن ۲۰۲۶)</span>
                  <div className="p-2 rounded bg-orange-500/10 text-orange-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xl font-black text-white font-mono break-all">
                    {formatCurrency(metrics.monthlySales, '')}
                  </div>
                  <span className="text-xs text-slate-400 font-sans mt-1 inline-block">{settings.currency}</span>
                </div>
              </div>

              {/* Card 3: Crew Wages Paid / Cost */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">کل دستمزد و هزینه عوامل</span>
                  <div className="p-2 rounded bg-rose-500/10 text-rose-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xl font-black text-white font-mono break-all">
                    {formatCurrency(metrics.totalWagesCost, '')}
                  </div>
                  <span className="text-xs text-rose-400 font-sans mt-1 inline-block">تعهد پرداخت به پرسنل و عوامل</span>
                </div>
              </div>

              {/* Card 4: Net Income / Profit */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">درآمد خالص تجهیزات</span>
                  <div className="p-2 rounded bg-orange-500/10 text-orange-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xl font-black text-white font-mono break-all">
                    {formatCurrency(metrics.netIncome, '')}
                  </div>
                  <span className="text-xs text-emerald-400 font-sans mt-1 inline-block">سهم درآمد خالص دفتر</span>
                </div>
              </div>

            </div>

            {/* Dashboard Graphs and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Graphic Revenue Distribution (SVG Chart) */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">تحلیل درآمدی فاکتورها</h3>
                  <p className="text-xs text-slate-400">روند توزیع مبالغ پروژه‌های ثبت شده</p>
                </div>
                
                {/* SVG Area Chart */}
                <div className="h-64 flex flex-col justify-between relative mt-4">
                  
                  {/* Background grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-800/50 w-full h-0"></div>
                    <div className="border-b border-slate-800/50 w-full h-0"></div>
                    <div className="border-b border-slate-800/50 w-full h-0"></div>
                    <div className="border-b border-slate-800/50 w-full h-0"></div>
                  </div>

                  {/* Draw Custom Interactive Chart Blocks */}
                  <div className="h-44 w-full flex items-end justify-around z-10 pt-4">
                    {projectList.filter(p => p.status !== 'لغو شده').map((proj, idx) => {
                      // Normalize heights for presentation (max value ~50M Toman)
                      const maxVal = 50000000;
                      const percentage = Math.min(100, Math.max(10, (proj.totalCost / maxVal) * 100));
                      return (
                        <div key={proj.id} className="flex flex-col items-center group w-1/4">
                          <div className="text-[10px] text-orange-400 opacity-0 group-hover:opacity-100 transition duration-150 mb-1 font-mono">
                            {formatCurrency(proj.totalCost, '')}
                          </div>
                          
                          {/* Animated Bar with gradient */}
                          <div 
                            style={{ height: `${percentage}%` }} 
                            className="w-12 bg-gradient-to-t from-orange-600 to-orange-400 rounded-lg group-hover:from-orange-500 group-hover:to-orange-300 transition-all duration-300 relative"
                          >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"></div>
                          </div>
                          
                          <span className="text-[10px] text-slate-400 mt-2 truncate max-w-[80px] font-sans">
                            {proj.projectName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center text-xs text-slate-500 border-t border-slate-800/50 pt-2 font-mono">
                    نمودار توازن درآمد ناخالص بر حسب پروژه‌های گوناگون
                  </div>
                </div>
              </div>

              {/* Quick Calendar Reserves Tracker */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">رزروهای تجهیزات</h3>
                    <button 
                      onClick={() => openReservingModal()} 
                      className="text-xs text-orange-400 hover:text-white flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-lg transition duration-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>رزرو جدید</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">تاریخ‌های بلاک شده بدون فاکتور اصلی</p>

                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {reservationList.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">هیچ رزروی ثبت نشده است</p>
                    ) : (
                      reservationList.map(res => {
                        const eq = equipmentList.find(e => e.id === res.equipmentId);
                        return (
                          <div key={res.id} className="p-3 rounded-xl bg-[#0a0a0c] border border-slate-800/50 flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold text-slate-200">{eq ? eq.name : 'دستگاه نامشخص'}</h4>
                              <p className="text-[10px] text-slate-400 font-sans">بنام: {res.clientName}</p>
                              <div className="flex items-center gap-1.5 text-[9px] text-orange-400 font-mono">
                                <CalendarDays className="w-3 h-3" />
                                <span>{formatStringDateToJalali(res.startDate)} الی {formatStringDateToJalali(res.endDate)}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteReservation(res.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-[#0d0d10] transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/50 pt-4 mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-400">کل رزروهای فعال:</span>
                  <span className="font-bold text-orange-400">{reservationList.length} مورد</span>
                </div>
              </div>

            </div>

            {/* Quick overview of latest projects in dashboard */}
            <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">آخرین پروژه‌ها و آفیش‌ها</h3>
                  <p className="text-xs text-slate-400">گزارش سریع فاکتورهای مادر</p>
                </div>
                <button 
                  onClick={() => setActiveTab('invoices')}
                  className="text-xs text-orange-400 hover:text-white cursor-pointer"
                >
                  مشاهده همه فاکتورها ←
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 pt-1">کد فاکتور</th>
                      <th className="pb-3 pt-1">نام پروژه / مشتری</th>
                      <th className="pb-3 pt-1">تاریخ اجرا</th>
                      <th className="pb-3 pt-1">جمع تجهیزات</th>
                      <th className="pb-3 pt-1">دستمزد عوامل</th>
                      <th className="pb-3 pt-1">کل دریافتی (خالص)</th>
                      <th className="pb-3 pt-1">وضعیت پرداخت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {projectList.slice(0, 3).map(proj => {
                      return (
                        <tr key={proj.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-4 font-mono font-bold text-orange-400">{proj.id}</td>
                          <td className="py-4">
                            <span className="font-semibold text-slate-200 block">{proj.projectName}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{proj.clientName}</span>
                          </td>
                          <td className="py-4 font-mono text-slate-300">
                            {formatStringDateToJalali(proj.startDate)} الی {formatStringDateToJalali(proj.endDate)}
                          </td>
                          <td className="py-4 font-mono text-slate-400">{formatCurrency(proj.equipmentCost, '')}</td>
                          <td className="py-4 font-mono text-slate-400">{formatCurrency(proj.staffCost, '')}</td>
                          <td className="py-4 font-mono font-bold text-emerald-400">{formatCurrency(proj.totalCost)}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              proj.status === 'تسویه شده' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              proj.status === 'پرداخت بیعانه' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              proj.status === 'لغو شده' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {proj.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: EQUIPMENT LIST */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">تجهیزات و ابزار رسانه‌ای</h2>
                <p className="text-xs text-slate-400 font-sans">بانک جامع دستگاه‌ها، نرخ روزانه و قابلیت مشاهده گزارشات اختصاصی هر وسیله</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-sans">
                <button 
                  onClick={() => setIsAddingEq(true)}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن دستگاه جدید</span>
                </button>
                <button 
                  onClick={() => openReservingModal()}
                  className="px-4 py-2.5 rounded-xl bg-[#0d0d10] hover:bg-slate-800 text-slate-300 border border-slate-800/50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span>ثبت رزرو موقت</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="p-4 rounded-xl bg-[#0d0d10] border border-slate-800/50 flex flex-col xl:flex-row gap-4 items-center justify-between font-sans">
              
              <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                {/* Search input */}
                <div className="relative w-full md:w-72 shrink-0">
                  <Search className="w-4 h-4 absolute right-3 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="جستجو در عنوان دستگاه..."
                    value={eqSearch}
                    onChange={(e) => setEqSearch(e.target.value)}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg pr-9 pl-3 py-3 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>

                {/* Barcode scanner input */}
                <div className="flex gap-2 w-full md:w-80 items-center">
                  <input
                    type="text"
                    placeholder="اسکن یا وارد کردن بارکد..."
                    value={barcodeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBarcodeInput(val);
                      if (val) {
                        const matched = equipmentList.find(eq => eq.barcode === val || eq.assetCode === val);
                        if (matched) {
                          setSelectedEquipment(matched);
                          setBarcodeInput('');
                        }
                      }
                    }}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-3 border border-slate-800 focus:outline-none focus:border-orange-500 font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const withBarcode = equipmentList.filter(e => e.barcode);
                      if (withBarcode.length > 0) {
                        const randomEq = withBarcode[Math.floor(Math.random() * withBarcode.length)];
                        setBarcodeInput(randomEq.barcode || '');
                        setSelectedEquipment(randomEq);
                      } else {
                        alert('هیچ دستگاهی با بارکد یافت نشد. ابتدا در تنظیمات مشخصات دستگاه، بارکد تعریف کنید.');
                      }
                    }}
                    className="px-3 py-2 bg-[#1a1410] border border-orange-500/10 hover:border-orange-500/30 text-orange-400 rounded-lg text-[10px] font-bold shrink-0 transition whitespace-nowrap cursor-pointer"
                    title="شبیه‌ساز اسکن تفنگی بارکد فیزیکی"
                  >
                    شبیه‌ساز اسکن
                  </button>
                </div>
              </div>

              {/* Direct Categories Selector */}
              <div className="flex overflow-x-auto gap-1.5 w-full xl:w-auto pb-2 xl:pb-0 scrollbar-none">
                {['همه', ...(settings.equipmentCategories || ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه'])].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setEqCatFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition duration-150 whitespace-nowrap cursor-pointer ${
                      eqCatFilter === cat 
                        ? 'bg-orange-500 text-slate-950 font-bold' 
                        : 'bg-[#0a0a0c] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.map(eq => {
                const eqReport = getEquipmentReport(eq.id);
                return (
                  <div 
                    key={eq.id} 
                    className="p-5 rounded-2xl bg-[#0d0d10] border border-slate-800/50 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 transition duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      
                      {/* Top labels */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2 py-1 rounded bg-[#0a0a0c] text-[10px] text-orange-400 font-bold border border-slate-800/60 font-sans">
                          {eq.category}
                        </span>
                        
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          eq.status === 'موجود' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          eq.status === 'اجاره شده' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {eq.status}
                        </span>
                      </div>

                      {/* Main Title */}
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-2">{eq.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 inline-block">کد اموال: {eq.id}</span>
                      </div>

                      {/* Live specifications subset */}
                      <div className="mt-3 py-2 px-3 rounded-lg bg-[#0a0a0c]/60 space-y-1">
                        {eq.specs.slice(0, 3).map((spec, sidx) => (
                          <div key={sidx} className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500">{spec.key}:</span>
                            <span className="text-slate-300 font-medium truncate max-w-[140px]">{spec.value}</span>
                          </div>
                        ))}
                      </div>

                    </div>

                     <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center justify-between gap-1 font-sans">
                      <div>
                        <span className="text-[10px] text-slate-500 block">کرایه روزانه:</span>
                        <span className="text-xs font-extrabold text-emerald-400 font-mono">{formatCurrency(eq.dailyRate)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEq(eq);
                            setIsEditingEq(true);
                          }}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:bg-slate-800/50 text-slate-400 hover:text-white transition cursor-pointer"
                          title="ویرایش کالا"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`آیا از حذف دستگاه "${eq.name}" از دفتر کل اموال مطمئن هستید؟`)) {
                              const nextEq = equipmentList.filter(e => e.id !== eq.id);
                              const nextRes = reservationList.filter(r => r.equipmentId !== eq.id);
                              triggerSave(settings, nextEq, staffList, projectList, nextRes);
                            }
                          }}
                          className="p-2 rounded-lg bg-[#1a0f12] border border-rose-950/40 hover:bg-rose-500 hover:text-slate-950 text-rose-400 transition cursor-pointer"
                          title="حذف کالا"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEquipment(eq)}
                          className="px-2.5 py-2 rounded-lg bg-[#13110e] border border-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-slate-950 text-[10px] font-extrabold transition duration-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>تقویم و گزارش</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openReservingModal(eq.id)}
                          className="px-2.5 py-2 rounded-lg bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500 text-orange-400 hover:text-slate-950 text-[10px] font-extrabold transition duration-200 flex items-center gap-1 cursor-pointer"
                          title="ثبت رزرو موقت سریع"
                        >
                          <CalendarDays className="w-3 h-3" />
                          <span>رزرو</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredEquipment.length === 0 && (
              <div className="p-12 text-center text-slate-500 text-xs">
                دستگاهی با فیلترهای بالا یافت نشد.
              </div>
            )}

          </div>
        )}

        {/* TAB 3: STAFF & CREW LIST */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">عوامل صحنه و پرسنل رسانه‌ای</h2>
                <p className="text-xs text-slate-400 font-sans">فهرست عوامل آفیش برای پروژه‌ها به همراه میزان تخصص، دستمزد پایه و گزارش خالص دریافتی</p>
              </div>

              <button 
                onClick={() => setIsAddingSt(true)}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-orange-500/10 font-sans"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن عامل انسانی جدید</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-4 rounded-xl bg-[#0d0d10] border border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="جستجو در نام عامل یا مهارت..."
                  value={stSearch}
                  onChange={(e) => setStSearch(e.target.value)}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg pr-9 pl-3 py-3 border border-slate-800 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              {/* Direct Specialties Selector */}
              <div className="flex overflow-x-auto gap-1.5 w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                {['همه', ...(settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی'])].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setStCatFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition duration-150 whitespace-nowrap cursor-pointer ${
                      stCatFilter === cat 
                        ? 'bg-orange-500 text-slate-950 font-bold' 
                        : 'bg-[#0a0a0c] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map(st => {
                const report = getStaffReport(st.id);
                return (
                  <div 
                    key={st.id} 
                    className="p-5 rounded-2xl bg-[#0d0d10] border border-slate-800/50 hover:border-orange-500/50 hover:shadow-lg transition duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      
                      <div className="flex justify-between items-start font-sans">
                        {st.avatarUrl ? (
                          <img src={st.avatarUrl} alt={st.name} className="w-10 h-10 rounded-full object-cover border border-slate-800/80" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold">
                            {st.name.slice(0, 2)}
                          </div>
                        )}
                        <span className="px-2 py-0.5 rounded bg-[#0a0a0c] text-[10px] text-slate-400 font-mono">
                          ID: {st.id}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white font-sans">{st.name}</h4>
                        <span className="text-xs text-orange-400 font-medium block mt-0.5 font-sans">{st.role}</span>
                      </div>

                      <div className="space-y-2 text-[11px] text-slate-300 pt-2 border-t border-slate-800/50 font-sans">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-slate-500" />
                          <span>تخصص: {st.experience}</span>
                        </div>
                        
                        {st.specialties && st.specialties.length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-[#0a0a0c]/80 border border-slate-900 space-y-1.5">
                            <span className="text-[9px] text-orange-400 block font-semibold">تخصص‌های ثبت شده و تعرفه روزانه:</span>
                            <div className="space-y-1">
                              {st.specialties.map((spec, sidx) => (
                                <div key={sidx} className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">{spec.role}:</span>
                                  <span className="text-emerald-400 font-mono font-medium">{formatCurrency(spec.wage, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono">همراه: {st.phone}</span>
                        </div>
                      </div>

                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center justify-between gap-1 font-sans">
                      <div>
                        <span className="text-[10px] text-slate-500 block">حقوق پایه روزانه:</span>
                        <span className="text-xs font-semibold text-emerald-400 font-mono">{formatCurrency(st.dailyWage)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSt(st);
                            setIsEditingSt(true);
                          }}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:bg-slate-800/55 text-slate-400 hover:text-white transition cursor-pointer"
                          title="ویرایش همکار"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`آیا از حذف همکار "${st.name}" مطمئن هستید؟`)) {
                              const nextSt = staffList.filter(s => s.id !== st.id);
                              triggerSave(settings, equipmentList, nextSt, projectList, reservationList);
                            }
                          }}
                          className="p-2 rounded-lg bg-[#1a0f12] border border-rose-950/40 hover:bg-rose-500 hover:text-slate-950 text-rose-400 transition cursor-pointer"
                          title="حذف همکار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStaff(st)}
                          className="px-2.5 py-2 rounded-lg bg-[#13110e] border border-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-slate-950 text-[10px] font-extrabold transition duration-200 flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>تسویه</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredStaff.length === 0 && (
              <div className="p-12 text-center text-slate-500 text-xs">
                عاملی با این نام یافت نشد.
              </div>
            )}

          </div>
        )}

        {/* TAB 4: NEW ORDER BUILDER (Consolidated Booking & Staffing) */}
        {activeTab === 'new-order' && (
          <form onSubmit={handleCreateOrder} className="space-y-8 animate-fade-in font-sans">
            
            <div>
              <h2 className="text-2xl font-black text-white">ثبت فاکتور آفیش و رزرو جدید</h2>
              <p className="text-xs text-slate-400">پکیج یکپارچه از اجاره سخت‌افزار تا استخدام نیروی انسانی و محاسبه نهایی</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Core Details Area */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Client & Project Details */}
                <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 space-y-4">
                  <h3 className="text-sm font-bold text-orange-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>مشخصات مشتری و پروژه رسانه‌ای</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">عنوان پروژه یا فیلم:</label>
                      <input
                        type="text"
                        placeholder="مثال: تیزر تبلیغاتی اسنپ"
                        required
                        value={orderForm.projectName}
                        onChange={(e) => setOrderForm({ ...orderForm, projectName: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-3 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">نام کارفرما / خریدار:</label>
                      <input
                        type="text"
                        placeholder="مثال: آژانس رسانه‌ای موج‌نو"
                        required
                        value={orderForm.clientName}
                        onChange={(e) => setOrderForm({ ...orderForm, clientName: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-3 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 font-sans">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">تاریخ تحویل اولیه (شروع):</label>
                      <input
                        type="date"
                        required
                        value={orderForm.startDate}
                        onChange={(e) => setOrderForm({ ...orderForm, startDate: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">ساعت تحویل:</label>
                      <input
                        type="time"
                        required
                        value={orderForm.deliveryTime}
                        onChange={(e) => setOrderForm({ ...orderForm, deliveryTime: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">تاریخ عودت (پایان):</label>
                      <input
                        type="date"
                        required
                        value={orderForm.endDate}
                        onChange={(e) => setOrderForm({ ...orderForm, endDate: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">ساعت عودت:</label>
                      <input
                        type="time"
                        required
                        value={orderForm.returnTime}
                        onChange={(e) => setOrderForm({ ...orderForm, returnTime: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-sans">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">مدل محاسباتی قیمت‌گذاری:</label>
                      <select
                        value={orderForm.pricingModel || 'daily'}
                        onChange={(e) => setOrderForm({ ...orderForm, pricingModel: e.target.value as any })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                      >
                        <option value="daily">محاسبه تعرفه روزهای کرایه (روزانه)</option>
                        <option value="project">محاسبه تعرفه پروژه‌ای ثابت (یک فلت)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex items-end">
                      <div className="w-full p-2.5 bg-[#0a0a0c]/80 rounded-lg flex items-center justify-between text-xs border border-orange-500/10">
                        <span className="text-slate-400">محاسبه بازه‌ی زمانی:</span>
                        <span className="font-bold text-orange-400">
                          {orderForm.pricingModel === 'project' ? 'محاسبه ثابت پروژه‌ای' : `${orderRentDays} روز کلی`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Select Equipment Panel */}
                <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 font-sans">
                    <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>آفیش و اجاره تجهیزات ({orderForm.selectedEquipmentIds.length} قلم منتخب)</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">با کلیک، انتخاب یا لغو کنید</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 font-sans">
                    {equipmentList.map(eq => {
                      const isSelected = orderForm.selectedEquipmentIds.includes(eq.id);
                      return (
                        <div
                          key={eq.id}
                          onClick={() => toggleEquipmentInOrder(eq.id)}
                          className={`p-3 rounded-xl border text-right cursor-pointer transition flex items-center justify-between select-none ${
                            isSelected 
                              ? 'bg-orange-500/10 border-orange-500 text-slate-200 shadow'
                              : 'bg-[#0a0a0c] border-slate-800/80 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="font-semibold text-xs block text-slate-200">{eq.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">اموال: {eq.id} | {eq.category}</span>
                          </div>
                          <div className="text-left shrink-0 font-mono">
                            <span className="text-xs font-semibold text-emerald-400 block">
                              {formatCurrency(eq.dailyRate, '')}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-sans">روزانه</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barcode scanner quick add */}
                  <div className="p-3 bg-[#0a0a0c] border border-slate-850 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
                    <div className="space-y-1 text-right">
                      <span className="font-bold text-slate-300 block">افزودن سریع کالا با بارکدخوان فیزیکی:</span>
                      <span className="text-[10px] text-slate-500 block">جهت اسکن بارکد تفنگی یا تایپ دستی شناسه/بارکد</span>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="بارکد را اسکن کنید..."
                        value={orderBarcodeInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOrderBarcodeInput(val);
                          const matched = equipmentList.find(eq => eq.barcode === val || eq.assetCode === val || eq.id === val);
                          if (matched) {
                            if (!orderForm.selectedEquipmentIds.includes(matched.id)) {
                              setOrderForm(prev => ({
                                ...prev,
                                selectedEquipmentIds: [...prev.selectedEquipmentIds, matched.id]
                              }));
                            }
                            setOrderBarcodeInput('');
                          }
                        }}
                        className="bg-[#000] text-slate-100 text-xs rounded border border-slate-800 px-3 py-1.5 w-full sm:w-48 font-mono text-center focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const hasBarcode = equipmentList.filter(e => e.barcode);
                          if (hasBarcode.length > 0) {
                            const randomEq = hasBarcode[Math.floor(Math.random() * hasBarcode.length)];
                            setOrderBarcodeInput(randomEq.barcode || '');
                            if (!orderForm.selectedEquipmentIds.includes(randomEq.id)) {
                              setOrderForm(prev => ({
                                ...prev,
                                selectedEquipmentIds: [...prev.selectedEquipmentIds, randomEq.id]
                              }));
                            }
                            setOrderBarcodeInput('');
                          } else {
                            alert('هیچ دستگاهی با بارکد یافت نشد.');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-700 text-orange-400 rounded text-[10px] font-bold shrink-0 transition cursor-pointer"
                      >
                        شبیه‌ساز تفنگ بارکد
                      </button>
                    </div>
                  </div>

                  {/* Active selected equipment customizing rates */}
                  {orderForm.selectedEquipmentIds.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[#0a0a0c] border border-slate-800/50 space-y-3 font-sans">
                      <span className="text-[11px] text-orange-400 font-bold block">تنظیم دستوری تعرفه تجهیزات برای این پروژه:</span>
                      
                      <div className="space-y-3 divide-y divide-slate-800/50">
                        {orderForm.selectedEquipmentIds.map((eqId) => {
                          const eq = equipmentList.find(e => e.id === eqId);
                          if (!eq) return null;
                          const currentRate = (orderForm.equipmentCustomRates && orderForm.equipmentCustomRates[eqId] !== undefined)
                            ? orderForm.equipmentCustomRates[eqId]
                            : eq.dailyRate;
                          return (
                            <div key={eqId} className="pt-3 first:pt-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="font-bold text-slate-200 block text-right">{eq.name}</span>
                                <span className="text-[10px] text-slate-500 text-right block">تعرفه پایه دفتری: {formatCurrency(eq.dailyRate)}</span>
                              </div>
                              <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] text-slate-400 font-sans">تعرفه اختصاصی پروژه:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="50000"
                                    value={currentRate}
                                    onChange={(e) => updateEquipmentRateInOrder(eqId, parseInt(e.target.value) || 0)}
                                    className="w-28 bg-[#000000] border border-slate-800 rounded px-2 py-1 text-center font-mono text-white focus:outline-none focus:border-orange-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Book Crew/Human Resources */}
                <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 font-sans">
                    <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>آفیش عوامل و تیم تولید ({orderForm.selectedStaff.length} نفر منتخب)</span>
                    </h3>
                  </div>

                  {/* Staff select grid */}
                  <div className="space-y-3 font-sans">
                    <span className="text-[10px] text-slate-400 block">انتخاب پرسنل جهت اضافه شدن به لیست دستمزد:</span>
                    <div className="flex flex-wrap gap-2">
                      {staffList.map(st => {
                        const isSelected = orderForm.selectedStaff.some(s => s.staffId === st.id);
                        return (
                          <button
                            type="button"
                            key={st.id}
                            onClick={() => toggleStaffInOrder(st.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition duration-150 cursor-pointer ${
                              isSelected 
                                ? 'bg-orange-500 text-slate-950 font-bold' 
                                : 'bg-[#0a0a0c] text-slate-300 border border-slate-800/85 hover:border-slate-700'
                            }`}
                          >
                            + {st.name} ({st.role})
                          </button>
                        );
                      })}
                    </div>

                    {/* Active selected staff customizing wages */}
                    {orderForm.selectedStaff.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-[#0a0a0c] border border-slate-800/50 space-y-3 font-sans">
                        <span className="text-[11px] text-orange-400 font-bold block">تنظیم دستوری روز و مبالغ عوامل آفیش شده:</span>
                        
                        <div className="space-y-3 divide-y divide-slate-800/50">
                          {orderForm.selectedStaff.map((s) => {
                            const person = staffList.find(st => st.id === s.staffId);
                            if (!person) return null;
                            return (
                              <div key={s.staffId} className="pt-3 first:pt-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                                <div>
                                  <span className="font-bold text-slate-200 block text-right">{person.name}</span>
                                  {person.specialties && person.specialties.length > 0 ? (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] text-slate-500 font-sans shrink-0">نقش در پروژه:</span>
                                      <select
                                        value={s.selectedRole || person.role}
                                        onChange={(e) => updateStaffRoleInOrder(s.staffId, e.target.value)}
                                        className="bg-[#000000] border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-orange-400 focus:outline-none focus:border-orange-500 cursor-pointer"
                                      >
                                        {person.specialties.map(spec => (
                                          <option key={spec.role} value={spec.role}>{spec.role} ({formatCurrency(spec.wage, '')})</option>
                                        ))}
                                      </select>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 text-right block">{person.role}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] text-slate-400 font-sans">تعداد روز کار:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={s.days}
                                      onChange={(e) => updateStaffDaysInOrder(s.staffId, parseInt(e.target.value) || 1)}
                                      className="w-16 bg-[#000000] border border-slate-800 rounded px-2 py-1 text-center font-mono text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] text-slate-400 font-sans">دستمزد روز:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="50000"
                                      value={s.customWage}
                                      onChange={(e) => updateStaffWageInOrder(s.staffId, parseInt(e.target.value) || 0)}
                                      className="w-24 bg-[#000000] border border-slate-800 rounded px-2 py-1 text-center font-mono text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Checkout summary panel */}
              <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 space-y-6 h-fit sticky top-6">
                  
                  {/* Costs Breakdown Subtotal Row */}
                  <div className="space-y-2 border-t border-slate-800/50 pt-4 font-sans text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>مجموع ناখالص هزینه‌ها:</span>
                      <span className="font-mono text-slate-300">
                        {formatCurrency(liveCosts.subTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Discount Field */}
                  <div className="space-y-1.5 font-sans">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">اعمال درصد تخفیف ویژه:</span>
                      <span className="font-semibold text-orange-400">{orderForm.discountPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="5"
                      value={orderForm.discountPercent}
                      onChange={(e) => setOrderForm({ ...orderForm, discountPercent: parseInt(e.target.value) })}
                      className="w-full accent-orange-500 bg-[#0a0a0c]"
                    />
                  </div>

                  {/* Final net payout cost */}
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1 text-center font-sans">
                    <span className="text-[11px] text-orange-300 block">جمع قابل پرداخت مشتری (نهایی):</span>
                    <div className="text-xl font-bold text-emerald-400 font-mono">
                      {formatCurrency(liveCosts.finalTotal)}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold text-xs transition duration-200 shadow-lg shadow-orange-500/15 flex items-center justify-center gap-2 cursor-pointer font-sans"
                  >
                    <FileText className="w-4 h-4" />
                    <span>تایید فاکتور و ثبت در دفتر</span>
                  </button>
                </div>

              </div>

          </form>
        )}

        {/* TAB 5: PROJECT / INVOICES REGISTRY */}
        {activeTab === 'invoices' && (
          <div className="space-y-6 animate-fade-in">
            
            <div>
              <h2 className="text-2xl font-black text-white">دفتر ثبت فاکتورهای رست سنتر</h2>
              <p className="text-xs text-slate-400 font-sans">مرور، تغییر وضعیت پرداخت، چاپ و تسویه حساب پرسنل پروژه‌ها</p>
            </div>

            {/* Invoices List Table */}
            <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 pt-1">شناسه سند</th>
                      <th className="pb-3 pt-1">عنوان پروژه / مشتری</th>
                      <th className="pb-3 pt-1">تجهیزات اجاره رفته</th>
                      <th className="pb-3 pt-1">عوامل آفیش شده</th>
                      <th className="pb-3 pt-1">مبلغ فاکتور</th>
                      <th className="pb-3 pt-1">وضعیت پرداخت فاکتور</th>
                      <th className="pb-3 pt-1 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {projectList.map(proj => {
                      return (
                        <tr key={proj.id} className="hover:bg-[#0d0d10] transition font-sans">
                          <td className="py-4 font-mono font-bold text-orange-400">{proj.id}</td>
                          <td className="py-4">
                            <span className="font-semibold text-slate-200 block text-right">{proj.projectName}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 text-right">{proj.clientName}</span>
                          </td>
                          <td className="py-4 font-normal text-slate-300">
                            {proj.selectedEquipmentIds.length} قلم دستگاه
                          </td>
                          <td className="py-4 text-slate-300 font-normal">
                            {proj.selectedStaff.length} نفر نیروی کار
                          </td>
                          <td className="py-4 font-mono font-bold text-emerald-400">{formatCurrency(proj.totalCost)}</td>
                          <td className="py-4">
                            <select
                              value={proj.status}
                              onChange={(e) => handleUpdateProjectStatus(proj.id, e.target.value as ProjectStatus)}
                              className={`px-2 py-1 rounded text-[10px] font-bold bg-[#0a0a0c] border border-slate-800/80 focus:outline-none focus:border-orange-500 text-right cursor-pointer ${
                                proj.status === 'تسویه شده' ? 'text-emerald-400' :
                                proj.status === 'پرداخت بیعانه' ? 'text-amber-400' :
                                proj.status === 'لغو شده' ? 'text-rose-400' :
                                'text-slate-400'
                              }`}
                            >
                              <option value="پیش‌نویس">پیش‌نویس</option>
                              <option value="پرداخت بیعانه">پرداخت بیعانه</option>
                              <option value="تسویه شده">تسویه شده</option>
                              <option value="لغو شده">لغو شده (آزادسازی)</option>
                            </select>
                          </td>
                          <td className="py-4 text-left font-sans">
                            <button
                              onClick={() => setSelectedInvoice(proj)}
                              className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-slate-950 text-[11px] font-bold transition duration-200 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>نمایش فاکتور فیزیکی</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: SETTINGS DEFAULT GENERAL PARAMETERS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            <div>
              <h2 className="text-xl font-bold text-white">تنظیمات اصلی و شخصی‌سازی سامانه</h2>
              <p className="text-xs text-slate-400 font-sans">مدیریت برند، آپلود لوگو، انتخاب فونت، و شخصی‌سازی فیلدهای فاکتور و دسته‌بندی‌ها</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6 bg-[#0d0d10] border border-slate-800/50 p-6 rounded-2xl">
              
              {/* SECTION 1: SYSTEM BRANDING & LAYOUT */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-orange-400 border-r-2 border-orange-500 pr-2">۱. برندینگ نرم‌افزار و چیدمان بصری</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">نام تجاری سیستم (عنوان اصلی):</label>
                    <input
                      type="text"
                      required
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">انتخاب قلم / فونت نمایشی فارسی:</label>
                    <select
                      value={settings.fontFamily || 'vazir'}
                      onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value as any })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                    >
                      <option value="vazir">وزیر متن (Vazirmatn)</option>
                      <option value="sahel">ساحل (Sahel)</option>
                      <option value="gandom">گندم (Gandom)</option>
                      <option value="parastoo">پرستو (Parastoo)</option>
                      <option value="yekan">یکان (IRANYekan)</option>
                    </select>
                  </div>
                </div>

                {/* Logo Uploaders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* App Logo */}
                  <div className="p-4 rounded-xl bg-[#0a0a0c] border border-slate-850/60 space-y-3 font-sans">
                    <label className="text-xs font-semibold text-slate-300 block">تصویر لوگوی سامانه (بالای سایدبار):</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0d0d10] border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {settings.appLogoUrl ? (
                          <img src={settings.appLogoUrl} alt="App Logo" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-600">بدون لوگو</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-block px-3 py-1.5 rounded bg-orange-500 text-slate-950 text-xs font-bold cursor-pointer hover:bg-orange-600 transition">
                          آپلود لوگوی برنامه
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSettings({ ...settings, appLogoUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {settings.appLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, appLogoUrl: '' })}
                            className="text-[10px] text-rose-400 hover:text-rose-300 block hover:underline cursor-pointer font-bold"
                          >
                            حذف و ریست به لوگوی پیش‌فرض رست‌سنتر
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Logo */}
                  <div className="p-4 rounded-xl bg-[#0a0a0c] border border-slate-850/60 space-y-3 font-sans">
                    <label className="text-xs font-semibold text-slate-300 block">تصویر لوگوی فاکتور (چاپی):</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0d0d10] border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="Invoice Logo" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-600">بدون لوگو</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-block px-3 py-1.5 rounded bg-orange-500 text-[#0c0d10] text-xs font-bold cursor-pointer hover:bg-orange-600 transition">
                          آپلود لوگوی فاکتور
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSettings({ ...settings, logoUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {settings.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, logoUrl: '' })}
                            className="text-[10px] text-rose-400 hover:text-rose-300 block hover:underline cursor-pointer font-bold"
                          >
                            حذف و بازگشت به لوگوی متنی
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 2: PRINTED INVOICE SETUP */}
              <div className="space-y-4 pt-4 border-t border-slate-800/40">
                <h3 className="text-xs font-bold text-orange-400 border-r-2 border-orange-500 pr-2">۲. قوانین، جزئیات و شخصی‌سازی فاکتور چاپی</h3>
                
                <div className="space-y-3">
                  {/* Signature customization fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 font-sans">
                      <label className="text-xs text-slate-300">عنوان محل مهر و امضا فاکتور:</label>
                      <input
                        type="text"
                        required
                        value={settings.signatureLabel || 'محل مهر و امضای مسئول تجهیزات'}
                        onChange={(e) => setSettings({ ...settings, signatureLabel: e.target.value })}
                        className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-6 font-sans">
                      <input
                        type="checkbox"
                        id="showSignature"
                        checked={settings.showSignature !== false}
                        onChange={(e) => setSettings({ ...settings, showSignature: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#0a0a0c] border-slate-800 text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="showSignature" className="text-xs text-slate-300 cursor-pointer select-none">
                        نمایش کادر امضا و تعهدنامه در پایین نسخه چاپی فاکتور
                      </label>
                    </div>
                  </div>

                  {/* Customizable terms text area */}
                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">قوانین، ضوابط و تعهدنامه عودت تجهیزات جهت درج ذیل فاکتور:</label>
                    <textarea
                      rows={3}
                      value={settings.terms || 'مستاجر متعهد می‌گردد کلیه دستگاه‌ها را در راس ساعت تحویل ثبت شده تحویل بنماید؛ در غیر این صورت هزینه کل روز اضافه محاسبه می‌گردد.'}
                      onChange={(e) => setSettings({ ...settings, terms: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition leading-relaxed text-right"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SYSTEM HOURS & GENERAL SETTINGS */}
              <div className="space-y-4 pt-4 border-t border-slate-800/40">
                <h3 className="text-xs font-bold text-orange-400 border-r-2 border-orange-500 pr-2">۳. زمانبندی‌های پیش‌فرض دفتری</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">ساعت تحویل روزانه آفیش دستگاه:</label>
                    <input
                      type="time"
                      required
                      value={settings.defaultDeliveryHour}
                      onChange={(e) => setSettings({ ...settings, defaultDeliveryHour: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                    />
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">ساعت عودت و بررسی کالا در دفتر:</label>
                    <input
                      type="time"
                      required
                      value={settings.defaultReturnHour}
                      onChange={(e) => setSettings({ ...settings, defaultReturnHour: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">واحد پول فاکتورها:</label>
                    <input
                      type="text"
                      required
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5 font-sans">
                    <label className="text-xs text-slate-300">تلفن هماهنگی سربرگ فاکتور:</label>
                    <input
                      type="text"
                      required
                      value={settings.companyPhone}
                      onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-xs text-slate-300">آدرس فیزیکی شعبه تحویل آماج:</label>
                  <input
                    type="text"
                    required
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
              </div>

              {/* SAVE BASE SETTINGS GENERAL BUTTON */}
              <div className="pt-4 flex justify-end font-sans">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-[#0c0d10] font-black text-xs transition duration-200 shadow-lg shadow-orange-500/15 cursor-pointer"
                >
                  ذخیره پیکربندی عمومی
                </button>
              </div>

            </form>

            {/* SECTION 4: TAGS & CATEGORIES PERSONALIZATION INLINE MANAGER CARD */}
            <div className="p-6 rounded-2xl bg-[#0d0d10] border border-slate-800/50 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">مدیریت دسته‌بندی‌ها و تخصص‌ها</h3>
                <p className="text-xs text-slate-400 font-sans">تنظیم و تعریف تخصص‌های سفارشی برای کالاها و لیست تیم فنی</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-sans">
                
                {/* 1. Equipment categories manager */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-orange-400 block border-r-2 border-orange-500 pr-2">فهرست گروه‌های تجهیزات</span>
                  
                  {/* Category item add action */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="عنوان گروه جدید (مثال: تجهیزات هوایی)..."
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      className="flex-1 bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-orange-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCatInput.trim()) return;
                        const currArr = settings.equipmentCategories || ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه'];
                        if (currArr.includes(newCatInput.trim())) {
                          alert('این دسته‌بندی از پیش ثبت شده است!');
                          return;
                        }
                        const nextSettings = { ...settings, equipmentCategories: [...currArr, newCatInput.trim()] };
                        triggerSave(nextSettings, equipmentList, staffList, projectList, reservationList);
                        setNewCatInput('');
                      }}
                      className="px-3 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition flex items-center justify-center"
                    >
                      + افزودن
                    </button>
                  </div>

                  {/* List of current columns */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(settings.equipmentCategories || ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه']).map(c => (
                      <div key={c} className="flex justify-between items-center py-2 px-3 rounded-lg bg-[#0a0a0c]/60 border border-slate-850 text-xs">
                        <span className="text-slate-300">{c}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currArr = settings.equipmentCategories || ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه'];
                            const nextArr = currArr.filter(x => x !== c);
                            triggerSave({ ...settings, equipmentCategories: nextArr }, equipmentList, staffList, projectList, reservationList);
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          title="حذف دسته‌بندی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Staff roles custom categories manager */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-orange-400 block border-r-2 border-orange-500 pr-2">فهرست تخصص‌های عوامل انسانی</span>

                  {/* Role item add action */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="عنوان تخصص جدید (مثال: خلبان پهپاد)..."
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      className="flex-1 bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-orange-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newRoleInput.trim()) return;
                        const currArr = settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی'];
                        if (currArr.includes(newRoleInput.trim())) {
                          alert('این تخصص از پیش ثبت شده است!');
                          return;
                        }
                        const nextSettings = { ...settings, staffCategories: [...currArr, newRoleInput.trim()] };
                        triggerSave(nextSettings, equipmentList, staffList, projectList, reservationList);
                        setNewRoleInput('');
                      }}
                      className="px-3 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition flex items-center justify-center"
                    >
                      + افزودن
                    </button>
                  </div>

                  {/* List of personnel expert paths */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی']).map(r => (
                      <div key={r} className="flex justify-between items-center py-2 px-3 rounded-lg bg-[#0a0a0c]/60 border border-slate-850 text-xs">
                        <span className="text-slate-300 truncate max-w-[200px]">{r}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const currArr = settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی'];
                            const nextArr = currArr.filter(x => x !== r);
                            triggerSave({ ...settings, staffCategories: nextArr }, equipmentList, staffList, projectList, reservationList);
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          title="حذف تخصص"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* --- MODAL 1: EQUIPMENT DETAIL SPECIAL REPORT PAGE --- */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0d10] border border-slate-850 rounded-2xl w-full max-w-2xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedEquipment(null)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-[#0a0a0c] hover:bg-slate-800/40 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex flex-col gap-1 border-b border-slate-800/50 pb-4 font-sans">
                <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/25 text-[10px] font-bold self-start font-mono">
                  G-REPORT: {selectedEquipment.category}
                </span>
                <h3 className="text-lg font-black text-white mt-1 text-right">{selectedEquipment.name}</h3>
                <p className="text-xs text-slate-400 font-mono text-right">شناسه اموال دفتری: {selectedEquipment.id}</p>
              </div>

              {/* Specification Specs List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-300">شناسنامه و مشخصات سخت‌افزاری دستگاه:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedEquipment.specs.map((spec, sidx) => (
                    <div key={sidx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">{spec.key}:</span>
                      <span className="text-slate-200 font-bold">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dedicated Rental Performance and Revenue Stats */}
              {(() => {
                const report = getEquipmentReport(selectedEquipment.id);
                
                const isDayOccupied = (jy: number, jm: number, jd: number) => {
                  const dateStr = jalaliToGregorian(jy, jm, jd);
                  const targetTs = new Date(dateStr).getTime();
                  const isRented = projectList.some(proj => {
                    if (proj.status === 'لغو شده' || !proj.selectedEquipmentIds.includes(selectedEquipment.id)) return false;
                    const start = new Date(proj.startDate).getTime();
                    const end = new Date(proj.endDate).getTime();
                    return targetTs >= start && targetTs <= end;
                  });
                  if (isRented) return { type: 'rented', label: 'اجاره شده در پروژه اصلی' };

                  const isReserved = reservationList.some(res => {
                    if (res.equipmentId !== selectedEquipment.id) return false;
                    const start = new Date(res.startDate).getTime();
                    const end = new Date(res.endDate).getTime();
                    return targetTs >= start && targetTs <= end;
                  });
                  if (isReserved) return { type: 'reserved', label: 'رزرو موقت شده دفتری' };

                  return null;
                };

                return (
                  <div className="space-y-4">
                    
                    {/* Visual metrics panel for equipment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/15 text-center">
                        <span className="text-[10px] text-slate-400 block font-sans">دفعات کرایه رفته:</span>
                        <span className="text-xl font-bold text-white font-mono">{report.timesRented} بار</span>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-center">
                        <span className="text-[10px] text-slate-400 block font-sans">درآمد ناخالص حاصله:</span>
                        <span className="text-xl font-bold text-emerald-400 font-mono">
                          {formatCurrency(report.totalRevenue)}
                        </span>
                      </div>
                    </div>

                    {/* Visual Jalali Calendar Schedule Grid */}
                    <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-sans">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                        <h4 className="text-xs font-black text-orange-400">تقویم رهگیری اشغال کالا بر اساس روزهای شمسی:</h4>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (calMonth === 1) {
                                setCalMonth(12);
                                setCalYear(prev => prev - 1);
                              } else {
                                setCalMonth(prev => prev - 1);
                              }
                            }}
                            className="p-1 rounded bg-[#0d0d10] text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800"
                          >
                            ◀
                          </button>
                          
                          <span className="text-xs font-bold text-slate-200 min-w-[100px] text-center font-sans">
                            {
                              [
                                "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
                                "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
                              ][calMonth - 1]
                            } {calYear}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (calMonth === 12) {
                                setCalMonth(1);
                                setCalYear(prev => prev + 1);
                              } else {
                                setCalMonth(prev => prev + 1);
                              }
                            }}
                            className="p-1 rounded bg-[#0d0d10] text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800"
                          >
                            ▶
                          </button>
                        </div>
                      </div>

                      {/* Day of Week Titles */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 font-bold">
                        <span>شنبه</span>
                        <span>۱ش</span>
                        <span>۲ش</span>
                        <span>۳ش</span>
                        <span>۴ش</span>
                        <span>۵ش</span>
                        <span>جمعه</span>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const firstDayGreg = jalaliToGregorian(calYear, calMonth, 1);
                          const gregDayNum = new Date(firstDayGreg).getDay(); // Sunday=0, Monday=1, ..., Saturday=6
                          const startOffset = (gregDayNum + 1) % 7; // Convert Sunday=1, Sat=0 etc.
                          
                          const monthLength = calMonth <= 6 ? 31 : (calMonth <= 11 ? 30 : (
                            parseGregorianToJalali(jalaliToGregorian(calYear, 12, 30)).jm === 12 ? 30 : 29
                          ));
                          
                          const cells: React.ReactNode[] = [];
                          
                          // Empty preceding pads
                          for (let i = 0; i < startOffset; i++) {
                            cells.push(<div key={`pad-${i}`} className="h-8 rounded bg-slate-900/10" />);
                          }
                          
                          // Calendar active cells
                          for (let d = 1; d <= monthLength; d++) {
                            const occ = isDayOccupied(calYear, calMonth, d);
                            
                            let cellBg = "bg-[#0d0d10] text-slate-400 hover:bg-slate-800/80";
                            let tooltip = "خالی (موجود)";
                            if (occ?.type === 'rented') {
                              cellBg = "bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30";
                              tooltip = occ.label;
                            } else if (occ?.type === 'reserved') {
                              cellBg = "bg-orange-500/20 text-orange-300 font-black border border-orange-500/30 animate-pulse";
                              tooltip = occ.label;
                            }
                            
                            cells.push(
                              <div
                                key={d}
                                className={`h-8 flex flex-col items-center justify-center rounded text-[11px] font-mono cursor-default relative transition duration-150 ${cellBg}`}
                                title={`${d} ${[
                                  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
                                  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
                                ][calMonth - 1]}: ${tooltip}`}
                              >
                                <span>{d}</span>
                                {occ && (
                                  <span className="w-1 h-1 rounded-full bg-current absolute bottom-1" />
                                )}
                              </div>
                            );
                          }
                          
                          return cells;
                        })()}
                      </div>

                      {/* Calendar Legends */}
                      <div className="flex justify-center gap-3 pt-2 text-[9px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                          <span>اجاره رفته دفتری</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500/20 border border-orange-500/30" />
                          <span>رزرو موقت</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-[#0d0d10]" />
                          <span>کالای موجود دفتری</span>
                        </div>
                      </div>
                    </div>

                    {/* Historical rental ledger */}
                    <div className="space-y-2">
                       <h4 className="text-xs font-black text-slate-300">سوابق دقیق اجاره‌های فاکتور شده:</h4>
                      <div className="p-3 bg-slate-950 rounded-xl max-h-[140px] overflow-y-auto space-y-2.5 border border-slate-800/60 text-xs">
                        {report.history.length === 0 ? (
                          <p className="text-center text-slate-600 text-[11px] py-3">تاکنون فاکتور فعالی برای این دستگاه ثبت نشده است.</p>
                        ) : (
                          report.history.map((h, hidx) => (
                            <div key={hidx} className="flex justify-between items-center text-[11px] border-b border-slate-900/80 pb-2 last:border-b-0 last:pb-0">
                              <div className="space-y-0.5 text-right">
                                <span className="font-semibold text-slate-300 block">{h.projectName}</span>
                                <span className="text-[9px] text-slate-500">{h.clientName} | {h.dateRange}</span>
                              </div>
                              <span className="font-mono text-emerald-400">{formatCurrency(h.revenue)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Future Bookings Reservations */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-300">تقویم رزروهای تایید شده:</h4>
                      <div className="p-3 bg-slate-950 rounded-xl max-h-[120px] overflow-y-auto space-y-2.5 border border-slate-800/60 text-xs">
                        {report.reservations.length === 0 ? (
                          <p className="text-center text-slate-600 text-[11px] py-1">هیچ تاریخ رزروی در آینده ندارد.</p>
                        ) : (
                          report.reservations.map((res, ridx) => (
                            <div key={ridx} className="flex justify-between items-center text-[11px]">
                              <div className="space-y-0.5 text-right">
                                <span className="font-semibold text-slate-300 block">{res.projectName}</span>
                                <span className="text-[9px] text-slate-500">بنام: {res.clientName}</span>
                              </div>
                              <span className="font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                {formatStringDateToJalali(res.startDate)} الی {formatStringDateToJalali(res.endDate)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: STAFF DETAIL & PERFORMANCE REPORT --- */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d0d10] border border-slate-800/50 rounded-2xl w-full max-w-xl p-6 relative animate-fade-in">
            <button 
              onClick={() => setSelectedStaff(null)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-800/40 pb-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 flex items-center justify-center font-black text-sm shrink-0">
                  {selectedStaff.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedStaff.name}</h3>
                  <span className="text-xs text-orange-400 font-medium block">{selectedStaff.role}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">کد پرسنلی: {selectedStaff.id} | تلفن: {selectedStaff.phone}</span>
                </div>
              </div>

              {/* Staff metrics on performance and pay ledger */}
              {(() => {
                const report = getStaffReport(selectedStaff.id);
                return (
                  <div className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4 font-sans">
                      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/15 text-center">
                        <span className="text-[10px] text-slate-400 block">کل پروژه‌های آفیش شده:</span>
                        <span className="text-lg font-bold text-white font-mono">{report.projectCount} پروژه</span>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-center">
                        <span className="text-[10px] text-slate-400 block">مجموع دستمزد انباشته:</span>
                        <span className="text-lg font-bold text-emerald-400 font-mono">
                          {formatCurrency(report.totalWages)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-300">سیاهه کارکرد و وضعیت تسویه حساب عوامل:</h4>
                      <div className="p-3 bg-slate-950 rounded-xl max-h-[200px] overflow-y-auto space-y-2.5 border border-slate-800/60 text-xs">
                        {report.history.length === 0 ? (
                          <p className="text-center text-slate-600 text-[11px] py-4">تاکنون فاکتوری با حضور این عامل صادر نشده است.</p>
                        ) : (
                          report.history.map((h, hidx) => (
                            <div key={hidx} className="flex justify-between items-center text-[11px] border-b border-slate-900/80 pb-2 last:border-b-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-200 block">{h.projectName}</span>
                                <span className="text-[9px] text-slate-500">{h.dateRange}</span>
                              </div>
                              <div className="text-left space-y-1">
                                <span className="font-mono text-emerald-400 block">{formatCurrency(h.wage)}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  h.status === 'تسویه شده' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                                }`}>
                                  {h.status === 'تسویه شده' ? 'تسویه نهایی' : 'دریافت نشده'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Settlement simulation button */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <p className="text-[10px] text-slate-400">
                        برای تسویه حساب مالی با {selectedStaff.name}، فاکتور پروژه مربوطه در تب فاکتورها را به حالت «تسویه شده» ارتقا دهید.
                      </p>
                    </div>

                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: INVOICE PRINT RECEIPT VIEW --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl p-8 relative animate-fade-in my-8 print:my-0 print:p-0 print:border-none shadow-2xl">
            
            {/* Modal Controls (Unprinted) */}
            <div className="absolute top-4 left-4 flex gap-2 print:hidden font-sans">
              <button 
                onClick={() => window.print()}
                className="p-2.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ فاکتور</span>
              </button>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Area start */}
            <div className="space-y-6 text-right">
              
              {/* Header Box */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-slate-300 pb-6 pr-1 font-sans">
                <div className="flex items-center gap-3">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="h-12 max-w-[180px] object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 select-none shadow">
                      رست
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-slate-900 leading-tight">
                      فاکتور رسمی آفیش و کرایه تجهیزات
                    </h1>
                    <span className="text-[10px] text-slate-500 block mt-1 tracking-widest uppercase font-mono">
                      {settings.companyName || 'گروه هنر و رسانه رَست'}
                    </span>
                  </div>
                </div>
                <div className="text-left text-xs space-y-1 font-mono">
                  <div><strong>شماره سند:</strong> {selectedInvoice.id}</div>
                  <div><strong>تاریخ ثبت:</strong> {formatStringDateToJalali(selectedInvoice.createdAt)}</div>
                  <div><strong>وضعیت فالع:</strong> <span className="text-orange-600 font-bold">{selectedInvoice.status}</span></div>
                </div>
              </div>

              {/* Company & Client Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-sans">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1 text-xs">اطلاعات صادرکننده:</h3>
                  <div><strong>نام موسسه:</strong> {settings.companyName}</div>
                  <div><strong>تلفن هماهنگی:</strong> {settings.companyPhone}</div>
                  <div><strong>آدرس دفتر:</strong> {settings.companyAddress}</div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1 text-xs">اطلاعات خریدار / کارفرما:</h3>
                  <div><strong>شخص حقیقی/حقوقی:</strong> {selectedInvoice.clientName}</div>
                  <div><strong>پروژه آفیش شده:</strong> {selectedInvoice.projectName}</div>
                  <div><strong>بازه اجرا:</strong> {formatStringDateToJalali(selectedInvoice.startDate)} الی {formatStringDateToJalali(selectedInvoice.endDate)}</div>
                  <div><strong>ساعت آفیش:</strong> {selectedInvoice.deliveryTime} الی {selectedInvoice.returnTime} ({calculateRentDays(selectedInvoice.startDate, selectedInvoice.deliveryTime, selectedInvoice.endDate, selectedInvoice.returnTime)} روز کل)</div>
                </div>
              </div>

              {/* Rented Equipment Breakdown */}
              <div className="space-y-2.5 font-sans">
                <h3 className="font-bold text-xs text-slate-800">۱. تجهیزات اجاره شده (بر اساس دفتر کل):</h3>
                <table className="w-full text-right text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-2 border-l border-slate-200">کد دستگاه</th>
                      <th className="p-2 border-l border-slate-200">عنوان تجهیزات</th>
                      <th className="p-2 border-l border-slate-200 text-center">نوع</th>
                      <th className="p-2 border-l border-slate-200 text-left">تعرفه روزانه</th>
                      <th className="p-2 text-left">مبلغ کل ({selectedInvoice.pricingModel === 'project' ? 'ثابت پروژه' : `${calculateRentDays(selectedInvoice.startDate, selectedInvoice.deliveryTime, selectedInvoice.endDate, selectedInvoice.returnTime)} روز`})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.selectedEquipmentIds.map(eqId => {
                      const item = equipmentList.find(e => e.id === eqId);
                      if (!item) return null;
                      const days = calculateRentDays(selectedInvoice.startDate, selectedInvoice.deliveryTime, selectedInvoice.endDate, selectedInvoice.returnTime);
                      const isProjectBased = selectedInvoice.pricingModel === 'project';
                      const rate = (selectedInvoice.equipmentCustomRates && selectedInvoice.equipmentCustomRates[eqId] !== undefined)
                        ? selectedInvoice.equipmentCustomRates[eqId]
                        : item.dailyRate;
                      return (
                        <tr key={eqId} className="border-b border-slate-200/60 last:border-b-0 hover:bg-slate-50/50">
                          <td className="p-2 border-l border-slate-200 text-slate-500 font-mono">{eqId}</td>
                          <td className="p-2 border-l border-slate-200 font-bold">{item.name}</td>
                          <td className="p-2 border-l border-slate-200 text-center text-slate-500">{item.category}</td>
                          <td className="p-2 border-l border-slate-200 text-left font-mono">
                            {formatCurrency(rate, '')}
                            {selectedInvoice.equipmentCustomRates && selectedInvoice.equipmentCustomRates[eqId] !== undefined && (
                              <span className="text-[9px] bg-amber-500/10 text-orange-600 rounded px-1 mr-1 font-sans font-bold">تعرفه سفارشی</span>
                            )}
                          </td>
                          <td className="p-2 text-left font-mono font-bold">{formatCurrency(rate * (isProjectBased ? 1 : days), '')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Staff Personnel Breakdown */}
              {selectedInvoice.selectedStaff.length > 0 && (
                <div className="space-y-2.5 font-sans">
                  <h3 className="font-bold text-xs text-slate-800">۲. عوامل و نیروی انسانی صحنه:</h3>
                  <table className="w-full text-right text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-2 border-l border-slate-200">کد پرسنل</th>
                        <th className="p-2 border-l border-slate-200">نام عامل</th>
                        <th className="p-2 border-l border-slate-200">نقش / تخصص</th>
                        <th className="p-2 border-l border-slate-200 text-center">تعداد روز کار</th>
                        <th className="p-2 border-l border-slate-200 text-left">حق‌الزحمه روزانه</th>
                        <th className="p-2 text-left">جمع ناخالص حقوق دهی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.selectedStaff.map(s => {
                        const person = staffList.find(st => st.id === s.staffId);
                        if (!person) return null;
                        const isProjectBased = selectedInvoice.pricingModel === 'project';
                        return (
                          <tr key={s.staffId} className="border-b border-slate-200/60 last:border-b-0 hover:bg-slate-50/50">
                            <td className="p-2 border-l border-slate-200 text-slate-500 font-mono">{s.staffId}</td>
                            <td className="p-2 border-l border-slate-200 font-bold">{person.name}</td>
                            <td className="p-2 border-l border-slate-200 text-slate-500">{s.selectedRole || person.role}</td>
                            <td className="p-2 border-l border-slate-200 text-center font-mono">{isProjectBased ? 'ثابت پروژه' : `${s.days} روز`}</td>
                            <td className="p-2 border-l border-slate-200 text-left font-mono">{formatCurrency(s.customWage, '')}</td>
                            <td className="p-2 text-left font-mono font-bold">{formatCurrency(s.customWage * (isProjectBased ? 1 : s.days), '')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Terms and conditions block custom */}
              {settings.terms && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] leading-relaxed text-slate-600 font-sans">
                  <span className="font-bold text-slate-800 block mb-1">ضوابط عمومی و تعهد عودت سلامت دستگاه:</span>
                  <p className="whitespace-pre-line text-right">{settings.terms}</p>
                </div>
              )}

              {/* Final Math Box */}
              <div className="border-t-2 border-slate-300 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                {/* Visual Seal / Stamp mock for authenticity */}
                {settings.showSignature !== false ? (
                  <div className="flex gap-4 items-center">
                    <div className="border-4 border-double border-orange-500 text-orange-600 p-2 text-[10px] font-bold rounded-xl rotate-6 uppercase opacity-80 select-none text-center">
                      <span>{settings.signatureLabel || 'مهر و امضای مسئول تجهیزات'}</span><br />
                      <span className="text-[8px] text-slate-500">تایید سیستم هوشمند</span>
                    </div>
                    <div className="border-4 border-dashed border-slate-400 text-slate-400 p-2 text-[10px] font-bold rounded-xl -rotate-3 select-none text-center">
                      <span>امضای کارفرما / تحویل گیرنده</span> <br />
                      <span className="text-[8px] text-slate-500">تحویل و عودت فیزیکی</span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                {/* Totals table */}
                <div className="w-full md:w-80 b-0 border-collapse border-slate-200 text-xs text-left font-mono space-y-1.5 self-end">
                  <div className="flex justify-between border-b border-slate-200 pb-1 text-slate-600">
                    <span>جمع ناخالص تجهیزات:</span>
                    <span>{formatCurrency(selectedInvoice.equipmentCost)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1 text-slate-600">
                    <span>جمع ناخالص پرسنلی:</span>
                    <span>{formatCurrency(selectedInvoice.staffCost)}</span>
                  </div>
                  {selectedInvoice.discountPercent > 0 && (
                    <div className="flex justify-between border-b border-slate-200 pb-1 text-orange-600 font-bold">
                      <span>تخفیف ویژه ({selectedInvoice.discountPercent}%):</span>
                      <span>
                        - {formatCurrency((selectedInvoice.equipmentCost + selectedInvoice.staffCost) * (selectedInvoice.discountPercent / 100))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-800 pt-1">
                    <span className="font-sans">مبلغ کل قابل پرداخت:</span>
                    <span className="text-emerald-700">{formatCurrency(selectedInvoice.totalCost)}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- SIDE MODAL: ADD EQUIPMENT FORM --- */}
      {isAddingEq && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddEquipment}
            className="bg-[#0d0d10] border border-slate-800/60 rounded-2xl w-full max-w-md p-6 relative animate-fade-in space-y-4"
          >
            <button 
              type="button"
              onClick={() => setIsAddingEq(false)}
              className="absolute top-4 left-4 p-1 rounded bg-[#0a0a0c] text-slate-400 hover:text-white transition cursor-pointer font-sans"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="font-sans">
              <h3 className="text-base font-bold text-white">افزودن دستگاه سینمایی جدید</h3>
              <p className="text-xs text-slate-400">ثبت در حافظه دائمی دفتر کل اموال</p>
            </div>

            <div className="space-y-3 pt-2 font-sans">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام و مدل کامل دستگاه:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Sony FX3 Cinema Camera"
                  value={newEq.name}
                  onChange={(e) => setNewEq({ ...newEq, name: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-sans">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">کد اموال پلاک دستگاه:</label>
                  <input
                    type="text"
                    placeholder="مثال: EQ-1044"
                    value={newEq.assetCode}
                    onChange={(e) => setNewEq({ ...newEq, assetCode: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">بارکد / اسکنر سریال:</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="۴۵۳۹۲۸۲۷۳..."
                      value={newEq.barcode}
                      onChange={(e) => setNewEq({ ...newEq, barcode: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
                        setNewEq(prev => ({ ...prev, barcode: randomBarcode }));
                        alert(`دستگاه بارکدخوان رَست فعال شد. بارکد ثبت شده: ${randomBarcode}`);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-orange-400 rounded-lg text-[10px] shrink-0 font-bold transition duration-150"
                      title="شبیه سازی اسکنر بارکد فیزیکی"
                    >
                      اسکن
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">دسته‌بندی:</label>
                  <select
                    value={newEq.category}
                    onChange={(e) => setNewEq({ ...newEq, category: e.target.value as EqCategory })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                  >
                    {(settings.equipmentCategories || ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه']).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-sans">نرخ کرایه روزانه (تومان):</label>
                  <input
                    type="number"
                    min="50000"
                    step="50000"
                    required
                    value={newEq.dailyRate}
                    onChange={(e) => setNewEq({ ...newEq, dailyRate: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Specs items builder */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-300 font-sans">
                  <span>مشخصات فنی دستگاه (اختیاری):</span>
                  <button
                    type="button"
                    onClick={() => setNewEq({ ...newEq, specs: [...newEq.specs, { key: '', value: '' }] })}
                    className="text-[10px] text-orange-400 hover:text-white cursor-pointer font-bold"
                  >
                    + افزودن سطر
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[120px] overflow-y-auto font-sans">
                  {newEq.specs.map((spec, sidx) => (
                    <div key={sidx} className="flex gap-2 items-center animate-fade-in">
                      <input
                        type="text"
                        placeholder="ویژگی (مثلا: وزن)"
                        value={spec.key}
                        onChange={(e) => {
                          const nextSpecs = [...newEq.specs];
                          nextSpecs[sidx].key = e.target.value;
                          setNewEq({ ...newEq, specs: nextSpecs });
                        }}
                        className="w-[43%] bg-[#0a0a0c] text-slate-100 text-[11px] rounded px-2 py-1.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                      <input
                        type="text"
                        placeholder="مقدار (مثلا: ۱.۵ کیلو)"
                        value={spec.value}
                        onChange={(e) => {
                          const nextSpecs = [...newEq.specs];
                          nextSpecs[sidx].value = e.target.value;
                          setNewEq({ ...newEq, specs: nextSpecs });
                        }}
                        className="w-[43%] bg-[#0a0a0c] text-slate-100 text-[11px] rounded px-2 py-1.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextSpecs = newEq.specs.filter((_, idx) => idx !== sidx);
                          setNewEq({ ...newEq, specs: nextSpecs.length > 0 ? nextSpecs : [{ key: '', value: '' }] });
                        }}
                        className="p-1.5 rounded text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500/25 transition shrink-0 inline-flex items-center justify-center cursor-pointer"
                        title="حذف ویژگی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="pt-4 flex justify-end gap-2 text-xs font-sans">
              <button
                type="button"
                onClick={() => setIsAddingEq(false)}
                className="px-4 py-2 rounded-lg bg-[#0a0a0c] hover:bg-slate-800/55 text-slate-400 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold cursor-pointer"
              >
                ثبت دستگاه
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- SIDE MODAL: ADD STAFF FORM --- */}
      {isAddingSt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <form 
            onSubmit={handleAddStaff}
            className="bg-[#0d0d10] border border-slate-800/60 rounded-2xl w-full max-w-md p-6 relative animate-fade-in space-y-4"
          >
            <button 
              type="button"
              onClick={() => setIsAddingSt(false)}
              className="absolute top-4 left-4 p-1 rounded bg-[#0a0a0c] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white">افزودن عامل انسانی/پرسنل صحنه</h3>
              <p className="text-xs text-slate-400 font-sans">ثبت در سیستم جامع هماهنگی تیم فیلمبرداری و نور</p>
            </div>

            {/* Profile Picture Upload Section */}
            <div className="flex flex-col items-center justify-center space-y-2 pb-2">
              <div className="relative w-16 h-16 rounded-full bg-[#0a0a0c] border border-slate-800/85 flex items-center justify-center overflow-hidden">
                {newSt.avatarUrl ? (
                  <img src={newSt.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <label className="text-[11px] text-orange-400 hover:text-white cursor-pointer hover:underline font-bold">
                <span>آپلود تصویر پرسنل</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewSt(prev => ({ ...prev, avatarUrl: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مهران راد"
                  value={newSt.name}
                  onChange={(e) => setNewSt({ ...newSt, name: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">سمت / تخصص اصلی:</label>
                  <select
                    value={newSt.role}
                    onChange={(e) => setNewSt({ ...newSt, role: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                  >
                    <option value="">انتخاب نقش...</option>
                    {(settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی']).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    <option value="سایر">سایر / وارد کردن دستی</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">دستمرد پایه روزانه (تومان):</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    required
                    value={newSt.dailyWage}
                    onChange={(e) => setNewSt({ ...newSt, dailyWage: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 font-mono transition"
                  />
                </div>
              </div>

              {newSt.role === 'سایر' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">عنوان سمت دلخواه:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اپراتور کرین"
                    onChange={(e) => setNewSt({ ...newSt, role: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-300">مهارت و سوابق مختصر:</label>
                <input
                  type="text"
                  placeholder="مثال: ۴ سال سابقه حضور فعال در فیلمهای صنعتی"
                  value={newSt.experience}
                  onChange={(e) => setNewSt({ ...newSt, experience: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">تلفن همراه هماهنگی صدور آفیش:</label>
                <input
                  type="text"
                  placeholder="مثال: 09121234567"
                  value={newSt.phone}
                  onChange={(e) => setNewSt({ ...newSt, phone: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 font-mono transition"
                />
              </div>

              {/* Specialties checklist builder */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-orange-400 font-bold">مهارت‌ها/تخصص‌های چندگانه (بهمراه دستمزد):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentS = newSt.specialties || [];
                      setNewSt({
                        ...newSt,
                        specialties: [...currentS, { role: 'طراح نور و نورپرداز', wage: 1200000 }]
                      });
                    }}
                    className="text-[10px] text-orange-400 hover:text-white cursor-pointer font-bold bg-orange-500/10 px-2 py-0.5 rounded"
                  >
                    + افزودن تخصص
                  </button>
                </div>

                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {(newSt.specialties || []).length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-2">هیچ تخصص خاصی ثبت نشده (از سمت و دستمزد پایه فوق استفاده می‌شود)</p>
                  ) : (
                    (newSt.specialties || []).map((spec, sidx) => (
                      <div key={sidx} className="flex gap-1.5 items-center">
                        <select
                          value={spec.role}
                          onChange={(e) => {
                            const nextS = [...(newSt.specialties || [])];
                            nextS[sidx].role = e.target.value;
                            setNewSt({ ...newSt, specialties: nextS });
                          }}
                          className="bg-[#0a0a0c] text-slate-100 text-[10px] rounded border border-slate-800 p-1 w-[45%]"
                        >
                          {(settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی']).map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={spec.wage}
                          step="50000"
                          title="دستمزد روزانه"
                          onChange={(e) => {
                            const nextS = [...(newSt.specialties || [])];
                            nextS[sidx].wage = parseInt(e.target.value) || 0;
                            setNewSt({ ...newSt, specialties: nextS });
                          }}
                          className="bg-[#0a0a0c] text-slate-100 text-[10px] rounded border border-slate-800 p-1 w-[40%] font-mono text-center"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const nextS = (newSt.specialties || []).filter((_, idx) => idx !== sidx);
                            setNewSt({ ...newSt, specialties: nextS });
                          }}
                          className="p-1 rounded text-red-500 hover:text-white bg-red-400/10 cursor-pointer hover:bg-red-500/25 shrink-0 inline-flex items-center justify-center p-1"
                          title="حذف تخصص"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddingSt(false)}
                className="px-4 py-2 rounded-lg bg-[#0a0a0c] hover:bg-slate-800/55 text-slate-400 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold cursor-pointer"
              >
                ثبت همکار
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- SIDE MODAL: DIRECT RESERVATION CALENDAR BLOCKER --- */}
      {isReserving && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <form 
            onSubmit={handleAddReservation}
            className="bg-[#0d0d10] border border-slate-800/60 rounded-2xl w-full max-w-md p-6 relative animate-fade-in space-y-4"
          >
            <button 
              type="button"
              onClick={() => setIsReserving(false)}
              className="absolute top-4 left-4 p-1 rounded bg-[#0a0a0c] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white pr-2">ثبت تاریخ رزرو موقت دستگاه</h3>
              <p className="text-xs text-slate-400 pr-2">بلاک کردن تاریخ دستگاه در تقویم دفتری پیش از قطعیت فاکتور</p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              
              <div className="space-y-1">
                <label className="text-slate-300 pr-1 block">انتخاب دستگاه رسانه‌ای:</label>
                <select
                  required
                  value={reservationForm.equipmentId}
                  onChange={(e) => setReservationForm({ ...reservationForm, equipmentId: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition cursor-pointer text-right"
                >
                  <option value="">-- لطفا انتخاب کنید --</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name} ({eq.id})</option>
                  ))}
                </select>

                {/* Barcode scanner helper for reservation */}
                <div className="pt-2 flex items-center gap-2 font-sans">
                  <input
                    type="text"
                    placeholder="یا اسکن بارکد دستگاه..."
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const matched = equipmentList.find(eq => eq.barcode === val || eq.assetCode === val || eq.id === val);
                        if (matched) {
                          setReservationForm(prev => ({ ...prev, equipmentId: matched.id }));
                          e.target.value = ''; // clear input after match
                        }
                      }
                    }}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-[11px] rounded border border-slate-800 px-2.5 py-1.5 font-mono text-center focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const withBarcode = equipmentList.filter(e => e.barcode);
                      if (withBarcode.length > 0) {
                        const randomEq = withBarcode[Math.floor(Math.random() * withBarcode.length)];
                        setReservationForm(prev => ({ ...prev, equipmentId: randomEq.id }));
                      } else {
                        alert('هیچ دستگاهی با بارکد یافت نشد.');
                      }
                    }}
                    className="px-2.5 py-1.5 bg-[#141417] border border-orange-500/10 hover:border-orange-500/35 text-orange-400 rounded text-[9px] font-bold shrink-0 transition cursor-pointer"
                  >
                    شبیه‌ساز بارکد
                  </button>
                </div>
              </div>

              {/* Jalali Quick selecting calendar inputs */}
              <div className="p-3 rounded-xl bg-[#0a0a0c] border border-slate-800/80 space-y-3">
                <span className="text-[11px] text-orange-400 font-bold block">سامانه انتخاب تقویم شمسی رَست:</span>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Start Jalali Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block pr-1">شروع شمسی:</label>
                    <div className="flex gap-1">
                      <select
                        value={startJalali.jd}
                        onChange={(e) => handleStartJalaliChange('jd', parseInt(e.target.value))}
                        className="bg-[#121216] text-[10px] text-slate-100 rounded border border-slate-800 p-1 w-full text-center"
                        title="روز"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <select
                        value={startJalali.jm}
                        onChange={(e) => handleStartJalaliChange('jm', parseInt(e.target.value))}
                        className="bg-[#121216] text-[10px] text-slate-100 rounded border border-slate-800 p-1 w-full text-center"
                        title="ماه"
                      >
                        {[
                          { val: 1, label: "فروردین" },
                          { val: 2, label: "اردیبهشت" },
                          { val: 3, label: "خرداد" },
                          { val: 4, label: "تیر" },
                          { val: 5, label: "مرداد" },
                          { val: 6, label: "شهریور" },
                          { val: 7, label: "مهر" },
                          { val: 8, label: "آبان" },
                          { val: 9, label: "آذر" },
                          { val: 10, label: "دی" },
                          { val: 11, label: "بهمن" },
                          { val: 12, label: "اسفند" }
                        ].map(m => (
                          <option key={m.val} value={m.val}>{m.label}</option>
                        ))}
                      </select>

                      <select
                        value={startJalali.jy}
                        onChange={(e) => handleStartJalaliChange('jy', parseInt(e.target.value))}
                        className="bg-[#121216] text-[10px] text-slate-100 rounded border border-slate-800 p-1 w-full text-center"
                        title="سال"
                      >
                        {[1404, 1405, 1406, 1407, 1408].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* End Jalali Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block pr-1">پایان شمسی:</label>
                    <div className="flex gap-1">
                      <select
                        value={endJalali.jd}
                        onChange={(e) => handleEndJalaliChange('jd', parseInt(e.target.value))}
                        className="bg-[#121216] text-[10px] text-slate-100 rounded border border-slate-800 p-1 w-full text-center"
                        title="روز"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <select
                        value={endJalali.jm}
                        onChange={(e) => handleEndJalaliChange('jm', parseInt(e.target.value))}
                        className="bg-[#121216] text-[10px] text-slate-100 rounded border border-slate-800 p-1 w-full text-center"
                        title="ماه"
                      >
                        {[
                          { val: 1, label: "فروردین" },
                          { val: 2, label: "اردیبهشت" },
                          { val: 3, label: "خرداد" },
                          { val: 4, label: "تیر" },
                          { val: 5, label: "مرداد" },
                          { val: 6, label: "شهریور" },
                          { val: 7, label: "مهر" },
                          { val: 8, label: "آبان" },
                          { val: 9, label: "آذر" },
                          { val: 10, label: "دی" },
                          { val: 11, label: "بهمن" },
                          { val: 12, label: "اسفند" }
                        ].map(m => (
                          <option key={m.val} value={m.val}>{m.label}</option>
                        ))}
                      </select>

                      <select
                        value={endJalali.jy}
                        onChange={(e) => handleEndJalaliChange('jy', parseInt(e.target.value))}
                        className="bg-[#121216] text-[10px] text-slate-100 rounded border border-slate-800 p-1 w-full text-center"
                        title="سال"
                      >
                        {[1404, 1405, 1406, 1407, 1408].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 pr-1 block">تاریخ شروع رزرو (میلادی):</label>
                  <input
                    type="date"
                    required
                    value={reservationForm.startDate}
                    onChange={(e) => setReservationForm({ ...reservationForm, startDate: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 pr-1 block">تاریخ پایان رزرو (میلادی):</label>
                  <input
                    type="date"
                    required
                    value={reservationForm.endDate}
                    onChange={(e) => setReservationForm({ ...reservationForm, endDate: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 pr-1 block">نام مشتری رزروکننده:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: آقای کریمی"
                  value={reservationForm.clientName}
                  onChange={(e) => setReservationForm({ ...reservationForm, clientName: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 pr-1 block">نام پروژه (اختیاری):</label>
                <input
                  type="text"
                  placeholder="مثال: مستند آبهای آزاد"
                  value={reservationForm.projectName}
                  onChange={(e) => setReservationForm({ ...reservationForm, projectName: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

            </div>

            <div className="pt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsReserving(false)}
                className="px-4 py-2 rounded-lg bg-[#0a0a0c] hover:bg-slate-800/55 text-slate-400 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold cursor-pointer"
              >
                ثبت رزرو موقت دستگاه
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- SIDE MODAL: EDIT EQUIPMENT FORM --- */}
      {isEditingEq && editingEq && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const nextList = equipmentList.map(eq => eq.id === editingEq.id ? editingEq : eq);
              triggerSave(settings, nextList, staffList, projectList, reservationList);
              setIsEditingEq(false);
              setEditingEq(null);
            }}
            className="bg-[#0d0d10] border border-slate-800/60 rounded-2xl w-full max-w-md p-6 relative animate-fade-in space-y-4"
          >
            <button 
              type="button"
              onClick={() => {
                setIsEditingEq(false);
                setEditingEq(null);
              }}
              className="absolute top-4 left-4 p-1 rounded bg-[#0a0a0c] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white">ویرایش مشخصات دستگاه سینمایی</h3>
              <p className="text-xs text-slate-400">به‌روزرسانی نرخ کرایه روزانه و دسته‌بندی کالا</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام و مدل کامل دستگاه:</label>
                <input
                  type="text"
                  required
                  value={editingEq.name}
                  onChange={(e) => setEditingEq({ ...editingEq, name: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">دسته‌بندی:</label>
                  <select
                    value={editingEq.category}
                    onChange={(e) => setEditingEq({ ...editingEq, category: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition cursor-pointer font-sans"
                  >
                    {(settings.equipmentCategories || ['دوربین', 'لنز', 'تجهیزات حرکتی/پایه', 'صدابرداری', 'نورپردازی', 'متفرقه']).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">نرخ روزانه کرایه (تومان):</label>
                  <input
                    type="number"
                    min="50000"
                    step="50000"
                    required
                    value={editingEq.dailyRate}
                    onChange={(e) => setEditingEq({ ...editingEq, dailyRate: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 font-mono transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-sans">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">کد اموال پلاک دستگاه:</label>
                  <input
                    type="text"
                    required
                    value={editingEq.assetCode || ''}
                    onChange={(e) => setEditingEq({ ...editingEq, assetCode: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">بارکد / اسکنر سریال:</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="۴۵۳۹۲۸۲۷۳..."
                      value={editingEq.barcode || ''}
                      onChange={(e) => setEditingEq({ ...editingEq, barcode: e.target.value })}
                      className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
                        setEditingEq(prev => prev ? ({ ...prev, barcode: randomBarcode }) : null);
                        alert(`دستگاه بارکدخوان رَست فعال شد. بارکد ثبت شده: ${randomBarcode}`);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-orange-400 rounded-lg text-[10px] shrink-0 font-bold transition duration-150"
                      title="شبیه سازی اسکنر بارکد فیزیکی"
                    >
                      اسکن
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-xs text-slate-300">وضعیت کالیبراسیون و موجودی:</label>
                <select
                  value={editingEq.status}
                  onChange={(e) => setEditingEq({ ...editingEq, status: e.target.value as any })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                >
                  <option value="موجود">موجود در دفتر</option>
                  <option value="اجاره شده">آفیش و اجاره شده</option>
                  <option value="تعمیر">در دست تعمیر / کالیبراسیون</option>
                </select>
              </div>

              {/* Specs items builder */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>ویرایش ارکان و مشخصات فنی:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentSpecs = editingEq.specs || [];
                      setEditingEq({ ...editingEq, specs: [...currentSpecs, { key: '', value: '' }] });
                    }}
                    className="text-[10px] text-orange-400 hover:text-white cursor-pointer font-bold"
                  >
                    + افزودن سطر کالا
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[120px] overflow-y-auto font-sans">
                  {(editingEq.specs || []).map((spec, sidx) => (
                    <div key={sidx} className="flex gap-2 items-center animate-fade-in">
                      <input
                        type="text"
                        placeholder="ویژگی (مثلا: وزن)"
                        value={spec.key}
                        onChange={(e) => {
                          const nextSpecs = [...(editingEq.specs || [])];
                          nextSpecs[sidx] = { ...nextSpecs[sidx], key: e.target.value };
                          setEditingEq({ ...editingEq, specs: nextSpecs });
                        }}
                        className="w-[43%] bg-[#0a0a0c] text-slate-100 text-[11px] rounded px-2 py-1.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                      <input
                        type="text"
                        placeholder="مقدار (مثلا: ۱.۵ کیلو)"
                        value={spec.value}
                        onChange={(e) => {
                          const nextSpecs = [...(editingEq.specs || [])];
                          nextSpecs[sidx] = { ...nextSpecs[sidx], value: e.target.value };
                          setEditingEq({ ...editingEq, specs: nextSpecs });
                        }}
                        className="w-[43%] bg-[#0a0a0c] text-slate-100 text-[11px] rounded px-2 py-1.5 border border-slate-800/80 focus:outline-none focus:border-orange-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextSpecs = (editingEq.specs || []).filter((_, idx) => idx !== sidx);
                          setEditingEq({ ...editingEq, specs: nextSpecs.length > 0 ? nextSpecs : [{ key: '', value: '' }] });
                        }}
                        className="p-1.5 rounded text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500/25 transition shrink-0 inline-flex items-center justify-center cursor-pointer"
                        title="حذف ویژگی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsEditingEq(false);
                  setEditingEq(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#0a0a0c] hover:bg-slate-800/55 text-slate-400 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold cursor-pointer"
              >
                ذخیره تغییرات کالا
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- SIDE MODAL: EDIT STAFF FORM --- */}
      {isEditingSt && editingSt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const nextList = staffList.map(st => st.id === editingSt.id ? editingSt : st);
              triggerSave(settings, equipmentList, nextList, projectList, reservationList);
              setIsEditingSt(false);
              setEditingSt(null);
            }}
            className="bg-[#0d0d10] border border-slate-800/60 rounded-2xl w-full max-w-md p-6 relative animate-fade-in space-y-4"
          >
            <button 
              type="button"
              onClick={() => {
                setIsEditingSt(false);
                setEditingSt(null);
              }}
              className="absolute top-4 left-4 p-1 rounded bg-[#0a0a0c] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white">ویرایش مشخصات همکار</h3>
              <p className="text-xs text-slate-400 font-sans">به‌روزرسانی حقوق روزانه و مهارت‌های همکار</p>
            </div>

            {/* Profile Picture Upload Section */}
            <div className="flex flex-col items-center justify-center space-y-2 pb-2">
              <div className="relative w-16 h-16 rounded-full bg-[#0a0a0c] border border-slate-800/85 flex items-center justify-center overflow-hidden">
                {editingSt.avatarUrl ? (
                  <img src={editingSt.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <label className="text-[11px] text-orange-400 hover:text-white cursor-pointer hover:underline font-bold">
                <span>تغییر تصویر پرسنل</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditingSt(prev => prev ? { ...prev, avatarUrl: reader.result as string } : null);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={editingSt.name}
                  onChange={(e) => setEditingSt({ ...editingSt, name: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">سمت / تخصص:</label>
                  <select
                    value={editingSt.role}
                    onChange={(e) => setEditingSt({ ...editingSt, role: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition cursor-pointer"
                  >
                    {(settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی']).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    <option value="سایر">سایر / وارد کردن دستی</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">دستمرد پایه روزانه (تومان):</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    required
                    value={editingSt.dailyWage}
                    onChange={(e) => setEditingSt({ ...editingSt, dailyWage: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 font-mono transition"
                  />
                </div>
              </div>

              {editingSt.role === 'سایر' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">عنوان سمت دلخواه:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اپراتور کرین"
                    onChange={(e) => setEditingSt({ ...editingSt, role: e.target.value })}
                    className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-300">مهارت و سوابق مختصر:</label>
                <input
                  type="text"
                  value={editingSt.experience}
                  onChange={(e) => setEditingSt({ ...editingSt, experience: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">تلفن همراه هماهنگی صدور آفیش:</label>
                <input
                  type="text"
                  value={editingSt.phone}
                  onChange={(e) => setEditingSt({ ...editingSt, phone: e.target.value })}
                  className="w-full bg-[#0a0a0c] text-slate-100 text-xs rounded-lg px-3 py-2.5 border border-slate-800/60 focus:outline-none focus:border-orange-500 font-mono transition"
                />
              </div>

              {/* Specialties checklist builder */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-orange-400 font-bold">مهارت‌ها/تخصص‌های چندگانه (بهمراه دستمزد):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentS = editingSt.specialties || [];
                      setEditingSt({
                        ...editingSt,
                        specialties: [...currentS, { role: 'طراح نور و نورپرداز', wage: 1200000 }]
                      });
                    }}
                    className="text-[10px] text-orange-400 hover:text-white cursor-pointer font-bold bg-orange-500/10 px-2 py-0.5 rounded"
                  >
                    + افزودن تخصص
                  </button>
                </div>

                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {(editingSt.specialties || []).length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-2">هیچ تخصص خاصی ثبت نشده (از سمت و دستمزد پایه فوق استفاده می‌شود)</p>
                  ) : (
                    (editingSt.specialties || []).map((spec, sidx) => (
                      <div key={sidx} className="flex gap-1.5 items-center">
                        <select
                          value={spec.role}
                          onChange={(e) => {
                            const nextS = [...(editingSt.specialties || [])];
                            nextS[sidx] = { ...nextS[sidx], role: e.target.value };
                            setEditingSt({ ...editingSt, specialties: nextS });
                          }}
                          className="bg-[#0a0a0c] text-slate-100 text-[10px] rounded border border-slate-800 p-1 w-[45%]"
                        >
                          {(settings.staffCategories || ['تصویربردار و مدیر فیلمبرداری', 'صدابردار ارشد صحنه', 'طراح نور و نورپرداز', 'دستیار اول تصویر و فالوفوکوسر', 'اپراتور کرین / دستیار فنی']).map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={spec.wage}
                          step="50000"
                          title="دستمزد روزانه"
                          onChange={(e) => {
                            const nextS = [...(editingSt.specialties || [])];
                            nextS[sidx] = { ...nextS[sidx], wage: parseInt(e.target.value) || 0 };
                            setEditingSt({ ...editingSt, specialties: nextS });
                          }}
                          className="bg-[#0a0a0c] text-slate-100 text-[10px] rounded border border-slate-800 p-1 w-[40%] font-mono text-center"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const nextS = (editingSt.specialties || []).filter((_, idx) => idx !== sidx);
                            setEditingSt({ ...editingSt, specialties: nextS });
                          }}
                          className="p-1 rounded text-red-500 hover:text-white bg-red-400/10 cursor-pointer hover:bg-red-500/25 shrink-0 inline-flex items-center justify-center p-1"
                          title="حذف تخصص"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsEditingSt(false);
                  setEditingSt(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#0a0a0c] hover:bg-slate-800/55 text-slate-400 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold cursor-pointer"
              >
                ذخیره تغییرات همکار
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

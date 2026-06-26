import { Equipment, Staff, Project, Reservation, AppSettings, ProjectStatus } from './types';
import { INITIAL_SETTINGS, INITIAL_EQUIPMENT, INITIAL_STAFF, INITIAL_PROJECTS, INITIAL_RESERVATIONS } from './seeds';

export function calculateRentDays(startDate: string, deliveryTime: string, endDate: string, returnTime: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T${deliveryTime || '09:00'}`);
  const end = new Date(`${endDate}T${returnTime || '18:00'}`);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 1; // Minimum 1 day for same day or negative range
  
  const diffHrs = diffMs / (1000 * 60 * 60);
  const calculatedDays = Math.ceil(diffHrs / 24);
  
  return calculatedDays < 1 ? 1 : calculatedDays;
}

export function loadLocalStorageState() {
  if (typeof window === 'undefined') {
    return {
      settings: INITIAL_SETTINGS,
      equipment: INITIAL_EQUIPMENT,
      staff: INITIAL_STAFF,
      projects: INITIAL_PROJECTS,
      reservations: INITIAL_RESERVATIONS
    };
  }
  
  const settingsStr = localStorage.getItem('rc_settings');
  const equipmentStr = localStorage.getItem('rc_equipment');
  const staffStr = localStorage.getItem('rc_staff');
  const projectsStr = localStorage.getItem('rc_projects');
  const reservationsStr = localStorage.getItem('rc_reservations');
  
  return {
    settings: settingsStr ? JSON.parse(settingsStr) : INITIAL_SETTINGS,
    equipment: equipmentStr ? JSON.parse(equipmentStr) : INITIAL_EQUIPMENT,
    staff: staffStr ? JSON.parse(staffStr) : INITIAL_STAFF,
    projects: projectsStr ? JSON.parse(projectsStr) : INITIAL_PROJECTS,
    reservations: reservationsStr ? JSON.parse(reservationsStr) : INITIAL_RESERVATIONS,
  };
}

export function saveLocalStorageState(
  settings: AppSettings,
  equipment: Equipment[],
  staff: Staff[],
  projects: Project[],
  reservations: Reservation[]
) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('rc_settings', JSON.stringify(settings));
  localStorage.setItem('rc_equipment', JSON.stringify(equipment));
  localStorage.setItem('rc_staff', JSON.stringify(staff));
  localStorage.setItem('rc_projects', JSON.stringify(projects));
  localStorage.setItem('rc_reservations', JSON.stringify(reservations));
}

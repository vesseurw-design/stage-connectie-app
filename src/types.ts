
export enum Role {
  ADMIN = 'ADMIN', // School CMS
  EMPLOYER = 'EMPLOYER' // Werkgever App
}

export enum AttendanceStatus {
  PRESENT = 'Aanwezig',
  ABSENT = 'Afwezig',
  SICK = 'Ziek',
  LATE = 'Te Laat'
}

export type DayOfWeek = 'Ma' | 'Di' | 'Wo' | 'Do' | 'Vr';

export interface Student {
  id: string;
  name: string;
  email: string;
  studentNumber: string;
}

export interface Employer {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  accessCode?: string; // Nieuw: Toegangscode voor inloggen
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface Internship {
  id: string;
  studentId: string;
  employerId: string;
  supervisorId: string; 
  startDate: string;
  endDate: string;
  scheduledDays: DayOfWeek[];
}

export interface AttendanceRecord {
  id: string;
  internshipId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  minutesLate?: number;
}

export interface ChatMessage {
  id: string;
  internshipId: string;
  senderRole: 'EMPLOYER' | 'SCHOOL';
  text: string;
  timestamp: number;
  read: boolean;
}

export interface AppState {
  students: Student[];
  employers: Employer[];
  supervisors: Supervisor[];
  internships: Internship[];
  attendance: AttendanceRecord[];
  messages: ChatMessage[];
}


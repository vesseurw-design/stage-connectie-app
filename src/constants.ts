
import { Student, Employer, Internship, AttendanceStatus, AttendanceRecord, Supervisor, ChatMessage } from './types';

export const INITIAL_STUDENTS: Student[] = [
  { id: 's1', name: 'Lucas de Vries', email: 'lucas@student.nl', studentNumber: '2024001' },
  { id: 's2', name: 'Sophie Jansen', email: 'sophie@student.nl', studentNumber: '2024002' },
  { id: 's3', name: 'Milan Bakker', email: 'milan@student.nl', studentNumber: '2024003' },
];

export const INITIAL_EMPLOYERS: Employer[] = [
  { 
    id: 'e1', 
    companyName: 'TechSolutions BV', 
    contactPerson: 'Jan Klaassen', 
    email: 'jan@techsolutions.nl', 
    phoneNumber: '06-12345678',
    accessCode: '' // Loaded from Supabase
  },
  { 
    id: 'e2', 
    companyName: 'ZorgCentrum Oost', 
    contactPerson: 'Els Visser', 
    email: 'els@zorg.nl', 
    phoneNumber: '06-87654321',
    accessCode: '' // Loaded from Supabase
  },
];

export const INITIAL_SUPERVISORS: Supervisor[] = [
  { id: 'sup1', name: 'Mevr. K. Dijkstra', email: 'k.dijkstra@school.nl', phoneNumber: '030-1239988' },
  { id: 'sup2', name: 'Dhr. P. de Jong', email: 'p.dejong@school.nl', phoneNumber: '030-5554433' },
];

export const INITIAL_INTERNSHIPS: Internship[] = [
  { 
    id: 'i1', 
    studentId: 's1', 
    employerId: 'e1', 
    supervisorId: 'sup1',
    startDate: '2024-02-01', 
    endDate: '2024-06-30',
    scheduledDays: ['Ma', 'Di']
  },
  { 
    id: 'i2', 
    studentId: 's2', 
    employerId: 'e2', 
    supervisorId: 'sup2',
    startDate: '2024-02-01', 
    endDate: '2024-06-30',
    scheduledDays: ['Do', 'Vr']
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1', internshipId: 'i1', date: '2024-05-20', status: AttendanceStatus.PRESENT },
  { id: 'a2', internshipId: 'i1', date: '2024-05-21', status: AttendanceStatus.SICK, notes: 'Griepje' },
  { id: 'a3', internshipId: 'i1', date: '2024-05-22', status: AttendanceStatus.PRESENT },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    internshipId: 'i1',
    senderRole: 'SCHOOL',
    text: 'Hoi Jan, hoe gaat het met Lucas zijn voortgang?',
    timestamp: Date.now() - 86400000,
    read: true
  },
  {
    id: 'm2',
    internshipId: 'i1',
    senderRole: 'EMPLOYER',
    text: 'Dag Mevr. Dijkstra, het gaat prima! Hij pakt het snel op.',
    timestamp: Date.now() - 82000000,
    read: true
  }
];

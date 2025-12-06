
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Users, Briefcase, GraduationCap, Plus, Link as LinkIcon, 
  UserCheck, LogOut, CalendarDays, MessageCircle, Send, 
  CheckCircle, XCircle, AlertCircle, Clock, Phone, User, 
  Sparkles, Mail, Home, History as HistoryIcon, ChevronLeft, 
  ChevronRight, Lock, X, ShieldCheck, KeyRound, Trash2 
} from 'lucide-react';

// --- 1. TYPES & ENUMS ---

export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYER = 'EMPLOYER',
  SUPERVISOR = 'SUPERVISOR'
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

export interface EmployerContact {
  id: string;
  employerId: string;
  name: string;
  email: string;
  accessCode: string;
  assignedInternships?: string[]; // IDs van stages deze contact mag zien
}

export interface Employer {
  id: string;
  companyName: string;
  phoneNumber: string;
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  accessCode?: string; // Wachtwoord voor inloggen
  assignedStudents?: string[]; // Array van student IDs
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

// --- 2. CONSTANTS (MOCK DATA) ---

const INITIAL_STUDENTS: Student[] = [
  { id: 's1', name: 'Lucas de Vries', email: 'lucas@student.nl', studentNumber: '2024001' },
  { id: 's2', name: 'Sophie Jansen', email: 'sophie@student.nl', studentNumber: '2024002' },
  { id: 's3', name: 'Milan Bakker', email: 'milan@student.nl', studentNumber: '2024003' },
];

const INITIAL_EMPLOYERS: Employer[] = [
  { id: 'e1', companyName: 'TechSolutions BV', phoneNumber: '06-12345678' },
  { id: 'e2', companyName: 'ZorgCentrum Oost', phoneNumber: '06-87654321' },
];

const INITIAL_EMPLOYER_CONTACTS: EmployerContact[] = [
  { id: 'ec1', employerId: 'e1', name: 'Jan Klaassen', email: 'jan@techsolutions.nl', accessCode: '12345' },
  { id: 'ec2', employerId: 'e2', name: 'Els Visser', email: 'els@zorg.nl', accessCode: '12345' },
];

const INITIAL_SUPERVISORS: Supervisor[] = [
  { id: 'sup1', name: 'Mevr. K. Dijkstra', email: 'k.dijkstra@school.nl', phoneNumber: '030-1239988', accessCode: 'sup1234', assignedStudents: ['s1', 's3'] },
  { id: 'sup2', name: 'Dhr. P. de Jong', email: 'p.dejong@school.nl', phoneNumber: '030-5554433', accessCode: 'sup1234', assignedStudents: ['s2'] },
];

const INITIAL_INTERNSHIPS: Internship[] = [
  { id: 'i1', studentId: 's1', employerId: 'e1', supervisorId: 'sup1', startDate: '2024-02-01', endDate: '2024-06-30', scheduledDays: ['Ma', 'Di'] },
  { id: 'i2', studentId: 's2', employerId: 'e2', supervisorId: 'sup2', startDate: '2024-02-01', endDate: '2024-06-30', scheduledDays: ['Do', 'Vr'] },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1', internshipId: 'i1', date: '2024-05-20', status: AttendanceStatus.PRESENT },
  { id: 'a2', internshipId: 'i1', date: '2024-05-21', status: AttendanceStatus.SICK, notes: 'Griepje' },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'm1', internshipId: 'i1', senderRole: 'SCHOOL', text: 'Hoi Jan, hoe gaat het met Lucas?', timestamp: Date.now() - 86400000, read: true },
];

// --- 3. SERVICES (GEMINI) ---

const getAiClient = () => {
  const apiKey = process.env.REACT_APP_API_KEY || process.env.API_KEY; 
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const generateInternshipReport = async (student: Student, employer: Employer, attendance: AttendanceRecord[]) => {
  const ai = getAiClient();
  if (!ai) return "AI configuratie ontbreekt (API Key).";
  
  const prompt = `Schrijf een voortgangsrapportage voor leerling ${student.name} bij ${employer.companyName}. Totaal dagen: ${attendance.length}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "Geen rapport.";
  } catch (e) { return "Fout bij genereren."; }
};

const generateAbsenceEmail = async (student: Student, lastRecord: AttendanceRecord) => {
  const ai = getAiClient();
  if (!ai) return "AI configuratie ontbreekt.";
  const prompt = `Schrijf een mail aan ${student.name} over afwezigheid op ${lastRecord.date} (${lastRecord.status}).`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "Geen email.";
  } catch (e) { return "Fout bij genereren."; }
};

// --- 4. CONTEXT & STATE ---

interface AppContextType {
  students: Student[];
  employers: Employer[];
  employerContacts: EmployerContact[];
  supervisors: Supervisor[];
  internships: Internship[];
  attendance: AttendanceRecord[];
  messages: ChatMessage[];
  
  addStudent: (s: Student) => void;
  removeStudent: (id: string) => void; // NIEUW
  
  addEmployer: (e: Employer) => void;
  removeEmployer: (id: string) => void; // NIEUW
  
  addSupervisor: (s: Supervisor) => void;
  removeSupervisor: (id: string) => void; // NIEUW
  
  addInternship: (i: Internship) => void;
  removeInternship: (id: string) => void; // NIEUW
  
  addAttendanceRecord: (r: AttendanceRecord) => void;
  sendMessage: (id: string, txt: string, role: 'EMPLOYER' | 'SCHOOL') => void;
  
  getInternshipByEmployer: (eid: string) => Internship[];
  getInternshipStudent: (id: string) => Student | undefined;
  getInternshipSupervisor: (id: string) => Supervisor | undefined;
  getAttendanceForInternship: (id: string) => AttendanceRecord[];
  getMessagesForInternship: (id: string) => ChatMessage[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loadSafe = <T,>(key: string, initial: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch { return initial; }
  };

  const [students, setStudents] = useState<Student[]>(() => loadSafe('sc_students', INITIAL_STUDENTS));
  const [employers, setEmployers] = useState<Employer[]>(() => loadSafe('sc_employers', INITIAL_EMPLOYERS));
  const [employerContacts, setEmployerContacts] = useState<EmployerContact[]>(() => loadSafe('sc_employer_contacts', INITIAL_EMPLOYER_CONTACTS));
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => loadSafe('sc_supervisors', INITIAL_SUPERVISORS));
  const [internships, setInternships] = useState<Internship[]>(() => loadSafe('sc_internships', INITIAL_INTERNSHIPS));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => loadSafe('sc_attendance', INITIAL_ATTENDANCE));
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadSafe('sc_messages', INITIAL_MESSAGES));

  useEffect(() => { localStorage.setItem('sc_students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('sc_employers', JSON.stringify(employers)); }, [employers]);
  useEffect(() => { localStorage.setItem('sc_supervisors', JSON.stringify(supervisors)); }, [supervisors]);
  useEffect(() => { localStorage.setItem('sc_internships', JSON.stringify(internships)); }, [internships]);
  useEffect(() => { localStorage.setItem('sc_attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('sc_messages', JSON.stringify(messages)); }, [messages]);

  const addStudent = (s: Student) => setStudents(p => [...p, s]);
  const removeStudent = (id: string) => setStudents(p => p.filter(s => s.id !== id));

  const addEmployer = (e: Employer) => setEmployers(p => [...p, e]);
  const removeEmployer = (id: string) => setEmployers(p => p.filter(e => e.id !== id));

  const addSupervisor = (s: Supervisor) => setSupervisors(p => [...p, s]);
  const removeSupervisor = (id: string) => setSupervisors(p => p.filter(s => s.id !== id));

  const addInternship = (i: Internship) => setInternships(p => [...p, i]);
  const removeInternship = (id: string) => setInternships(p => p.filter(i => i.id !== id));
  
  const addAttendanceRecord = (r: AttendanceRecord) => {
    setAttendance(p => {
      const exists = p.findIndex(x => x.internshipId === r.internshipId && x.date === r.date);
      if (exists >= 0) { const n = [...p]; n[exists] = r; return n; }
      return [...p, r];
    });
  };

  const sendMessage = (iid: string, txt: string, role: 'EMPLOYER' | 'SCHOOL') => {
    setMessages(p => [...p, { id: `msg_${Date.now()}`, internshipId: iid, text: txt, senderRole: role, timestamp: Date.now(), read: false }]);
  };

  return (
    <AppContext.Provider value={{
      students, employers, employerContacts, supervisors, internships, attendance, messages,
      addStudent, removeStudent,
      addEmployer, removeEmployer,
      addSupervisor, removeSupervisor,
      addInternship, removeInternship,
      addAttendanceRecord, sendMessage,
      getInternshipByEmployer: (eid) => internships.filter(i => i.employerId === eid),
      getInternshipStudent: (id) => { const i = internships.find(x => x.id === id); return i ? students.find(s => s.id === i.studentId) : undefined; },
      getInternshipSupervisor: (id) => { const i = internships.find(x => x.id === id); return i ? supervisors.find(s => s.id === i.supervisorId) : undefined; },
      getAttendanceForInternship: (id) => attendance.filter(a => a.internshipId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      getMessagesForInternship: (id) => messages.filter(m => m.internshipId === id).sort((a,b) => a.timestamp - b.timestamp)
    }}>
      {children}
    </AppContext.Provider>
  );
};

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};

// --- 5. COMPONENTS ---

const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className = "h-12", showText = true }) => {
  const [err, setErr] = useState(false);
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {!err ? (
        <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" onError={() => setErr(true)} />
      ) : (
        <div className="h-full aspect-square bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
          <GraduationCap className="text-[#009FE3] w-3/4 h-3/4" />
        </div>
      )}
      {showText && err && (
        <div className="flex flex-col justify-center h-full -ml-1">
          <span className="text-[#78BE20] text-[0.55em]">Groene Hart</span>
          <span className="text-[#009FE3] font-bold text-[1.2em]">Pro College</span>
        </div>
      )}
    </div>
  );
};

// --- ADMIN COMPONENT ---
const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { 
    students, employers, supervisors, internships, messages, 
    addStudent, removeStudent,
    addEmployer, removeEmployer,
    addSupervisor, removeSupervisor,
    addInternship, removeInternship,
    sendMessage 
  } = useApp();
  const [tab, setTab] = useState<'students' | 'employers' | 'supervisors' | 'internships' | 'messages'>('students');
  
  // Forms
  const [ns, setNs] = useState({ name: '', email: '', studentNumber: '' });
  const [ne, setNe] = useState({ companyName: '', contactPerson: '', email: '', phoneNumber: '', accessCode: '' });
  const [nSup, setNSup] = useState({ name: '', email: '', phoneNumber: '' });
  const [ni, setNi] = useState<any>({ studentId: '', employerId: '', supervisorId: '', startDate: '', endDate: '', scheduledDays: [] });
  const [selectedInternshipIdForChat, setSelectedInternshipIdForChat] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleDelete = (type: 'student'|'employer'|'supervisor'|'internship', id: string, name: string) => {
    if(window.confirm(`Weet u zeker dat u "${name}" wilt verwijderen?`)) {
      if(type === 'student') removeStudent(id);
      if(type === 'employer') removeEmployer(id);
      if(type === 'supervisor') removeSupervisor(id);
      if(type === 'internship') removeInternship(id);
    }
  }

  // Group messages by internship for the Messages tab
  const internshipsWithMessages = internships.filter(i => messages.some(m => m.internshipId === i.id));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedInternshipIdForChat, messages]);

  const handleSendAdminMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedInternshipIdForChat || !adminReply.trim()) return;
    sendMessage(selectedInternshipIdForChat, adminReply, 'SCHOOL');
    setAdminReply('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-800">School CMS</h1></div>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="text-red-600 flex gap-2"><LogOut size={20}/> Uitloggen</button>
          <Logo className="h-10" />
        </div>
      </header>

      <div className="flex space-x-4 mb-6 border-b overflow-x-auto">
        {['students', 'employers', 'supervisors', 'internships', 'messages'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={`pb-3 px-4 font-medium capitalize ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Leerlingen</h2>
            {students.map(s => (
              <div key={s.id} className="p-3 border-b flex justify-between items-center hover:bg-slate-50">
                <span>{s.name} ({s.studentNumber})</span>
                <button onClick={() => handleDelete('student', s.id, s.name)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold mb-4">Nieuw</h3>
            <input className="w-full border p-2 mb-2 rounded" placeholder="Naam" value={ns.name} onChange={e => setNs({...ns, name: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Studentnr" value={ns.studentNumber} onChange={e => setNs({...ns, studentNumber: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Email" value={ns.email} onChange={e => setNs({...ns, email: e.target.value})} />
            <button onClick={() => { addStudent({...ns, id: `s${Date.now()}`}); setNs({name:'',email:'',studentNumber:''}); }} className="w-full bg-blue-600 text-white p-2 rounded">Toevoegen</button>
          </div>
        </div>
      )}

      {tab === 'employers' && (
        <div className="grid md:grid-cols-3 gap-8">
           <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Werkgevers</h2>
            {employers.map(e => (
              <div key={e.id} className="p-3 border-b flex justify-between items-center hover:bg-slate-50">
                <div className="flex-1">
                  <span className="font-bold">{e.companyName}</span>
                  <span className="font-mono bg-slate-100 text-xs p-1 ml-2 rounded">{e.accessCode}</span>
                </div>
                <button onClick={() => handleDelete('employer', e.id, e.companyName)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold mb-4">Nieuw</h3>
            <input className="w-full border p-2 mb-2 rounded" placeholder="Bedrijf" value={ne.companyName} onChange={e => setNe({...ne, companyName: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Contact" value={ne.contactPerson} onChange={e => setNe({...ne, contactPerson: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Email" value={ne.email} onChange={e => setNe({...ne, email: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Telefoon" value={ne.phoneNumber} onChange={e => setNe({...ne, phoneNumber: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Toegangscode" value={ne.accessCode} onChange={e => setNe({...ne, accessCode: e.target.value})} />
            <button onClick={() => { addEmployer({...ne, id: `e${Date.now()}`}); setNe({companyName:'',contactPerson:'',email:'',phoneNumber:'',accessCode:''}); }} className="w-full bg-blue-600 text-white p-2 rounded">Toevoegen</button>
          </div>
        </div>
      )}

      {tab === 'supervisors' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Begeleiders</h2>
            {supervisors.map(s => (
              <div key={s.id} className="p-3 border-b flex justify-between items-center hover:bg-slate-50">
                <span>{s.name}</span>
                <button onClick={() => handleDelete('supervisor', s.id, s.name)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold mb-4">Nieuw</h3>
            <input className="w-full border p-2 mb-2 rounded" placeholder="Naam" value={nSup.name} onChange={e => setNSup({...nSup, name: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Email" value={nSup.email} onChange={e => setNSup({...nSup, email: e.target.value})} />
            <input className="w-full border p-2 mb-2 rounded" placeholder="Telefoon" value={nSup.phoneNumber} onChange={e => setNSup({...nSup, phoneNumber: e.target.value})} />
            <button onClick={() => { addSupervisor({...nSup, id: `sup${Date.now()}`}); setNSup({name:'', email:'', phoneNumber:''}); }} className="w-full bg-blue-600 text-white p-2 rounded">Toevoegen</button>
          </div>
        </div>
      )}

      {tab === 'internships' && (
         <div className="grid md:grid-cols-3 gap-8">
           <div className="md:col-span-2">
             <h2 className="text-xl font-bold mb-4">Stages</h2>
             {internships.map(i => {
               const s = students.find(x => x.id === i.studentId);
               const e = employers.find(x => x.id === i.employerId);
               return (
                 <div key={i.id} className="p-3 border-b flex justify-between items-center hover:bg-slate-50">
                   <span>{s?.name} @ {e?.companyName}</span>
                   <button onClick={() => handleDelete('internship', i.id, `${s?.name} bij ${e?.companyName}`)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                 </div>
               )
             })}
           </div>
           <div className="bg-white p-6 rounded shadow">
             <h3 className="font-bold mb-4">Koppelen</h3>
             <select className="w-full border p-2 mb-2" value={ni.studentId} onChange={e => setNi({...ni, studentId: e.target.value})}>
               <option value="">Leerling...</option>
               {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
             <select className="w-full border p-2 mb-2" value={ni.employerId} onChange={e => setNi({...ni, employerId: e.target.value})}>
               <option value="">Werkgever...</option>
               {employers.map(e => <option key={e.id} value={e.id}>{e.companyName}</option>)}
             </select>
             <select className="w-full border p-2 mb-2" value={ni.supervisorId} onChange={e => setNi({...ni, supervisorId: e.target.value})}>
               <option value="">Begeleider...</option>
               {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
             <div className="flex gap-2 mb-2">
               <input type="date" className="w-full border p-2" value={ni.startDate} onChange={e => setNi({...ni, startDate: e.target.value})} />
               <input type="date" className="w-full border p-2" value={ni.endDate} onChange={e => setNi({...ni, endDate: e.target.value})} />
             </div>
             <div className="flex gap-1 mb-4">
               {['Ma','Di','Wo','Do','Vr'].map(d => (
                 <button key={d} onClick={() => setNi((p:any) => p.scheduledDays.includes(d) ? {...p, scheduledDays: p.scheduledDays.filter((x:string) => x!==d)} : {...p, scheduledDays: [...p.scheduledDays, d]})} className={`p-1 border text-xs ${ni.scheduledDays.includes(d) ? 'bg-blue-600 text-white' : ''}`}>{d}</button>
               ))}
             </div>
             <button onClick={() => { addInternship({...ni, id: `i${Date.now()}`}); }} className="w-full bg-blue-600 text-white p-2 rounded">Koppelen</button>
           </div>
         </div>
      )}

      {tab === 'messages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[600px]">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-semibold text-slate-700">Actieve Gesprekken</h3>
              </div>
              <div>
                 {internshipsWithMessages.length === 0 ? (
                    <p className="p-4 text-slate-400 text-sm">Nog geen berichten.</p>
                 ) : (
                   internshipsWithMessages.map(int => {
                     const s = students.find(x => x.id === int.studentId);
                     const e = employers.find(x => x.id === int.employerId);
                     const isSelected = selectedInternshipIdForChat === int.id;
                     
                     return (
                        <button 
                          key={int.id} 
                          onClick={() => setSelectedInternshipIdForChat(int.id)}
                          className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                        >
                           <p className="font-bold text-slate-800 text-sm">{s?.name}</p>
                           <p className="text-xs text-slate-500">{e?.companyName}</p>
                        </button>
                     )
                   })
                 )}
              </div>
           </div>

           <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              {!selectedInternshipIdForChat ? (
                 <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
                    <MessageCircle size={48} className="opacity-20" />
                    <p>Selecteer een gesprek om te lezen</p>
                 </div>
              ) : (
                 <>
                   <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700">
                        Chat over {students.find(s => s.id === internships.find(i => i.id === selectedInternshipIdForChat)?.studentId)?.name}
                      </h3>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
                      {messages.filter(m => m.internshipId === selectedInternshipIdForChat).sort((a,b) => a.timestamp - b.timestamp).map(msg => {
                         const isSchool = msg.senderRole === 'SCHOOL';
                         return (
                           <div key={msg.id} className={`flex ${isSchool ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isSchool ? 'bg-[#009FE3] text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'}`}>
                                 <p>{msg.text}</p>
                                 <span className={`text-[10px] block mt-1 ${isSchool ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                 </span>
                              </div>
                           </div>
                         );
                      })}
                      <div ref={chatEndRef} />
                   </div>
                   <div className="p-4 bg-white border-t border-slate-100">
                      <form onSubmit={handleSendAdminMessage} className="flex gap-2">
                         <input 
                            value={adminReply}
                            onChange={(e) => setAdminReply(e.target.value)}
                            placeholder="Typ een reactie..."
                            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                         />
                         <button type="submit" disabled={!adminReply.trim()} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                            <Send size={20} />
                         </button>
                      </form>
                   </div>
                 </>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

// --- EMPLOYER COMPONENT ---

const EmployerPortal: React.FC<{ onLogout: () => void, loggedInEmployerId: string | null }> = ({ onLogout, loggedInEmployerId }) => {
  const { employers, employerContacts, internships, students, getInternshipStudent, getInternshipSupervisor, addAttendanceRecord, getAttendanceForInternship, getMessagesForInternship, sendMessage } = useApp();
  
  // loggedInEmployerId is actually the contact ID now
  const contact = employerContacts.find(c => c.id === loggedInEmployerId);
  const employer = contact ? employers.find(e => e.id === contact.employerId) : null;
  
  // Get internships assigned to this contact
  const assignedInternships = contact?.assignedInternships || [];
  const contactInternships = internships.filter(i => assignedInternships.includes(i.id));
  
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(contactInternships[0]?.id || null);
  const [view, setView] = useState<'schedule' | 'history' | 'chat'>('schedule');
  const [weekOffset, setWeekOffset] = useState(0); 
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateMinutesInput, setLateMinutesInput] = useState('15');
  const [dateForLateEntry, setDateForLateEntry] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const myInternships = useMemo(() => getInternshipByEmployer(selectedEmployerId), [selectedEmployerId, getInternshipByEmployer]);
  const currentEmployer = employers.find(e => e.id === selectedEmployerId);
  const selectedInternship = myInternships.find(i => i.id === selectedInternshipId);
  const currentStudent = selectedInternshipId ? getInternshipStudent(selectedInternshipId) : null;
  const currentSupervisor = selectedInternshipId ? getInternshipSupervisor(selectedInternshipId) : null;
  const attendanceHistory = selectedInternshipId ? getAttendanceForInternship(selectedInternshipId) : [];
  const messages = selectedInternshipId ? getMessagesForInternship(selectedInternshipId) : [];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, view]);

  const getWeekDays = () => {
    const curr = new Date();
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(curr.setDate(diff));
    monday.setDate(monday.getDate() + (weekOffset * 7));
    const days = [];
    for (let i = 0; i < 5; i++) { 
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const currentWeekDays = getWeekDays();

  const getDayType = (date: Date): DayOfWeek => {
    const map: Record<number, DayOfWeek> = { 1: 'Ma', 2: 'Di', 3: 'Wo', 4: 'Do', 5: 'Vr' };
    return map[date.getDay()];
  };

  const isScheduledDay = (date: Date) => {
    if (!selectedInternship?.scheduledDays) return false;
    return selectedInternship.scheduledDays.includes(getDayType(date));
  };

  const getStatusForDate = (dateStr: string) => {
    return attendanceHistory.find(a => a.date === dateStr);
  };

  const submitAttendance = (date: Date, status: AttendanceStatus, minutesLate: number = 0) => {
    if (!selectedInternshipId) return;
    const dateStr = date.toISOString().split('T')[0];
    const record: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random()}`,
      internshipId: selectedInternshipId,
      date: dateStr,
      status,
      minutesLate: status === AttendanceStatus.LATE ? minutesLate : undefined
    };
    addAttendanceRecord(record);
    if (status === AttendanceStatus.SICK) {
        sendMessage(selectedInternshipId, `⚠️ MELDING: ${currentStudent?.name} is ziek gemeld op ${date.toLocaleDateString('nl-NL')}.`, 'EMPLOYER');
    } else if (status === AttendanceStatus.ABSENT) {
        sendMessage(selectedInternshipId, `⚠️ MELDING: ${currentStudent?.name} is afwezig gemeld op ${date.toLocaleDateString('nl-NL')}.`, 'EMPLOYER');
    } else if (status === AttendanceStatus.LATE) {
        sendMessage(selectedInternshipId, `⚠️ MELDING: ${currentStudent?.name} is ${minutesLate} minuten te laat op ${date.toLocaleDateString('nl-NL')}.`, 'EMPLOYER');
    }
  };

  const handleAttendanceClick = (date: Date, status: AttendanceStatus) => {
    if (status === AttendanceStatus.LATE) {
      setDateForLateEntry(date);
      setLateMinutesInput('15');
      setIsLateModalOpen(true);
      return; 
    }
    submitAttendance(date, status);
  };

  const confirmLateAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateForLateEntry) {
      const minutes = parseInt(lateMinutesInput) || 0;
      submitAttendance(dateForLateEntry, AttendanceStatus.LATE, minutes);
      setIsLateModalOpen(false);
      setDateForLateEntry(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!currentStudent || !selectedInternship) return;
    setAiLoading(true);
    const employer = employers.find(e => e.id === selectedEmployerId)!;
    const report = await generateInternshipReport(currentStudent, employer, attendanceHistory);
    setAiReport(report);
    setAiLoading(false);
  };

  const handleDraftEmail = async () => {
     if (!currentStudent || !attendanceHistory.length) return;
     setAiLoading(true);
     const last = attendanceHistory[0];
     const emailDraft = await generateAbsenceEmail(currentStudent, last);
     setAiReport(emailDraft);
     setAiLoading(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedInternshipId) return;
    sendMessage(selectedInternshipId, newMessage, 'EMPLOYER');
    setNewMessage('');
  };

  if (!selectedInternshipId) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white px-6 pt-12 pb-6 rounded-b-[32px] shadow-sm z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Goedemorgen,</h1>
              <h2 className="text-lg font-medium text-slate-500">{currentEmployer?.contactPerson}</h2>
              <p className="text-xs text-slate-400 mt-1">{currentEmployer?.companyName}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Logo className="h-10" showText={false} />
              <button onClick={onLogout} className="text-xs font-medium text-slate-400 flex items-center gap-1 hover:text-red-500 transition-colors">
                <LogOut size={14} /> Uitloggen
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-slate-400" />
            </div>
            <input disabled placeholder="Zoek stagiair..." className="w-full bg-slate-100 text-sm rounded-xl py-3 pl-10 pr-4 border-none text-slate-600 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Mijn Stagiairs</h2>
          <div className="space-y-3">
            {myInternships.length === 0 ? (
               <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">Geen stagiairs gekoppeld.</div>
            ) : (
              myInternships.map(internship => {
                const s = getInternshipStudent(internship.id);
                if (!s) return null;
                return (
                  <button 
                    key={internship.id}
                    onClick={() => setSelectedInternshipId(internship.id)}
                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-95 transition-transform duration-200"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg shadow-inner">{s.name.charAt(0)}</div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{s.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{internship.startDate} - {internship.endDate}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><ChevronLeft className="rotate-180" size={18} /></div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-[#009FE3] text-white px-6 pt-12 pb-16 rounded-b-[40px] shadow-lg relative z-0">
         <button onClick={() => setSelectedInternshipId(null)} className="absolute top-12 left-4 p-2 text-white/80 hover:text-white transition"><ChevronLeft size={28} /></button>
         <div className="text-center">
            <h2 className="text-2xl font-bold">{currentStudent?.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1 opacity-90"><CalendarDays size={14} /><p className="text-blue-100 text-sm">{selectedInternship?.scheduledDays?.length ? selectedInternship.scheduledDays.join(', ') : 'Geen dagen ingesteld'}</p></div>
         </div>
         {currentSupervisor && view !== 'chat' && (
           <div className="absolute -bottom-8 left-6 right-6 bg-white rounded-xl shadow-md p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#009FE3]"><User size={18} /></div>
                 <div><p className="text-[10px] font-bold text-slate-400 uppercase">Begeleider</p><p className="text-sm font-bold text-slate-800 leading-none">{currentSupervisor.name}</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setView('chat')} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition"><MessageCircle size={18} /></button>
                <a href={`tel:${currentSupervisor.phoneNumber}`} className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 hover:bg-green-200 transition"><Phone size={18} /></a>
              </div>
           </div>
         )}
      </div>

      <div className={`flex-1 overflow-y-auto px-6 no-scrollbar ${view === 'chat' ? 'pt-4 pb-24' : 'pt-12 pb-24'}`}>
        {view === 'schedule' && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-xl shadow-sm">
              <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 text-slate-400 hover:text-[#009FE3] transition"><ChevronLeft size={20} /></button>
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Week {currentWeekDays[0].toLocaleDateString('nl-NL', { week: 'numeric' })}</p>
                <p className="text-sm font-semibold text-slate-700">{currentWeekDays[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} - {currentWeekDays[4].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</p>
              </div>
              <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 text-slate-400 hover:text-[#009FE3] transition"><ChevronRight size={20} /></button>
            </div>
            <div className="space-y-4">
              {currentWeekDays.map(date => {
                const isScheduled = isScheduledDay(date);
                if (!isScheduled) return null;
                const dateStr = date.toISOString().split('T')[0];
                const record = getStatusForDate(dateStr);
                const status = record?.status;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                return (
                  <div key={dateStr} className={`bg-white rounded-2xl p-4 shadow-sm border ${isToday ? 'border-[#009FE3] ring-1 ring-[#009FE3]/20' : 'border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div><p className={`text-sm font-bold capitalize ${isToday ? 'text-[#009FE3]' : 'text-slate-800'}`}>{date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
                      {status && (<span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : ''} ${status === AttendanceStatus.SICK ? 'bg-orange-100 text-orange-700' : ''} ${status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : ''} ${status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : ''}`}>{status}{status === AttendanceStatus.LATE && record?.minutesLate ? ` (${record.minutesLate}m)` : ''}</span>)}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <button onClick={() => handleAttendanceClick(date, AttendanceStatus.PRESENT)} className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.PRESENT ? 'bg-green-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-500'}`}><CheckCircle size={20} className="mb-1" /><span className="text-[10px] font-bold">Aanw.</span></button>
                      <button onClick={() => handleAttendanceClick(date, AttendanceStatus.SICK)} className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.SICK ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-500'}`}><AlertCircle size={20} className="mb-1" /><span className="text-[10px] font-bold">Ziek</span></button>
                       <button onClick={() => handleAttendanceClick(date, AttendanceStatus.LATE)} className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-yellow-50 hover:text-yellow-500'}`}><Clock size={20} className="mb-1" /><span className="text-[10px] font-bold">Te laat</span></button>
                      <button onClick={() => handleAttendanceClick(date, AttendanceStatus.ABSENT)} className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}><XCircle size={20} className="mb-1" /><span className="text-[10px] font-bold">Afw.</span></button>
                    </div>
                  </div>
                );
              })}
              {currentWeekDays.every(d => !isScheduledDay(d)) && (<div className="text-center p-8 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">Geen stagedagen in deze week.</div>)}
            </div>
          </div>
        )}
        {view === 'history' && (
          <div className="animate-slide-up">
             <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={handleGenerateReport} disabled={aiLoading} className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition">{aiLoading ? <Sparkles className="animate-spin" size={16} /> : <Sparkles size={16} />} Genereer Rapport</button>
                <button onClick={handleDraftEmail} disabled={aiLoading} className="flex-shrink-0 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition"><Mail size={16} /> Email Concept</button>
             </div>
            {aiReport && (
              <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm mb-6 animate-slide-up">
                  <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-indigo-900 flex items-center gap-2"><Sparkles size={14} className="text-indigo-500"/> AI Assistent</h4><button onClick={() => setAiReport(null)} className="text-slate-400"><XCircle size={18}/></button></div>
                  <p className="text-slate-600 text-sm leading-relaxed">{aiReport}</p>
              </div>
            )}
             <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                {attendanceHistory.length === 0 ? (<div className="p-8 text-center text-slate-400">Geen geschiedenis</div>) : (
                   <div className="divide-y divide-slate-50">
                      {attendanceHistory.map(record => (
                        <div key={record.id} className="p-4 flex items-center justify-between">
                           <div><p className="font-bold text-slate-700">{new Date(record.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</p><p className="text-xs text-slate-400 capitalize">{new Date(record.date).toLocaleDateString('nl-NL', { weekday: 'long' })}</p></div>
                           <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${record.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : ''} ${record.status === AttendanceStatus.SICK ? 'bg-orange-100 text-orange-700' : ''} ${record.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : ''} ${record.status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : ''}`}>{record.status}{record.status === AttendanceStatus.LATE && record.minutesLate ? ` (${record.minutesLate}m)` : ''}</span>
                        </div>
                      ))}
                   </div>
                )}
             </div>
          </div>
        )}
        {view === 'chat' && (
           <div className="flex flex-col h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col mb-20">
                 <div className="bg-slate-50 p-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#009FE3]"><User size={20} /></div>
                    <div><p className="text-xs text-slate-400 font-bold uppercase">Begeleider</p><p className="font-bold text-slate-800 text-sm">{currentSupervisor?.name || 'School'}</p></div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f4f8]">
                    {messages.length === 0 && (<div className="text-center text-slate-400 text-xs mt-4">Begin een gesprek met de begeleider.</div>)}
                    {messages.map(msg => {
                       const isMe = msg.senderRole === 'EMPLOYER';
                       return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-[#009FE3] text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'}`}><p>{msg.text}</p><span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                          </div>
                       );
                    })}
                    <div ref={chatEndRef} />
                 </div>
                 <div className="p-3 bg-white border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                       <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Typ een bericht..." className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#009FE3]" />
                       <button type="submit" disabled={!newMessage.trim()} className="bg-[#009FE3] text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors"><Send size={18} /></button>
                    </form>
                 </div>
              </div>
           </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 pb-safe-bottom z-20">
        <div className="flex justify-around items-center p-2 safe-area-bottom">
           <button onClick={() => setView('schedule')} className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-colors ${view === 'schedule' ? 'text-[#009FE3]' : 'text-slate-400 hover:text-slate-600'}`}><Home size={24} strokeWidth={view === 'schedule' ? 2.5 : 2} /><span className="text-[10px] font-bold mt-1">Rooster</span></button>
           <div className="w-px h-8 bg-slate-100"></div>
           <button onClick={() => setView('history')} className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-colors ${view === 'history' ? 'text-[#009FE3]' : 'text-slate-400 hover:text-slate-600'}`}><HistoryIcon size={24} strokeWidth={view === 'history' ? 2.5 : 2} /><span className="text-[10px] font-bold mt-1">Historie</span></button>
           <div className="w-px h-8 bg-slate-100"></div>
           <button onClick={() => setView('chat')} className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-colors ${view === 'chat' ? 'text-[#009FE3]' : 'text-slate-400 hover:text-slate-600'}`}><MessageCircle size={24} strokeWidth={view === 'chat' ? 2.5 : 2} /><span className="text-[10px] font-bold mt-1">Chat</span></button>
        </div>
      </div>

      {isLateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-scale-in">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 text-yellow-600"><Clock size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800">Te laat melding</h3>
              <p className="text-sm text-slate-500">Hoeveel minuten is de stagiair te laat?</p>
            </div>
            <form onSubmit={confirmLateAttendance}>
              <div className="flex items-center justify-center mb-6">
                <input type="number" min="1" max="480" autoFocus required value={lateMinutesInput} onChange={(e) => setLateMinutesInput(e.target.value)} className="text-center text-3xl font-bold w-24 border-b-2 border-[#009FE3] focus:outline-none text-slate-800 pb-1" />
                <span className="text-slate-400 ml-2 font-medium">minuten</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsLateModalOpen(false)} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition">Annuleren</button>
                <button type="submit" className="w-full py-3 rounded-xl bg-[#009FE3] text-white font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-200">Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUPERVISOR DASHBOARD ---
const SupervisorDashboard: React.FC<{ onLogout: () => void, loggedInSupervisorId: string | null }> = ({ onLogout, loggedInSupervisorId }) => {
  const { supervisors, students, internships, getAttendanceForInternship } = useApp();
  const supervisor = supervisors.find(s => s.id === loggedInSupervisorId);
  const assignedStudents = students.filter(s => supervisor?.assignedStudents?.includes(s.id));

  if (!supervisor) return <div>Supervisor niet gevonden</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Stagebegeleiding</h1>
            <p className="text-slate-600">Welkom, {supervisor.name}</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
            <LogOut size={18} /> Uitloggen
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedStudents.map(student => {
            const internship = internships.find(i => i.studentId === student.id);
            const attendance = internship ? getAttendanceForInternship(internship.id) : [];
            const todayAttendance = attendance.find(a => a.date === new Date().toISOString().split('T')[0]);

            return (
              <div key={student.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                <h3 className="font-bold text-lg text-slate-800">{student.name}</h3>
                <p className="text-slate-600 text-sm">{student.email}</p>
                <p className="text-slate-600 text-sm">Studentnummer: {student.studentNumber}</p>
                
                {todayAttendance ? (
                  <div className="mt-4 p-3 rounded-lg bg-slate-50">
                    <p className="text-sm text-slate-600">Vandaag:</p>
                    <p className={`font-semibold ${
                      todayAttendance.status === 'Aanwezig' ? 'text-green-600' :
                      todayAttendance.status === 'Afwezig' ? 'text-red-600' :
                      todayAttendance.status === 'Ziek' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      {todayAttendance.status}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-lg bg-slate-50">
                    <p className="text-sm text-slate-600">Geen aanwezigheid geregistreerd vandaag</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {assignedStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">Je hebt nog geen leerlingen toegewezen gekregen.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const MainApp: React.FC = () => {
  const { employers, employerContacts, supervisors } = useApp();
  const [role, setRole] = useState<Role | null>(null);
  const [login, setLogin] = useState({ open: false, role: null as Role|null, email: '', pass: '', empId: '', error: '' });
  const [loggedInEmp, setLoggedInEmp] = useState<string|null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('stageconnect_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.role === Role.ADMIN) {
          setRole(Role.ADMIN);
        } else if (session.role === Role.EMPLOYER && session.empId) {
          setRole(Role.EMPLOYER);
          setLoggedInEmp(session.empId);
        } else if (session.role === Role.SUPERVISOR && session.supId) {
          setRole(Role.SUPERVISOR);
          setLoggedInEmp(session.supId);
        }
      } catch (e) {
        console.error('Error restoring session', e);
      }
    }
  }, []);

  const doLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(login.role === Role.ADMIN && login.pass === 'admin') { 
      setRole(Role.ADMIN); 
      localStorage.setItem('stageconnect_session', JSON.stringify({ role: Role.ADMIN }));
      setLogin({open:false, role:null, email:'', pass:'', empId:'', error:''}); 
    }
    else if(login.role === Role.EMPLOYER) {
       const contact = employerContacts.find(x => x.email === login.email);
       if(contact && contact.accessCode === login.pass) { 
         setLoggedInEmp(contact.id); 
         setRole(Role.EMPLOYER); 
         localStorage.setItem('stageconnect_session', JSON.stringify({ role: Role.EMPLOYER, empId: contact.id }));
         setLogin({open:false, role:null, email:'', pass:'', empId:'', error:''}); 
       }
       else setLogin({...login, error: 'Fout'});
    }
    else if(login.role === Role.SUPERVISOR) {
       const sup = supervisors.find(x => x.email === login.email);
       if(sup && sup.accessCode === login.pass) { 
         setLoggedInEmp(sup.id); 
         setRole(Role.SUPERVISOR); 
         localStorage.setItem('stageconnect_session', JSON.stringify({ role: Role.SUPERVISOR, supId: sup.id }));
         setLogin({open:false, role:null, email:'', pass:'', empId:'', error:''}); 
       }
       else setLogin({...login, error: 'Fout'});
    }
    else setLogin({...login, error: 'Fout'});
  };

  const handleLogout = () => {
    setRole(null);
    setLoggedInEmp(null);
    localStorage.removeItem('stageconnect_session');
  };

  if(role === Role.ADMIN) return <AdminDashboard onLogout={handleLogout} />;
  if(role === Role.EMPLOYER) return <EmployerPortal onLogout={handleLogout} loggedInEmployerId={loggedInEmp} />;
  if(role === Role.SUPERVISOR) return <SupervisorDashboard onLogout={handleLogout} loggedInSupervisorId={loggedInEmp} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-[#009FE3] rounded-b-[40px] z-0"></div>
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white p-4 rounded-2xl shadow-xl w-max mx-auto mb-8"><Logo showText={false} className="h-16" /></div>
        <div className="text-center text-white mb-8"><h1 className="text-3xl font-bold">StageConnect</h1><p>Groene Hart Pro College</p></div>
        
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
           <h2 className="text-center font-bold text-slate-800">Inloggen</h2>
           <button onClick={() => setLogin({open:true, role:Role.EMPLOYER, email:'', pass:'', empId:'', error:''})} className="w-full p-4 border rounded-xl flex items-center gap-4 hover:bg-slate-50">
             <div className="bg-green-100 text-green-600 p-3 rounded-xl"><Briefcase/></div>
             <div className="text-left flex-1"><h3 className="font-bold">Werkgever</h3></div>
             <ChevronRight className="text-slate-300"/>
           </button>
           <button onClick={() => setLogin({open:true, role:Role.SUPERVISOR, email:'', pass:'', empId:'', error:''})} className="w-full p-4 border rounded-xl flex items-center gap-4 hover:bg-slate-50">
             <div className="bg-purple-100 text-purple-600 p-3 rounded-xl"><Users/></div>
             <div className="text-left flex-1"><h3 className="font-bold">Stagebegeleider</h3></div>
             <ChevronRight className="text-slate-300"/>
           </button>
           <button onClick={() => setLogin({open:true, role:Role.ADMIN, pass:'', empId:'', error:''})} className="w-full p-4 border rounded-xl flex items-center gap-4 hover:bg-slate-50">
             <div className="bg-blue-100 text-blue-600 p-3 rounded-xl"><ShieldCheck/></div>
             <div className="text-left flex-1"><h3 className="font-bold">School Admin</h3></div>
             <ChevronRight className="text-slate-300"/>
           </button>
        </div>
      </div>

      {login.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
              <div className="flex justify-between mb-4"><h3 className="font-bold">Inloggen {login.role}</h3><button onClick={() => setLogin({...login, open:false})}><X/></button></div>
              <form onSubmit={doLogin} className="space-y-4">
                 {login.role === Role.EMPLOYER && (
                    <>
                       <input type="email" placeholder="Email" className="w-full border p-3 rounded-xl" value={login.email} onChange={e => setLogin({...login, email: e.target.value})} />
                       <input type="password" placeholder="Wachtwoord" className="w-full border p-3 rounded-xl" value={login.pass} onChange={e => setLogin({...login, pass: e.target.value})} />
                    </>
                 )}
                 {login.role === Role.SUPERVISOR && (
                    <>
                       <input type="email" placeholder="Email" className="w-full border p-3 rounded-xl" value={login.email} onChange={e => setLogin({...login, email: e.target.value})} />
                       <input type="password" placeholder="Wachtwoord" className="w-full border p-3 rounded-xl" value={login.pass} onChange={e => setLogin({...login, pass: e.target.value})} />
                    </>
                 )}
                 {login.role === Role.ADMIN && (
                    <input type="password" placeholder="Wachtwoord (admin)" className="w-full border p-3 rounded-xl" value={login.pass} onChange={e => setLogin({...login, pass: e.target.value})} />
                 )}
                 {login.error && <p className="text-red-500 text-sm">{login.error}</p>}
                 <button type="submit" className="w-full bg-[#009FE3] text-white p-3 rounded-xl font-bold">Inloggen</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><AppProvider><MainApp /></AppProvider></React.StrictMode>);
    
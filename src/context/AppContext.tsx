
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, Employer, Internship, AttendanceRecord, Supervisor, ChatMessage } from '../types';
import { INITIAL_STUDENTS, INITIAL_EMPLOYERS, INITIAL_INTERNSHIPS, INITIAL_ATTENDANCE, INITIAL_SUPERVISORS, INITIAL_MESSAGES } from '../constants';

interface AppContextType {
  students: Student[];
  employers: Employer[];
  supervisors: Supervisor[];
  internships: Internship[];
  attendance: AttendanceRecord[];
  messages: ChatMessage[];
  addStudent: (student: Student) => void;
  addEmployer: (employer: Employer) => void;
  addSupervisor: (supervisor: Supervisor) => void;
  addInternship: (internship: Internship) => void;
  addAttendanceRecord: (record: AttendanceRecord) => void;
  sendMessage: (internshipId: string, text: string, senderRole: 'EMPLOYER' | 'SCHOOL') => void;
  getInternshipByEmployer: (employerId: string) => Internship[];
  getInternshipStudent: (internshipId: string) => Student | undefined;
  getInternshipSupervisor: (internshipId: string) => Supervisor | undefined;
  getAttendanceForInternship: (internshipId: string) => AttendanceRecord[];
  getMessagesForInternship: (internshipId: string) => ChatMessage[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  // Helper functie om veilig data te laden. Als het mislukt, pakken we de startdata.
  const loadSafe = <T,>(key: string, initial: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch (e) {
      console.error(`Fout bij laden van ${key}, reset naar standaard.`, e);
      return initial;
    }
  };

  // Initialize state safely
  const [students, setStudents] = useState<Student[]>(() => loadSafe('sc_students', INITIAL_STUDENTS));
  const [employers, setEmployers] = useState<Employer[]>(() => loadSafe('sc_employers', INITIAL_EMPLOYERS));
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => loadSafe('sc_supervisors', INITIAL_SUPERVISORS));
  const [internships, setInternships] = useState<Internship[]>(() => loadSafe('sc_internships', INITIAL_INTERNSHIPS));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => loadSafe('sc_attendance', INITIAL_ATTENDANCE));
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadSafe('sc_messages', INITIAL_MESSAGES));

  // Persist to localStorage whenever state changes
  useEffect(() => { localStorage.setItem('sc_students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('sc_employers', JSON.stringify(employers)); }, [employers]);
  useEffect(() => { localStorage.setItem('sc_supervisors', JSON.stringify(supervisors)); }, [supervisors]);
  useEffect(() => { localStorage.setItem('sc_internships', JSON.stringify(internships)); }, [internships]);
  useEffect(() => { localStorage.setItem('sc_attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('sc_messages', JSON.stringify(messages)); }, [messages]);

  const addStudent = (student: Student) => setStudents(prev => [...prev, student]);
  const addEmployer = (employer: Employer) => setEmployers(prev => [...prev, employer]);
  const addSupervisor = (supervisor: Supervisor) => setSupervisors(prev => [...prev, supervisor]);
  const addInternship = (internship: Internship) => setInternships(prev => [...prev, internship]);
  
  const addAttendanceRecord = (record: AttendanceRecord) => {
    setAttendance(prev => {
      const exists = prev.findIndex(r => r.internshipId === record.internshipId && r.date === record.date);
      if (exists >= 0) {
        const newArr = [...prev];
        newArr[exists] = record;
        return newArr;
      }
      return [...prev, record];
    });
  };

  const sendMessage = (internshipId: string, text: string, senderRole: 'EMPLOYER' | 'SCHOOL') => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      internshipId,
      text,
      senderRole,
      timestamp: Date.now(),
      read: false
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const getInternshipByEmployer = (employerId: string) => {
    return internships.filter(i => i.employerId === employerId);
  };

  const getInternshipStudent = (internshipId: string) => {
    const internship = internships.find(i => i.id === internshipId);
    return internship ? students.find(s => s.id === internship.studentId) : undefined;
  };

  const getInternshipSupervisor = (internshipId: string) => {
    const internship = internships.find(i => i.id === internshipId);
    return internship ? supervisors.find(s => s.id === internship.supervisorId) : undefined;
  };

  const getAttendanceForInternship = (internshipId: string) => {
    return attendance.filter(a => a.internshipId === internshipId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getMessagesForInternship = (internshipId: string) => {
    return messages.filter(m => m.internshipId === internshipId).sort((a, b) => a.timestamp - b.timestamp);
  };

  return (
    <AppContext.Provider value={{
      students,
      employers,
      supervisors,
      internships,
      attendance,
      messages,
      addStudent,
      addEmployer,
      addSupervisor,
      addInternship,
      addAttendanceRecord,
      sendMessage,
      getInternshipByEmployer,
      getInternshipStudent,
      getInternshipSupervisor,
      getAttendanceForInternship,
      getMessagesForInternship
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};

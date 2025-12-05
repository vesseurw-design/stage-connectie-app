
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus, Internship, DayOfWeek, AttendanceRecord } from '../../types';
import { generateInternshipReport, generateAbsenceEmail } from '../../services/geminiService';
import { CheckCircle, XCircle, AlertCircle, Clock, Phone, User, Sparkles, Mail, Home, History as HistoryIcon, ChevronLeft, LogOut, CalendarDays, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { Logo } from '../Logo';

declare global {
    interface Window {
        syncAttendance?: (internshipId: string, status: string, minutesLate?: number) => Promise<any>;
    }

}interface EmployerPortalProps {
  onLogout: () => void;
}

export const EmployerPortal: React.FC<EmployerPortalProps> = ({ onLogout }) => {
  const { employers, getInternshipByEmployer, getInternshipStudent, getInternshipSupervisor, addAttendanceRecord, getAttendanceForInternship, getMessagesForInternship, sendMessage } = useApp();
  
  // Simulation State
  const [selectedEmployerId, setSelectedEmployerId] = useState<string>(employers[0]?.id || '');
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(null);
  
  // UI State
  const [view, setView] = useState<'schedule' | 'history' | 'chat'>('schedule');
  const [weekOffset, setWeekOffset] = useState(0); 
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Late Modal State
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateMinutesInput, setLateMinutesInput] = useState('15');
  const [dateForLateEntry, setDateForLateEntry] = useState<Date | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const myInternships = useMemo(() => getInternshipByEmployer(selectedEmployerId), [selectedEmployerId, getInternshipByEmployer]);
  
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

  // Helper: Get days for the currently viewed week
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

 / Algemene functie om aanwezigheid op te slaan
  const submitAttendance = async (date: Date, status: AttendanceStatus, minutesLate: number = 0) => {
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
    // Sync naar Supabase (NU MET DATUM!)
    if (window.syncAttendance) {
        await window.syncAttendance(selectedInternshipId, dateStr, status, minutesLate);
    }
  };
 

  const handleAttendanceClick = (date: Date, status: AttendanceStatus) => {
    // Als de status "Te Laat" is, openen we eerst de modal
    if (status === AttendanceStatus.LATE) {
      setDateForLateEntry(date);
      setLateMinutesInput('15'); // Reset naar standaard
      setIsLateModalOpen(true);
      return; 
    }
    // Anders direct opslaan
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

  // -- VIEWS --

  if (!selectedInternshipId) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white px-6 pt-12 pb-6 rounded-b-[32px] shadow-sm z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Goedemorgen,</h1>
              <select 
                  className="text-sm text-slate-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer font-medium mt-1"
                  value={selectedEmployerId}
                  onChange={(e) => { setSelectedEmployerId(e.target.value); }}
                >
                {employers.map(e => <option key={e.id} value={e.id}>{e.companyName}</option>)}
              </select>
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
               <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                 Geen stagiairs gekoppeld.
               </div>
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
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg shadow-inner">
                      {s.name.charAt(0)}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{s.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{internship.startDate} - {internship.endDate}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                       <ChevronLeft className="rotate-180" size={18} />
                    </div>
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
      {/* Header */}
      <div className="bg-[#009FE3] text-white px-6 pt-12 pb-16 rounded-b-[40px] shadow-lg relative z-0">
         <button onClick={() => setSelectedInternshipId(null)} className="absolute top-12 left-4 p-2 text-white/80 hover:text-white transition">
            <ChevronLeft size={28} />
         </button>
         <div className="text-center">
            <h2 className="text-2xl font-bold">{currentStudent?.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1 opacity-90">
               <CalendarDays size={14} />
               <p className="text-blue-100 text-sm">
                  {selectedInternship?.scheduledDays?.length 
                    ? selectedInternship.scheduledDays.join(', ') 
                    : 'Geen dagen ingesteld'}
               </p>
            </div>
         </div>
         
         {/* Supervisor Card Floating */}
         {currentSupervisor && view !== 'chat' && (
           <div className="absolute -bottom-8 left-6 right-6 bg-white rounded-xl shadow-md p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#009FE3]">
                    <User size={18} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Begeleider</p>
                    <p className="text-sm font-bold text-slate-800 leading-none">{currentSupervisor.name}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setView('chat')}
                  className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition"
                >
                   <MessageCircle size={18} />
                </button>
                <a href={`tel:${currentSupervisor.phoneNumber}`} className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 hover:bg-green-200 transition">
                   <Phone size={18} />
                </a>
              </div>
           </div>
         )}
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto px-6 no-scrollbar ${view === 'chat' ? 'pt-4 pb-24' : 'pt-12 pb-24'}`}>
        
        {view === 'schedule' && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-xl shadow-sm">
              <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 text-slate-400 hover:text-[#009FE3] transition">
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Week {currentWeekDays[0].toLocaleDateString('nl-NL', { week: 'numeric' })}</p>
                <p className="text-sm font-semibold text-slate-700">
                  {currentWeekDays[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} - {currentWeekDays[4].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 text-slate-400 hover:text-[#009FE3] transition">
                <ChevronRight size={20} />
              </button>
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
                      <div>
                        <p className={`text-sm font-bold capitalize ${isToday ? 'text-[#009FE3]' : 'text-slate-800'}`}>
                          {date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      {status && (
                        <span className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1
                          ${status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : ''}
                          ${status === AttendanceStatus.SICK ? 'bg-orange-100 text-orange-700' : ''}
                          ${status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : ''}
                          ${status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : ''}
                        `}>
                          {status}
                          {status === AttendanceStatus.LATE && record?.minutesLate ? ` (${record.minutesLate}m)` : ''}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <button 
                        onClick={() => handleAttendanceClick(date, AttendanceStatus.PRESENT)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.PRESENT ? 'bg-green-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-500'}`}
                      >
                        <CheckCircle size={20} className="mb-1" />
                        <span className="text-[10px] font-bold">Aanw.</span>
                      </button>
                      
                      <button 
                        onClick={() => handleAttendanceClick(date, AttendanceStatus.SICK)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.SICK ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-500'}`}
                      >
                        <AlertCircle size={20} className="mb-1" />
                        <span className="text-[10px] font-bold">Ziek</span>
                      </button>

                       <button 
                        onClick={() => handleAttendanceClick(date, AttendanceStatus.LATE)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-yellow-50 hover:text-yellow-500'}`}
                      >
                        <Clock size={20} className="mb-1" />
                        <span className="text-[10px] font-bold">Te laat</span>
                      </button>

                      <button 
                        onClick={() => handleAttendanceClick(date, AttendanceStatus.ABSENT)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${status === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
                      >
                        <XCircle size={20} className="mb-1" />
                        <span className="text-[10px] font-bold">Afw.</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {currentWeekDays.every(d => !isScheduledDay(d)) && (
                 <div className="text-center p-8 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    Geen stagedagen in deze week.
                 </div>
              )}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="animate-slide-up">
             <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={handleGenerateReport} disabled={aiLoading} className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition">
                   {aiLoading ? <Sparkles className="animate-spin" size={16} /> : <Sparkles size={16} />}
                   Genereer Rapport
                </button>
                <button onClick={handleDraftEmail} disabled={aiLoading} className="flex-shrink-0 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition">
                   <Mail size={16} />
                   Email Concept
                </button>
             </div>

            {aiReport && (
              <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm mb-6 animate-slide-up">
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-indigo-900 flex items-center gap-2"><Sparkles size={14} className="text-indigo-500"/> AI Assistent</h4>
                     <button onClick={() => setAiReport(null)} className="text-slate-400"><XCircle size={18}/></button>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{aiReport}</p>
              </div>
            )}

             <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                {attendanceHistory.length === 0 ? (
                   <div className="p-8 text-center text-slate-400">Geen geschiedenis</div>
                ) : (
                   <div className="divide-y divide-slate-50">
                      {attendanceHistory.map(record => (
                        <div key={record.id} className="p-4 flex items-center justify-between">
                           <div>
                              <p className="font-bold text-slate-700">{new Date(record.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}</p>
                              <p className="text-xs text-slate-400 capitalize">{new Date(record.date).toLocaleDateString('nl-NL', { weekday: 'long' })}</p>
                           </div>
                           <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1
                                ${record.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : ''}
                                ${record.status === AttendanceStatus.SICK ? 'bg-orange-100 text-orange-700' : ''}
                                ${record.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : ''}
                                ${record.status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : ''}
                           `}>
                              {record.status}
                              {record.status === AttendanceStatus.LATE && record.minutesLate ? ` (${record.minutesLate}m)` : ''}
                           </span>
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
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#009FE3]">
                       <User size={20} />
                    </div>
                    <div>
                       <p className="text-xs text-slate-400 font-bold uppercase">Begeleider</p>
                       <p className="font-bold text-slate-800 text-sm">{currentSupervisor?.name || 'School'}</p>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f4f8]">
                    {messages.length === 0 && (
                      <div className="text-center text-slate-400 text-xs mt-4">
                        Begin een gesprek met de begeleider.
                      </div>
                    )}
                    {messages.map(msg => {
                       const isMe = msg.senderRole === 'EMPLOYER';
                       return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-[#009FE3] text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'}`}>
                                <p>{msg.text}</p>
                                <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                   {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                             </div>
                          </div>
                       );
                    })}
                    <div ref={chatEndRef} />
                 </div>
                 <div className="p-3 bg-white border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                       <input 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Typ een bericht..."
                          className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#009FE3]"
                       />
                       <button type="submit" disabled={!newMessage.trim()} className="bg-[#009FE3] text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors">
                          <Send size={18} />
                       </button>
                    </form>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 pb-safe-bottom z-20">
        <div className="flex justify-around items-center p-2 safe-area-bottom">
           <button 
             onClick={() => setView('schedule')}
             className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-colors ${view === 'schedule' ? 'text-[#009FE3]' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <Home size={24} strokeWidth={view === 'schedule' ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">Rooster</span>
           </button>
           
           <div className="w-px h-8 bg-slate-100"></div>

           <button 
             onClick={() => setView('history')}
             className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-colors ${view === 'history' ? 'text-[#009FE3]' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <HistoryIcon size={24} strokeWidth={view === 'history' ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">Historie</span>
           </button>

           <div className="w-px h-8 bg-slate-100"></div>

           <button 
             onClick={() => setView('chat')}
             className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-colors ${view === 'chat' ? 'text-[#009FE3]' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <MessageCircle size={24} strokeWidth={view === 'chat' ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">Chat</span>
           </button>
        </div>
      </div>

      {/* Late Modal */}
      {isLateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-scale-in">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 text-yellow-600">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Te laat melding</h3>
              <p className="text-sm text-slate-500">Hoeveel minuten is de stagiair te laat?</p>
            </div>
            
            <form onSubmit={confirmLateAttendance}>
              <div className="flex items-center justify-center mb-6">
                <input 
                  type="number" 
                  min="1" 
                  max="480"
                  autoFocus
                  required
                  value={lateMinutesInput} 
                  onChange={(e) => setLateMinutesInput(e.target.value)}
                  className="text-center text-3xl font-bold w-24 border-b-2 border-[#009FE3] focus:outline-none text-slate-800 pb-1"
                />
                <span className="text-slate-400 ml-2 font-medium">minuten</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsLateModalOpen(false)}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
                >
                  Annuleren
                </button>
                <button 
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#009FE3] text-white font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-200"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

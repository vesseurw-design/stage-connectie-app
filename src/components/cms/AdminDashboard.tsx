
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Briefcase, GraduationCap, Plus, Link as LinkIcon, UserCheck, LogOut, CalendarDays, MessageCircle, Send, KeyRound } from 'lucide-react';
import { Logo } from '../Logo';
import { DayOfWeek, Internship } from '../../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { students, employers, supervisors, internships, messages, addStudent, addEmployer, addSupervisor, addInternship, sendMessage } = useApp();
  const [activeTab, setActiveTab] = useState<'students' | 'employers' | 'supervisors' | 'internships' | 'messages'>('students');

  // Form States
  const [newStudent, setNewStudent] = useState({ name: '', email: '', studentNumber: '' });
  const [newEmployer, setNewEmployer] = useState({ companyName: '', contactPerson: '', email: '', phoneNumber: '', accessCode: '' });
  const [newSupervisor, setNewSupervisor] = useState({ name: '', email: '', phoneNumber: '' });
  
  const [newInternship, setNewInternship] = useState<{
    studentId: string;
    employerId: string;
    supervisorId: string;
    startDate: string;
    endDate: string;
    scheduledDays: DayOfWeek[];
  }>({ 
    studentId: '', employerId: '', supervisorId: '', startDate: '', endDate: '', scheduledDays: [] 
  });

  // Chat State
  const [selectedInternshipIdForChat, setSelectedInternshipIdForChat] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    addStudent({ ...newStudent, id: `s${Date.now()}` });
    setNewStudent({ name: '', email: '', studentNumber: '' });
  };

  const handleAddEmployer = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployer({ ...newEmployer, id: `e${Date.now()}` });
    setNewEmployer({ companyName: '', contactPerson: '', email: '', phoneNumber: '', accessCode: '' });
  };

  const handleAddSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    addSupervisor({ ...newSupervisor, id: `sup${Date.now()}` });
    setNewSupervisor({ name: '', email: '', phoneNumber: '' });
  };

  const handleAddInternship = (e: React.FormEvent) => {
    e.preventDefault();
    if(newInternship.scheduledDays.length === 0) {
      alert("Selecteer ten minste één stagedag.");
      return;
    }
    addInternship({ ...newInternship, id: `i${Date.now()}` });
    setNewInternship({ studentId: '', employerId: '', supervisorId: '', startDate: '', endDate: '', scheduledDays: [] });
  };

  const handleSendAdminMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedInternshipIdForChat || !adminReply.trim()) return;
    sendMessage(selectedInternshipIdForChat, adminReply, 'SCHOOL');
    setAdminReply('');
  };

  const toggleDay = (day: DayOfWeek) => {
    setNewInternship(prev => {
      const exists = prev.scheduledDays.includes(day);
      if (exists) {
        return { ...prev, scheduledDays: prev.scheduledDays.filter(d => d !== day) };
      } else {
        return { ...prev, scheduledDays: [...prev.scheduledDays, day] };
      }
    });
  };

  const allDays: DayOfWeek[] = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

  // Group messages by internship for the Messages tab
  const internshipsWithMessages = internships.filter(i => messages.some(m => m.internshipId === i.id));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedInternshipIdForChat, messages]);


  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">School CMS</h1>
          <p className="text-slate-600">Beheer leerlingen, werkgevers, stagebegeleiders en stages.</p>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={onLogout} className="text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium transition-colors">
                <LogOut size={20} />
                <span className="hidden md:inline">Uitloggen</span>
            </button>
            <Logo className="h-14 text-2xl" />
        </div>
      </header>

      <div className="flex space-x-4 mb-6 border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'students' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <GraduationCap size={20} /> Leerlingen
        </button>
        <button 
          onClick={() => setActiveTab('employers')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'employers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase size={20} /> Werkgevers
        </button>
        <button 
          onClick={() => setActiveTab('supervisors')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'supervisors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserCheck size={20} /> Begeleiders
        </button>
        <button 
          onClick={() => setActiveTab('internships')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'internships' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LinkIcon size={20} /> Stages Koppelen
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`pb-3 px-4 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MessageCircle size={20} /> Berichten
        </button>
      </div>

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Leerlingen Database</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-600">Nr.</th>
                    <th className="p-4 font-medium text-slate-600">Naam</th>
                    <th className="p-4 font-medium text-slate-600">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-600">{s.studentNumber}</td>
                      <td className="p-4 font-medium text-slate-900">{s.name}</td>
                      <td className="p-4 text-slate-500">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <form onSubmit={handleAddStudent} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus size={18} /> Nieuwe Leerling</h3>
              <div className="space-y-4">
                <input required placeholder="Studentnummer" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newStudent.studentNumber} onChange={e => setNewStudent({...newStudent, studentNumber: e.target.value})} />
                <input required placeholder="Volledige Naam" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input required type="email" placeholder="Email adres" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition">Toevoegen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employers Tab */}
      {activeTab === 'employers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Werkgevers Database</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-600">Bedrijf</th>
                    <th className="p-4 font-medium text-slate-600">Contact</th>
                    <th className="p-4 font-medium text-slate-600">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employers.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-900">
                        {e.companyName}
                        <span className="block text-xs text-slate-400 font-normal">{e.email}</span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {e.contactPerson}
                        <span className="block text-xs text-slate-400">{e.phoneNumber}</span>
                      </td>
                      <td className="p-4 text-slate-600 font-mono bg-slate-50 w-24 text-center">{e.accessCode || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
             <form onSubmit={handleAddEmployer} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus size={18} /> Nieuwe Werkgever</h3>
              <div className="space-y-4">
                <input required placeholder="Bedrijfsnaam" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newEmployer.companyName} onChange={e => setNewEmployer({...newEmployer, companyName: e.target.value})} />
                <input required placeholder="Contactpersoon" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newEmployer.contactPerson} onChange={e => setNewEmployer({...newEmployer, contactPerson: e.target.value})} />
                <input required type="email" placeholder="Email" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newEmployer.email} onChange={e => setNewEmployer({...newEmployer, email: e.target.value})} />
                <input required placeholder="Telefoonnummer" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newEmployer.phoneNumber} onChange={e => setNewEmployer({...newEmployer, phoneNumber: e.target.value})} />
                
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input required placeholder="Toegangscode (voor app)" className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono" value={newEmployer.accessCode} onChange={e => setNewEmployer({...newEmployer, accessCode: e.target.value})} />
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition">Toevoegen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supervisors Tab */}
      {activeTab === 'supervisors' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Stagebegeleiders (School)</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium text-slate-600">Naam</th>
                    <th className="p-4 font-medium text-slate-600">Email</th>
                    <th className="p-4 font-medium text-slate-600">Telefoon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supervisors.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-900">{s.name}</td>
                      <td className="p-4 text-slate-500">{s.email}</td>
                      <td className="p-4 text-slate-500">{s.phoneNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
             <form onSubmit={handleAddSupervisor} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus size={18} /> Nieuwe Begeleider</h3>
              <div className="space-y-4">
                <input required placeholder="Volledige Naam" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newSupervisor.name} onChange={e => setNewSupervisor({...newSupervisor, name: e.target.value})} />
                <input required type="email" placeholder="Email (School)" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newSupervisor.email} onChange={e => setNewSupervisor({...newSupervisor, email: e.target.value})} />
                <input required placeholder="Telefoonnummer" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newSupervisor.phoneNumber} onChange={e => setNewSupervisor({...newSupervisor, phoneNumber: e.target.value})} />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition">Toevoegen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internships Tab */}
      {activeTab === 'internships' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Actieve Stages</h2>
            <div className="grid gap-4">
              {internships.map(int => {
                const student = students.find(s => s.id === int.studentId);
                const employer = employers.find(e => e.id === int.employerId);
                const supervisor = supervisors.find(s => s.id === int.supervisorId);
                
                return (
                  <div key={int.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800">{student?.name || 'Onbekend'}</h3>
                      <p className="text-sm text-slate-600">bij <span className="font-medium">{employer?.companyName || 'Onbekend'}</span></p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {int.startDate} - {int.endDate}
                        </span>
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 font-medium">
                           {int.scheduledDays && int.scheduledDays.length > 0 ? int.scheduledDays.join(', ') : 'Geen dagen'}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-slate-500 text-xs uppercase font-semibold">Begeleider (School)</p>
                      <p className="text-slate-700 font-medium">{supervisor?.name || 'Geen gekoppeld'}</p>
                      <p className="text-slate-500 text-xs">{supervisor?.phoneNumber}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
           <div>
             <form onSubmit={handleAddInternship} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus size={18} /> Nieuwe Stage Koppelen</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Selecteer Leerling</label>
                  <select required className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newInternship.studentId} onChange={e => setNewInternship({...newInternship, studentId: e.target.value})}>
                    <option value="">Kies een leerling...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentNumber})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Selecteer Werkgever</label>
                  <select required className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newInternship.employerId} onChange={e => setNewInternship({...newInternship, employerId: e.target.value})}>
                    <option value="">Kies een werkgever...</option>
                    {employers.map(e => <option key={e.id} value={e.id}>{e.companyName}</option>)}
                  </select>
                </div>
                
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Selecteer Stagebegeleider</label>
                  <select required className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newInternship.supervisorId} onChange={e => setNewInternship({...newInternship, supervisorId: e.target.value})}>
                    <option value="">Kies een begeleider...</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Startdatum</label>
                      <input required type="date" className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newInternship.startDate} onChange={e => setNewInternship({...newInternship, startDate: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Einddatum</label>
                      <input required type="date" className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newInternship.endDate} onChange={e => setNewInternship({...newInternship, endDate: e.target.value})} />
                   </div>
                </div>

                <div className="mt-2">
                   <label className="block text-xs font-medium text-slate-500 mb-2">Stagedagen</label>
                   <div className="flex flex-wrap gap-2">
                     {allDays.map(day => (
                       <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${newInternship.scheduledDays.includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                       >
                         {day}
                       </button>
                     ))}
                   </div>
                </div>
                
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition mt-4">Koppelen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
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

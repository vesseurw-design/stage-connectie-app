// Initialize Supabase
/**
 * Supervisor Portal Logic
 * Versie 4.3 - Fixed Redeclaration Syntax Error
 */

// Global configuration with redeclaration safeguard
if (typeof SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
}
if (typeof SUPABASE_KEY === 'undefined') {
    window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
}
if (typeof supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
}

let students = [];
let companies = [];
let allAttendance = [];
let currentStudent = null;
let refreshInterval = null;

// Initialize
async function init() {
    console.log('🚀 Final Force Version 4.3: Initializing...');

    // Set supervisor name and check ID
    const supervisorName = localStorage.getItem('supervisor_name');
    const supervisorId = localStorage.getItem('supervisor_id');

    if (!supervisorName || !supervisorId) {
        console.error('❌ Missing session data, redirecting...');
        window.location.href = 'supervisor-login.html';
        return;
    }

    try {
        const { data: supervisor, error: supervisorError } = await supabaseClient
            .from('stagebegeleiders')
            .select('terms_accepted_at')
            .eq('id', supervisorId)
            .single();

        if (!supervisorError && supervisor && !supervisor.terms_accepted_at) {
            if (typeof checkTermsAcceptance === 'function') {
                checkTermsAcceptance('stagebegeleiders', supervisorId, supervisor.terms_accepted_at, (acceptedAt) => {
                    continueSupervisorInit(supervisorName);
                });
                return;
            }
        }
    } catch (err) {
        console.error('Error checking supervisor terms:', err);
    }

    await continueSupervisorInit(supervisorName);
}

async function continueSupervisorInit(supervisorName) {
    let formattedName = supervisorName || 'Stagebegeleider';
    if (formattedName.trim().toLowerCase() === 'docent begeleider' || formattedName.trim().toLowerCase() === 'docent') {
        formattedName = 'Stagebegeleider';
    } else {
        formattedName = formattedName.replace(/^Docent\s+/i, 'Stagebegeleider ');
    }
    
    const supervisorElem = document.getElementById('supervisor-name');
    if (supervisorElem) {
        supervisorElem.textContent = `Hallo, ${formattedName}`;
    }

    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filter-date').value = today;

    console.log('🚀 Final Force Version 4.1: Initializing...');

    // Load initial data
    await refreshData();

    // Setup real-time and UI
    setupRealtimeSubscription();
    setupFilters();

    // Auto-refresh every 30 seconds (slower for stability)
    refreshInterval = setInterval(async () => {
        await loadAttendance();
        renderDashboard();
    }, 30000);
}



async function refreshData() {
    console.log('🔄 Refreshing data...');
    const btn = document.getElementById('refresh-btn');
    const icon = document.getElementById('refresh-icon');

    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');

    try {
        await loadCompanies();
        await loadStudents();
        await loadAttendance();
        renderDashboard();
        showToast('Gegevens succesvol ververst!');
    } catch (err) {
        console.error('Error refreshing data:', err);
        showToast('Fout bij verversen: ' + err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('animate-spin');
    }
}
window.refreshData = refreshData;


async function loadCompanies() {
    const { data } = await supabaseClient.from('Bedrijven').select('*');
    companies = data || [];
}

async function loadStudents() {
    const supervisorId = localStorage.getItem('supervisor_id');
    console.log('🔍 Loading students for supervisor_id:', supervisorId);

    // 1. Fetch direct students to detect supervisor's class(es)
    let directStudents = [];
    let { data: dataCap, error: errorCap } = await supabaseClient
        .from('Students')
        .select('*')
        .eq('supervisor_id', supervisorId);

    if (errorCap || !dataCap) {
        const { data: dataLow } = await supabaseClient
            .from('students')
            .select('*')
            .eq('supervisor_id', supervisorId);
        directStudents = dataLow || [];
    } else {
        directStudents = dataCap;
    }

    // Extract unique classes
    const supervisorClasses = [...new Set((directStudents || []).map(s => s.class).filter(Boolean))];

    let allClassStudents = [];
    if (supervisorClasses.length > 0) {
        // Query all students in supervisor's class(es) OR directly assigned
        const orConditions = [
            `supervisor_id.eq.${supervisorId}`,
            ...supervisorClasses.map(c => `class.eq.${c}`)
        ].join(',');

        let { data: classCap } = await supabaseClient
            .from('Students')
            .select('*')
            .or(orConditions);

        if (!classCap) {
            const { data: classLow } = await supabaseClient
                .from('students')
                .select('*')
                .or(orConditions);
            allClassStudents = classLow || [];
        } else {
            allClassStudents = classCap;
        }
    } else {
        allClassStudents = directStudents || [];
    }

    students = allClassStudents || [];
    console.log('✅ Found class-wide students:', students.length, students);
    updateClassFilter();
}

function updateClassFilter() {
    const classSel = document.getElementById('filter-class');
    if (!classSel) return;
    const currentVal = classSel.value;
    const classes = [...new Set(students.map(s => s.class).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true, sensitivity: 'base' }));
    classSel.innerHTML = '<option value="">Alle klassen</option>' + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    classSel.value = currentVal;
}

async function loadAttendance(retryCount = 0) {
    // IMPORTANT: student_id column is a UUID type. 
    // Passing names here will cause the entire query to fail with a syntax error.
    const studentIds = students.map(s => s.id).filter(id => {
        // Simple UUID regex check
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    });

    console.log('🔍 Querying Attendance for UUIDs:', studentIds);

    if (studentIds.length === 0) {
        allAttendance = [];
        return;
    }

    try {
        let { data, error } = await supabaseClient
            .from('Attendance')
            .select('*')
            .in('student_id', studentIds)
            .order('date', { ascending: false });

        if (error) throw error;

        allAttendance = data || [];

        // If we found truly nothing and it's the first try, wait a bit
        if (allAttendance.length === 0 && retryCount < 2) {
            console.log(`⌛ No attendance found yet (attempt ${retryCount + 1}), waiting for DB...`);
            return new Promise(resolve => {
                setTimeout(() => resolve(loadAttendance(retryCount + 1)), 1500);
            });
        }

        console.log(`✅ Loaded ${allAttendance.length} records`);
    } catch (err) {
        console.error('Attendance load error, trying fallback:', err);
        const { data: dataLow } = await supabaseClient.from('attendance').select('*').in('student_id', studentIds);
        if (dataLow) allAttendance = dataLow;
    }
}

function setupRealtimeSubscription() {
    supabaseClient
        .channel('public:Attendance')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'Attendance'
        }, (payload) => {
            console.log('🔔 Real-time update:', payload);
            loadAttendance().then(renderDashboard);
        })
        .subscribe();

    console.log('✅ Realtime subscription active');
}

function setupFilters() {
    ['filter-date', 'filter-class', 'filter-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderDashboard);
    });
}

function renderDashboard() {
    const filterDate = document.getElementById('filter-date').value;
    const filterStatus = document.getElementById('filter-status').value;

    // Filter attendance
    let filteredAttendance = allAttendance;
    if (filterDate) {
        filteredAttendance = filteredAttendance.filter(a => a.date === filterDate);
    }
    if (filterStatus) {
        filteredAttendance = filteredAttendance.filter(a => 
            a.status === filterStatus || a.student_status === filterStatus
        );
    }

    // Update stats
    updateStats(filteredAttendance);

    // Render student cards
    renderStudentCards(filteredAttendance);

}

function updateStats(attendance) {
    const today = document.getElementById('filter-date').value;
    const todayAttendance = allAttendance.filter(a => a.date === today);

    const stats = {
        total: students.length,
        present: todayAttendance.filter(a => (a.status === 'present' || a.student_status === 'present')).length,
        absent: todayAttendance.filter(a => (a.status === 'absent' || a.student_status === 'absent')).length,
        sick: todayAttendance.filter(a => (a.status === 'sick' || a.student_status === 'sick')).length
    };

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-present').textContent = stats.present;
    document.getElementById('stat-absent').textContent = stats.absent;
    document.getElementById('stat-sick').textContent = stats.sick;
}

function renderStudentCards(attendance) {
    const container = document.getElementById('students-container');
    const filterDate = document.getElementById('filter-date').value;
    const filterClass = document.getElementById('filter-class') ? document.getElementById('filter-class').value : '';

    let displayedStudents = students;
    if (filterClass) {
        displayedStudents = students.filter(s => s.class === filterClass);
    }

    if (displayedStudents.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-6 rounded-xl text-center shadow-sm border border-gray-200">
                <p class="text-gray-500 italic">Geen stagiairs gevonden voor de geselecteerde filters.</p>
            </div>
        `;
        return;
    }

    // Group students by class
    const classGroups = {};
    displayedStudents.forEach(student => {
        const className = student.class || 'Overige klassen';
        if (!classGroups[className]) classGroups[className] = [];
        classGroups[className].push(student);
    });

    const statusLabels = {
        present: 'Aanwezig',
        absent: 'Afwezig',
        sick: 'Ziek',
        late: 'Te laat'
    };

    let html = '';

    // Render each class group
    Object.keys(classGroups).sort().forEach(className => {
        const classStudents = classGroups[className];

        html += `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <!-- Class Header -->
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📚</span>
                        <h3 class="font-bold text-gray-800 text-base">Klas ${className}</h3>
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">${classStudents.length} leerling(en)</span>
                    </div>
                </div>

                <!-- Desktop / Tablet Table View -->
                <div class="hidden md:block overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200">
                                <th class="py-3 px-4">Klas</th>
                                <th class="py-3 px-4">Stagiair & Stagebedrijf</th>
                                <th class="py-3 px-4">Invoer Leerling</th>
                                <th class="py-3 px-4">Invoer Werkgever</th>
                                <th class="py-3 px-4 text-right">Actie / Historie</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
        `;

        classStudents.forEach(student => {
            const company = companies.find(c => c.id === student.company_id);
            const todayAttendance = allAttendance.find(a => {
                if (!a.student_id) return false;
                const dbId = String(a.student_id).trim().toLowerCase();
                const sId = String(student.id || '').trim().toLowerCase();
                const sName = String(student.name || '').trim().toLowerCase();
                return (dbId === sId || dbId === sName) && a.date === filterDate;
            });

            let todayComp = null;
            if (todayAttendance && todayAttendance.employer_id) {
                todayComp = companies.find(c => c.id === todayAttendance.employer_id);
            }
            if (!todayComp) {
                const filterDateObj = new Date((filterDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
                const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
                const dayCode = dayMap[filterDateObj.getDay()] || 'Ma';
                const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies) : null;
                if (dayComp) todayComp = dayComp.company;
            }

            const compName = todayComp ? todayComp.company_name : (company ? company.company_name : 'Geen stagebedrijf');

            // Student Status Badge
            let studentBadge = '<span class="text-xs text-gray-400 italic">⏳ Niet ingevuld</span>';
            if (todayAttendance && todayAttendance.student_status) {
                const st = todayAttendance.student_status;
                const hours = todayAttendance.student_hours > 0 ? ` (${todayAttendance.student_hours}u)` : '';
                const lateMin = st === 'late' ? ` (${todayAttendance.minutes_late || 0}m)` : '';
                
                if (st === 'present') {
                    studentBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">Aanwezig${hours}</span>`;
                } else if (st === 'absent') {
                    studentBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">Afwezig</span>`;
                } else if (st === 'sick') {
                    studentBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center gap-1">Ziek</span>`;
                } else if (st === 'late') {
                    studentBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200 inline-flex items-center gap-1">Te laat${lateMin}</span>`;
                }
            }

            // Employer Status Badge
            let employerBadge = '<span class="text-xs text-gray-400 italic">⏳ Niet ingevuld</span>';
            if (todayAttendance && todayAttendance.status && todayAttendance.status !== 'pending') {
                const empSt = todayAttendance.status;
                const lateMin = empSt === 'late' ? ` (${todayAttendance.minutes_late || 0}m)` : '';

                if (empSt === 'present') {
                    employerBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-800 border border-green-200 inline-flex items-center gap-1">✅ Goedgekeurd (Aanwezig)</span>`;
                } else if (empSt === 'absent') {
                    employerBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">❌ Afwezig</span>`;
                } else if (empSt === 'sick') {
                    employerBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center gap-1">🤒 Ziek</span>`;
                } else if (empSt === 'late') {
                    employerBadge = `<span class="px-2 py-1 text-xs font-bold rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200 inline-flex items-center gap-1">⏱️ Te laat${lateMin}</span>`;
                }
            } else if (todayAttendance && todayAttendance.student_status) {
                employerBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1">⏳ Wacht op akkoord werkgever</span>`;
            }

            const studentJson = JSON.stringify(student).replace(/'/g, "&apos;");

            html += `
                <tr class="hover:bg-blue-50/50 transition">
                    <td class="py-3.5 px-4 font-bold text-gray-700 text-xs">${student.class || '-'}</td>
                    <td class="py-3.5 px-4">
                        <div class="font-bold text-gray-900">${student.name}</div>
                        <div class="text-xs font-medium text-blue-600">📍 ${compName}</div>
                    </td>
                    <td class="py-3.5 px-4">${studentBadge}</td>
                    <td class="py-3.5 px-4">${employerBadge}</td>
                    <td class="py-3.5 px-4 text-right">
                        <button onclick='openStudentDetail(${studentJson})' class="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs transition inline-flex items-center gap-1 border border-blue-200 shadow-sm">
                            👁️ Historie & Acties
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card View -->
                <div class="block md:hidden divide-y divide-gray-100">
        `;

        classStudents.forEach(student => {
            const company = companies.find(c => c.id === student.company_id);
            const todayAttendance = allAttendance.find(a => {
                if (!a.student_id) return false;
                const dbId = String(a.student_id).trim().toLowerCase();
                const sId = String(student.id || '').trim().toLowerCase();
                const sName = String(student.name || '').trim().toLowerCase();
                return (dbId === sId || dbId === sName) && a.date === filterDate;
            });

            let todayComp = null;
            if (todayAttendance && todayAttendance.employer_id) {
                todayComp = companies.find(c => c.id === todayAttendance.employer_id);
            }
            if (!todayComp) {
                const filterDateObj = new Date((filterDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
                const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
                const dayCode = dayMap[filterDateObj.getDay()] || 'Ma';
                const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies) : null;
                if (dayComp) todayComp = dayComp.company;
            }

            const compName = todayComp ? todayComp.company_name : (company ? company.company_name : 'Geen stagebedrijf');

            let studentBadge = '<span class="text-xs text-gray-400 italic">Niet ingevuld</span>';
            if (todayAttendance && todayAttendance.student_status) {
                const st = todayAttendance.student_status;
                const hours = todayAttendance.student_hours > 0 ? ` (${todayAttendance.student_hours}u)` : '';
                studentBadge = `${statusLabels[st] || st}${hours}`;
            }

            let employerBadge = '<span class="text-xs text-gray-400 italic">Niet ingevuld</span>';
            if (todayAttendance && todayAttendance.status && todayAttendance.status !== 'pending') {
                const empSt = todayAttendance.status;
                employerBadge = `✅ ${statusLabels[empSt] || empSt}`;
            } else if (todayAttendance && todayAttendance.student_status) {
                employerBadge = `⏳ Wacht op akkoord`;
            }

            const studentJson = JSON.stringify(student).replace(/'/g, "&apos;");

            html += `
                <div class="p-4 flex flex-col gap-2 hover:bg-gray-50 transition">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-gray-900 text-sm">${student.name}</h4>
                            <p class="text-xs text-blue-600 font-medium">📍 ${compName}</p>
                        </div>
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">${student.class || '-'}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs my-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <div>
                            <span class="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Leerling</span>
                            <span class="font-bold text-purple-800">${studentBadge}</span>
                        </div>
                        <div>
                            <span class="text-gray-400 block text-[10px] uppercase font-bold mb-0.5">Werkgever</span>
                            <span class="font-bold text-green-800">${employerBadge}</span>
                        </div>
                    </div>

                    <button onclick='openStudentDetail(${studentJson})' class="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs transition text-center border border-blue-200">
                        👁️ Historie & Aanwezigheid Inkijken
                    </button>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function openStudentDetail(student) {
    currentStudent = student;
    const assignments = typeof getStudentCompanyAssignments === 'function'
        ? getStudentCompanyAssignments(student, companies)
        : [];
    let companyHtml = '-';
    if (assignments.length > 0) {
        companyHtml = assignments.map(a => {
            const daysStr = (a.days && a.days.length > 0) ? ` (${a.days.join(', ')})` : '';
            const cObj = companies.find(c => c.id === a.company_id);
            const contactStr = cObj && cObj.contact_person ? ` • 👤 ${cObj.contact_person}` : '';
            const phoneStr = cObj && cObj.phone ? ` • 📞 <a href="tel:${cObj.phone}" class="text-blue-600 hover:underline">${cObj.phone}</a>` : '';
            const emailStr = cObj && cObj.email ? ` • ✉️ <a href="mailto:${cObj.email}" class="text-blue-600 hover:underline">${cObj.email}</a>` : '';
            return `<div class="mb-1"><strong>📍 ${a.company_name}</strong>${daysStr}${contactStr}${phoneStr}${emailStr}</div>`;
        }).join('');
    } else {
        const company = companies.find(c => c.id === student.company_id);
        if (company) {
            const contactStr = company.contact_person ? ` • 👤 ${company.contact_person}` : '';
            const phoneStr = company.phone ? ` • 📞 <a href="tel:${company.phone}" class="text-blue-600 hover:underline">${company.phone}</a>` : '';
            const emailStr = company.email ? ` • ✉️ <a href="mailto:${company.email}" class="text-blue-600 hover:underline">${company.email}</a>` : '';
            companyHtml = `<div><strong>📍 ${company.company_name}</strong>${contactStr}${phoneStr}${emailStr}</div>`;
        }
    }

    document.getElementById('modal-student-name').textContent = student.name;
    document.getElementById('modal-student-number').textContent = student.student_number || '-';
    document.getElementById('modal-company').innerHTML = companyHtml;
    document.getElementById('modal-scheduled-days').textContent = (student.scheduled_days || []).join(', ') || '-';

    // Support for V2 modal fields
    const classEl = document.getElementById('modal-student-class');
    const yearEl = document.getElementById('modal-school-year');
    if (classEl) classEl.textContent = student.class || '-';
    if (yearEl) yearEl.textContent = student.school_year || '-';

    // Update current date label
    const filterDate = document.getElementById('filter-date').value || new Date().toISOString().split('T')[0];
    const dateObj = new Date(filterDate);
    const dateStrFormatted = dateObj.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
    document.getElementById('modal-current-date-label').textContent = `Datum: ${dateStrFormatted}`;

    // Get all attendance for this student (support both ID and name fallback)
    const studentAttendance = allAttendance.filter(a => {
        if (!a.student_id) return false;
        const dbId = String(a.student_id).trim().toLowerCase();
        const sId = String(student.id || '').trim().toLowerCase();
        const sName = String(student.name || '').trim().toLowerCase();
        return dbId === sId || dbId === sName;
    });

    // Populate month filter
    populateMonthFilter(studentAttendance);

    // Render history (all months by default)
    renderAttendanceHistory(studentAttendance, 'all');

    document.getElementById('student-modal').classList.remove('hidden');
}

function populateMonthFilter(attendance) {
    const monthFilter = document.getElementById('history-month-filter');

    // Get unique months from attendance data
    const months = new Set();
    attendance.forEach(a => {
        const date = new Date(a.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
    });

    // Sort months descending (newest first)
    const sortedMonths = Array.from(months).sort().reverse();

    // Build options
    let options = '<option value="all">Alle maanden</option>';
    sortedMonths.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        const monthName = date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
        options += `<option value="${monthKey}">${monthName}</option>`;
    });

    monthFilter.innerHTML = options;
}

function filterHistoryByMonth() {
    if (!currentStudent) return;

    const selectedMonth = document.getElementById('history-month-filter').value;
    const studentAttendance = allAttendance.filter(a => a.student_id === currentStudent.id || a.student_id === currentStudent.name);

    renderAttendanceHistory(studentAttendance, selectedMonth);
}

function renderAttendanceHistory(attendance, monthFilter) {
    const historyContainer = document.getElementById('modal-attendance-history');

    // Filter by month if not 'all'
    let filteredAttendance = attendance;
    if (monthFilter !== 'all') {
        filteredAttendance = attendance.filter(a => {
            const date = new Date(a.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === monthFilter;
        });
    }

    // Sort by date descending (newest first)
    filteredAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredAttendance.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm text-gray-500">Geen aanwezigheidsdata voor deze periode</p>';
    } else {
        historyContainer.innerHTML = filteredAttendance.map(a => {
            const statusColors = {
                present: 'bg-green-100 text-green-800',
                absent: 'bg-red-100 text-red-800',
                sick: 'bg-orange-100 text-orange-800',
                late: 'bg-yellow-100 text-yellow-800'
            };
            const statusLabels = {
                present: 'Aanwezig',
                absent: 'Afwezig',
                sick: 'Ziek',
                late: `Te laat (${a.minutes_late}m)`
            };

            // Format date nicely
            const date = new Date(a.date);
            const formattedDate = date.toLocaleDateString('nl-NL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            const recComp = companies.find(c => c.id === a.employer_id);
            let compName = recComp ? recComp.company_name : null;
            if (!compName && currentStudent) {
                const dObj = new Date(a.date + 'T00:00:00');
                const dMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
                const dCode = dMap[dObj.getDay()] || 'Ma';
                const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(currentStudent, dCode, companies) : null;
                if (dayComp) compName = dayComp.company_name;
            }

            return `
                <div class="p-3 bg-gray-50 rounded-xl space-y-2 border border-blue-50">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold text-gray-800">${formattedDate}</span>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${statusColors[a.status] || 'bg-gray-100 text-gray-500'}">
                                ${statusLabels[a.status] || 'Geen status'}
                            </span>
                            <button onclick="openSupervisorActionSheet('${a.student_id}', '${a.date}')" class="text-xs font-black text-blue-600 hover:text-blue-800 transition">
                                Aanpassen
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 text-[11px]">
                        ${compName ? `<div class="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">📍 ${compName}</div>` : ''}
                        ${a.student_hours ? `<div class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">Uren: ${a.student_hours}u</div>` : ''}
                        
                        ${a.student_status ? `
                            <div class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1" title="Invoer stagiair">
                                <span>Stagiair: ${a.student_status === 'late' ? `Te laat (${a.minutes_late || 0}m)` : (a.student_status === 'present' ? 'Aanwezig' : (a.student_status === 'absent' ? 'Afwezig' : (a.student_status === 'sick' ? 'Ziek' : a.student_status)))}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${a.notes ? `
                        <div class="mt-1.5 text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1">
                            <span class="font-semibold text-amber-800 shrink-0">💬 Opmerking:</span>
                            <span class="text-gray-800">${a.notes}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
}

function closeModal() {
    const modal = document.getElementById('student-modal');
    if (modal) modal.classList.add('hidden');
    currentStudent = null;
}
window.closeModal = closeModal;

let activeEdit = null;
let selectedActionStatus = 'present';

function selectActionSheetStatus(status) {
    selectedActionStatus = status;
    const lateContainer = document.getElementById('late-input-container');
    if (lateContainer) {
        if (status === 'late') {
            lateContainer.classList.remove('hidden');
        } else {
            lateContainer.classList.add('hidden');
        }
    }
    updateActionSheetButtonsUI();
}
window.selectActionSheetStatus = selectActionSheetStatus;

function updateActionSheetButtonsUI() {
    const statuses = ['present', 'absent', 'sick', 'late'];
    statuses.forEach(s => {
        const btn = document.getElementById(`action-btn-${s}`);
        if (btn) {
            if (s === selectedActionStatus) {
                btn.classList.add('ring-4', 'ring-blue-500', 'scale-[1.03]', 'shadow-md');
                btn.classList.remove('border-2');
            } else {
                btn.classList.remove('ring-4', 'ring-blue-500', 'scale-[1.03]', 'shadow-md');
                btn.classList.add('border-2');
            }
        }
    });
}

function editCurrentFilteredDateStatus() {
    if (!currentStudent) return;
    const filterDate = document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
    openSupervisorActionSheet(currentStudent.id, filterDate);
}
window.editCurrentFilteredDateStatus = editCurrentFilteredDateStatus;

function openSupervisorActionSheet(studentId, date) {
    activeEdit = { studentId, date };

    const existingRecord = allAttendance.find(a => 
        (a.student_id === studentId || a.student_id === currentStudent?.name) && a.date === date
    );

    selectedActionStatus = existingRecord?.status || 'present';
    selectActionSheetStatus(selectedActionStatus);

    const lateMinutesInput = document.getElementById('supervisor-late-minutes');
    if (lateMinutesInput) lateMinutesInput.value = existingRecord?.minutes_late || 15;

    const noteInput = document.getElementById('action-sheet-note');
    if (noteInput) noteInput.value = existingRecord?.notes || '';

    const overlay = document.getElementById('action-overlay');
    const sheet = document.getElementById('action-sheet');

    if (overlay && sheet) {
        overlay.classList.remove('hidden');
        sheet.classList.remove('hidden');
        setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
    } else {
        openCorrectModal(date);
    }
}
window.openSupervisorActionSheet = openSupervisorActionSheet;

function openSupervisorLateInput() {
    selectActionSheetStatus('late');
}
window.openSupervisorLateInput = openSupervisorLateInput;

function closeActions() {
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    if (sheet) sheet.classList.add('translate-y-full');
    setTimeout(() => {
        if (sheet) sheet.classList.add('hidden');
        if (overlay) overlay.classList.add('hidden');
        activeEdit = null;
    }, 300);
}
window.closeActions = closeActions;

async function saveSupervisorAttendance(explicitStatus) {
    if (!activeEdit && !currentStudent) return;

    const studentId = activeEdit ? activeEdit.studentId : currentStudent?.id;
    const date = activeEdit ? activeEdit.date : (document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0]);

    if (!studentId || !date) return;

    const statusToSave = (explicitStatus !== undefined) ? explicitStatus : selectedActionStatus;

    let minutesLate = 0;
    if (statusToSave === 'late') {
        minutesLate = parseInt(document.getElementById('supervisor-late-minutes')?.value) || 15;
    }

    const noteVal = document.getElementById('action-sheet-note')?.value?.trim() || null;
    const student = students.find(s => s.id === studentId || s.name === studentId);
    
    const dateObj = new Date(date + 'T00:00:00');
    const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    const dayCode = dayMap[dateObj.getDay()] || 'Ma';
    const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies) : null;
    const companyId = dayComp ? dayComp.company_id : (student ? student.company_id : null);

    const record = {
        student_id: studentId,
        date: date,
        status: statusToSave,
        minutes_late: minutesLate,
        notes: noteVal,
        employer_id: companyId || null,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient.from('Attendance').upsert(record, { onConflict: 'student_id,date' });
        if (error) throw error;

        showToast('Wijziging opgeslagen!');
        closeActions();

        await loadAttendance();
        renderDashboard();
        if (currentStudent && (currentStudent.id === studentId || currentStudent.name === studentId)) {
            openStudentDetail(currentStudent);
        }
    } catch (err) {
        console.error('Error saving supervisor attendance:', err);
        alert('Fout bij opslaan: ' + err.message);
    }
}
window.saveSupervisorAttendance = saveSupervisorAttendance;

let selectedCorrectStatus = 'present';

function openCorrectModal(targetDate) {
    if (!currentStudent) return;

    const modalName = document.getElementById('correct-modal-name');
    const modalSubtitle = document.getElementById('correct-modal-subtitle');
    const dateInput = document.getElementById('correct-date');
    const hoursInput = document.getElementById('correct-hours');
    const noteInput = document.getElementById('correct-note');

    if (modalName) modalName.textContent = currentStudent.name;
    if (modalSubtitle) modalSubtitle.textContent = `Vul aanwezigheid en opmerking in voor ${currentStudent.name}`;

    const dateVal = targetDate || document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = dateVal;

    // Check if record exists
    const existingRecord = allAttendance.find(a => 
        (a.student_id === currentStudent.id || a.student_id === currentStudent.name) && a.date === dateVal
    );

    if (existingRecord) {
        selectCorrectStatus(existingRecord.status || 'present');
        if (hoursInput) hoursInput.value = existingRecord.student_hours ?? 8;
        if (noteInput) noteInput.value = existingRecord.notes || '';
    } else {
        selectCorrectStatus('present');
        if (hoursInput) hoursInput.value = 8;
        if (noteInput) noteInput.value = '';
    }

    const modal = document.getElementById('correct-modal');
    if (modal) modal.classList.remove('hidden');
}
window.openCorrectModal = openCorrectModal;

function closeCorrectModal() {
    const modal = document.getElementById('correct-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeCorrectModal = closeCorrectModal;

function selectCorrectStatus(status) {
    selectedCorrectStatus = status;
    const statuses = ['present', 'absent', 'sick', 'late'];
    statuses.forEach(s => {
        const btn = document.getElementById(`sup-btn-${s}`);
        if (btn) {
            if (s === status) {
                btn.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700', 'font-bold');
                btn.classList.remove('border-gray-200', 'text-gray-600');
            } else {
                btn.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700', 'font-bold');
                btn.classList.add('border-gray-200', 'text-gray-600');
            }
        }
    });
}
window.selectCorrectStatus = selectCorrectStatus;

async function saveCorrection() {
    if (!currentStudent) {
        alert('Geen stagiair geselecteerd.');
        return;
    }

    const dateVal = document.getElementById('correct-date')?.value;
    if (!dateVal) {
        alert('Selecteer een datum.');
        return;
    }

    const hoursVal = parseFloat(document.getElementById('correct-hours')?.value) || 8;
    const noteVal = document.getElementById('correct-note')?.value?.trim() || null;

    const record = {
        student_id: currentStudent.id,
        date: dateVal,
        status: selectedCorrectStatus,
        student_hours: (selectedCorrectStatus === 'present' || selectedCorrectStatus === 'late') ? hoursVal : 0,
        minutes_late: selectedCorrectStatus === 'late' ? 15 : 0,
        notes: noteVal,
        employer_id: currentStudent.company_id || null,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient.from('Attendance').upsert(record, { onConflict: 'student_id,date' });
        if (error) throw error;

        showToast('Aanwezigheid opgeslagen!');
        closeCorrectModal();

        await loadAttendance();
        renderDashboard();
        if (currentStudent) {
            openStudentDetail(currentStudent);
        }
    } catch (err) {
        console.error('Error saving correction:', err);
        alert('Fout bij opslaan: ' + err.message);
    }
}
window.saveCorrection = saveCorrection;

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const toastMsg = document.getElementById('toast-message');
    if (toastMsg) toastMsg.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translate(-50%, 0) scale(0.9)'; 
    }, 2000);
}

async function exportSupervisorStudentPDF() {
    if (!currentStudent) {
        alert('Selecteer eerst een student om het logboek te exporteren.');
        return;
    }

    let studentAttendance = allAttendance.filter(a => {
        if (!a.student_id) return false;
        const dbId = String(a.student_id).trim().toLowerCase();
        const sId = String(currentStudent.id || '').trim().toLowerCase();
        const sName = String(currentStudent.name || '').trim().toLowerCase();
        return dbId === sId || dbId === sName;
    });

    // Fallback: If no records in memory, fetch directly from DB for this student
    if (!studentAttendance || studentAttendance.length === 0) {
        const { data: dbData } = await supabaseClient
            .from('Attendance')
            .select('*')
            .eq('student_id', currentStudent.id)
            .order('date', { ascending: true });

        if (dbData && dbData.length > 0) {
            studentAttendance = dbData;
        }
    }

    if (!studentAttendance || studentAttendance.length === 0) {
        alert('Geen aanwezigheids- of dagverslaggegevens gevonden voor deze student.');
        return;
    }

    // Sort by date ascending
    const sortedAttendance = [...studentAttendance].sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalHours = 0;
    let daysPresent = 0;
    let daysAbsent = 0;
    let daysSick = 0;
    let daysLate = 0;

    sortedAttendance.forEach(r => {
        const hours = r.student_hours || (r.status === 'present' ? 8 : 0);
        totalHours += hours;
        const st = r.student_status || r.status;
        if (st === 'present') daysPresent++;
        else if (st === 'absent') daysAbsent++;
        else if (st === 'sick') daysSick++;
        else if (st === 'late') daysLate++;
    });

    const company = companies.find(c => c.id === currentStudent.company_id);
    const companyName = company?.company_name || '-';
    const schoolName = window.SCHOOL_CONFIG?.schoolName || 'StageConnectie';

    const printWin = window.open('', '_blank', 'width=900,height=900');
    if (!printWin) {
        alert('Pop-up geblokkeerd door uw browser. Sta pop-ups toe voor deze site om het afdruk/PDF venster te openen.');
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <title>Stageverslag_${currentStudent.name.replace(/\s+/g, '_')}</title>
            <style>
                @page { size: A4; margin: 12mm; }
                body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 20px; background: #fff; }
                .header { border-bottom: 3px solid #7e22ce; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
                .title { font-size: 22px; font-weight: bold; color: #6b21a8; margin: 0; }
                .subtitle { font-size: 12px; color: #6b7280; margin: 4px 0 0 0; }
                .info-grid { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .stats-grid { display: flex; gap: 10px; margin-bottom: 16px; }
                .stat-card { flex: 1; border-radius: 8px; padding: 10px; text-align: center; }
                .stat-card.purple { background: #f3e8ff; border: 1px solid #d8b4fe; }
                .stat-card.green { background: #dcfce7; border: 1px solid #86efac; }
                .stat-card.yellow { background: #fef9c3; border: 1px solid #fde047; }
                .stat-card.red { background: #fee2e2; border: 1px solid #fca5a5; }
                .stat-num { font-size: 16px; font-weight: bold; }
                .stat-label { font-size: 11px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; margin-top: 10px; }
                th { background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; padding: 8px 10px; text-align: left; font-weight: bold; }
                td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; word-break: break-word; }
                tr { page-break-inside: avoid; }
                .btn-print { margin-bottom: 15px; padding: 8px 16px; background: #6b21a8; color: #fff; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; }
                @media print { .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; font-weight: bold; color: #6b21a8;">📄 Klik op "Opslaan als PDF / Afdrukken" (of kies 'Opslaan als PDF' in het afdrukvenster)</span>
                <button onclick="window.print()" class="btn-print">🖨️ Opslaan als PDF / Afdrukken</button>
            </div>

            <div class="header">
                <div>
                    <h1 class="title">📋 Stage-Logboek & Urenoverzicht</h1>
                    <p class="subtitle">Officieel document – ${schoolName}</p>
                </div>
                <div style="text-align: right; font-size: 11px; color: #6b7280;">
                    Exportdatum: ${new Date().toLocaleDateString('nl-NL')}
                </div>
            </div>

            <div class="info-grid">
                <div><strong>Stagiair:</strong> ${currentStudent.name}</div>
                <div><strong>Klas:</strong> ${currentStudent.class || '-'}</div>
                <div><strong>Stagebedrijf:</strong> ${companyName}</div>
                <div><strong>Schooljaar:</strong> ${currentStudent.school_year || '-'}</div>
                <div><strong>Email:</strong> ${currentStudent.email || '-'}</div>
                <div><strong>Studentnummer:</strong> ${currentStudent.student_number || '-'}</div>
            </div>

            <div class="stats-grid">
                <div class="stat-card purple">
                    <div class="stat-num" style="color: #6b21a8;">${totalHours} uur</div>
                    <div class="stat-label" style="color: #7e22ce;">Totaal Gelopen</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-num" style="color: #166534;">${daysPresent} dagen</div>
                    <div class="stat-label" style="color: #15803d;">Aanwezig</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-num" style="color: #854d0e;">${daysLate}x</div>
                    <div class="stat-label" style="color: #a16207;">Te laat</div>
                </div>
                <div class="stat-card red">
                    <div class="stat-num" style="color: #991b1b;">${daysAbsent + daysSick}x</div>
                    <div class="stat-label" style="color: #b91c1c;">Afwezig / Ziek</div>
                </div>
            </div>

            <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">Aanwezigheid & Dagverslagen / Notities:</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 22%;">Datum</th>
                        <th style="width: 15%;">Status</th>
                        <th style="width: 12%;">Uren</th>
                        <th style="width: 51%;">Werkzaamheden / Notities</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedAttendance.map((r, idx) => {
                        const dateObj = new Date(r.date + 'T00:00:00');
                        const dateStr = dateObj.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                        const st = r.student_status || r.status;
                        const statusStr = st === 'late' ? `Te laat (${r.minutes_late || 0}m)` : (statusLabels[st] || st || '-');
                        const noteText = r.notes || '';
                        return `
                            <tr>
                                <td style="font-weight: bold;">${dateStr}</td>
                                <td>${statusStr}</td>
                                <td>${r.student_hours || 0} u</td>
                                <td style="white-space: pre-wrap; color: ${noteText ? '#111827' : '#9ca3af'}; font-style: ${noteText ? 'normal' : 'italic'};">
                                    ${noteText ? noteText.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '- Geen notitie -'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 200);
                };
            </script>
        </body>
        </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
}

async function exportSupervisorClassPDF() {
    const filterDate = document.getElementById('filter-date').value;
    const filterClass = document.getElementById('filter-class') ? document.getElementById('filter-class').value : '';

    let targetStudents = students;
    if (filterClass) {
        targetStudents = students.filter(s => s.class === filterClass);
    }

    if (!targetStudents || targetStudents.length === 0) {
        alert('Geen stagiairs om te exporteren.');
        return;
    }

    const supervisorName = localStorage.getItem('supervisor_name') || 'Stagebegeleider';
    const dateObj = new Date(filterDate + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '750px';
    reportContainer.style.boxSizing = 'border-box';
    reportContainer.style.padding = '24px';
    reportContainer.style.fontFamily = 'Arial, sans-serif';
    reportContainer.style.color = '#1f2937';
    reportContainer.style.position = 'absolute';
    reportContainer.style.left = '0';
    reportContainer.style.top = '0';
    reportContainer.style.opacity = '0.01';
    reportContainer.style.pointerEvents = 'none';
    reportContainer.style.zIndex = '-999';
    document.body.appendChild(reportContainer);

    const statusLabels = { present: 'Aanwezig', absent: 'Afwezig', sick: 'Ziek', late: 'Te laat' };

    reportContainer.innerHTML = `
        <div style="border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #1e40af; margin: 0;">📚 Klas-Aanwezigheidsoverzicht</h1>
            <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">StageConnectie – Groene Hart Praktijkschool</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <div><strong>Stagebegeleider:</strong> ${supervisorName}</div>
                <div><strong>Datum:</strong> ${formattedDate}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div><strong>Klas-filter:</strong> ${filterClass || 'Alle klassen'}</div>
                <div><strong>Aantal leerlingen:</strong> ${targetStudents.length}</div>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">
            <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                    <th style="padding: 8px 10px; width: 12%; font-weight: bold;">Klas</th>
                    <th style="padding: 8px 10px; width: 30%; font-weight: bold;">Stagiair & Stagebedrijf</th>
                    <th style="padding: 8px 10px; width: 28%; font-weight: bold;">Invoer Leerling</th>
                    <th style="padding: 8px 10px; width: 30%; font-weight: bold;">Invoer Werkgever</th>
                </tr>
            </thead>
            <tbody>
                ${targetStudents.map((student, idx) => {
                    const company = companies.find(c => c.id === student.company_id);
                    const todayAttendance = allAttendance.find(a => {
                        if (!a.student_id) return false;
                        const dbId = String(a.student_id).trim().toLowerCase();
                        const sId = String(student.id || '').trim().toLowerCase();
                        const sName = String(student.name || '').trim().toLowerCase();
                        return (dbId === sId || dbId === sName) && a.date === filterDate;
                    });

                    let todayComp = null;
                    if (todayAttendance && todayAttendance.employer_id) {
                        todayComp = companies.find(c => c.id === todayAttendance.employer_id);
                    }
                    if (!todayComp) {
                        const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
                        const dayCode = dayMap[dateObj.getDay()] || 'Ma';
                        const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies) : null;
                        if (dayComp) todayComp = dayComp.company;
                    }
                    const compName = todayComp ? todayComp.company_name : (company ? company.company_name : 'Geen stagebedrijf');

                    let studentStr = 'Niet ingevuld';
                    if (todayAttendance && todayAttendance.student_status) {
                        const st = todayAttendance.student_status;
                        const hours = todayAttendance.student_hours > 0 ? ` (${todayAttendance.student_hours}u)` : '';
                        studentStr = `${statusLabels[st] || st}${hours}`;
                    }

                    let employerStr = 'Niet ingevuld';
                    if (todayAttendance && todayAttendance.status && todayAttendance.status !== 'pending') {
                        const empSt = todayAttendance.status;
                        employerStr = `✅ ${statusLabels[empSt] || empSt}`;
                    } else if (todayAttendance && todayAttendance.student_status) {
                        employerStr = `⏳ Wacht op akkoord`;
                    }

                    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                    return `
                        <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
                            <td style="padding: 8px 10px; font-weight: bold; vertical-align: top;">${student.class || '-'}</td>
                            <td style="padding: 8px 10px; vertical-align: top;">
                                <strong>${student.name}</strong><br>
                                <span style="color: #2563eb; font-size: 10px;">📍 ${compName}</span>
                            </td>
                            <td style="padding: 8px 10px; vertical-align: top; color: #6b21a8; font-weight: bold;">${studentStr}</td>
                            <td style="padding: 8px 10px; vertical-align: top; color: #166534; font-weight: bold;">${employerStr}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: `Klas_Aanwezigheidsoverzicht_${filterClass || 'Alle'}_${filterDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    if (window.html2pdf) {
        window.html2pdf().set(opt).from(reportContainer).save().then(() => {
            reportContainer.remove();
        }).catch(err => {
            console.error('PDF error:', err);
            reportContainer.remove();
        });
    } else {
        reportContainer.remove();
        window.print();
    }
}

window.exportSupervisorStudentPDF = exportSupervisorStudentPDF;
window.exportSupervisorClassPDF = exportSupervisorClassPDF;

// Supervisor Companies Search Modal Functions
window.openSupervisorCompaniesModal = function () {
    const modal = document.getElementById('supervisor-companies-modal');
    if (modal) {
        modal.classList.remove('hidden');
        filterSupervisorCompanies();
    }
};

window.closeSupervisorCompaniesModal = function () {
    const modal = document.getElementById('supervisor-companies-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.filterSupervisorCompanies = function () {
    const query = (document.getElementById('sup-company-search')?.value || '').toLowerCase().trim();
    const container = document.getElementById('sup-companies-list');
    if (!container) return;

    const filtered = (companies || []).filter(c => {
        const name = (c.company_name || '').toLowerCase();
        const branche = (c.branche || '').toLowerCase();
        const contact = (c.contact_person || '').toLowerCase();
        return name.includes(query) || branche.includes(query) || contact.includes(query);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 text-sm py-6">Geen stagebedrijven gevonden.</p>';
        return;
    }

    container.innerHTML = filtered.map(c => `
        <div class="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-800 text-sm">${c.company_name}</span>
                    ${c.branche ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-semibold rounded-full">${c.branche}</span>` : ''}
                </div>
                <div class="text-xs text-gray-600 mt-1">
                    👤 Praktijkbegeleider: <strong>${c.contact_person || 'Niet opgegeven'}</strong>
                </div>
            </div>
            <div class="text-xs text-gray-600 space-y-1">
                ${c.phone ? `<div>📞 Telefoon: <a href="tel:${c.phone}" class="text-blue-600 hover:underline font-medium">${c.phone}</a></div>` : ''}
                ${c.email ? `<div>✉️ Email: <a href="mailto:${c.email}" class="text-blue-600 hover:underline font-medium">${c.email}</a></div>` : ''}
            </div>
        </div>
    `).join('');
};

// Initialize on load
init();

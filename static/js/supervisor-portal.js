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
let supervisors = [];
let holidays = [];
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
        await Promise.all([loadCompanies(), loadSupervisors(), loadHolidays()]);
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

async function loadSupervisors() {
    try {
        const { data } = await supabaseClient.from('stagebegeleiders').select('*');
        supervisors = data || [];
    } catch (e) {
        supervisors = [];
    }
}

async function loadHolidays() {
    try {
        const { data } = await supabaseClient.from('Vakanties').select('*');
        holidays = data || [];
    } catch (e) {
        holidays = [];
    }
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

let isInitialAttendanceLoaded = false;
let notificationTimeout = null;
const notifiedAttendanceKeys = new Map();

function formatDateNL(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = String(dateStr).split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
        }
    } catch (e) {}
    return dateStr;
}

function playNotificationSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
}

function showNotification(title, message) {
    let banner = document.getElementById('notification-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'notification-banner';
        banner.className = 'fixed top-20 left-0 right-0 z-50 mx-4 animate-slide-down';
        banner.innerHTML = `
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9">
                        </path>
                    </svg>
                    <div>
                        <p class="font-semibold text-sm" id="notification-title"></p>
                        <p class="text-xs sm:text-sm opacity-90" id="notification-message"></p>
                    </div>
                </div>
                <button onclick="closeNotificationBanner()" class="text-white hover:text-gray-200 p-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12">
                        </path>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(banner);
    }

    const titleEl = document.getElementById('notification-title');
    const msgEl = document.getElementById('notification-message');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    banner.classList.remove('hidden');

    const badge = document.getElementById('notification-badge');
    if (badge) {
        const count = (parseInt(badge.textContent) || 0) + 1;
        badge.textContent = count;
        badge.classList.remove('hidden');
    }

    playNotificationSound();

    try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: '/icon-v3.png' });
        }
    } catch (e) {}

    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        closeNotificationBanner();
    }, 8000);
}
window.showNotification = showNotification;

function closeNotificationBanner() {
    const banner = document.getElementById('notification-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
}
window.closeNotificationBanner = closeNotificationBanner;

function notifyAttendanceChange(record, existingRecord = null) {
    if (!record || !record.student_id) return;

    const student = students.find(s => s.id === record.student_id);
    if (!student) return;

    if (!existingRecord) {
        existingRecord = allAttendance.find(a => a.student_id === record.student_id && a.date === record.date);
    }

    const dedupeKey = `${record.student_id}_${record.date}`;
    const dedupeVal = `${record.status || ''}_${record.student_status || ''}_${record.student_hours || 0}_${record.minutes_late || 0}`;

    const last = notifiedAttendanceKeys.get(dedupeKey);
    if (last && last.val === dedupeVal && (Date.now() - last.time < 12000)) {
        return;
    }
    notifiedAttendanceKeys.set(dedupeKey, { val: dedupeVal, time: Date.now() });

    const statusMap = {
        'present': 'Aanwezig',
        'absent': 'Afwezig',
        'sick': 'Ziek',
        'late': 'Te laat',
        'pending': 'Te goedkeuren'
    };

    const dateFormatted = formatDateNL(record.date);
    let title = 'Nieuwe aanwezigheid geregistreerd';
    let message = `${student.name} op ${dateFormatted}`;

    const hasNewEmployerStatus = Boolean(record.status && (!existingRecord || existingRecord.status !== record.status || (record.status === 'late' && existingRecord.minutes_late !== record.minutes_late)));
    const hasNewStudentInput = Boolean((record.student_status || (record.student_hours !== null && record.student_hours !== undefined && record.student_hours > 0)) &&
        (!existingRecord || existingRecord.student_status !== record.student_status || existingRecord.student_hours !== record.student_hours));

    if (hasNewEmployerStatus) {
        title = 'Stagebedrijf: aanwezigheid ingevuld';
        let stText = statusMap[record.status] || record.status;
        if (record.status === 'late' && record.minutes_late > 0) {
            stText = `Te laat (${record.minutes_late} min)`;
        }
        message = `${student.name}: ${stText} (${dateFormatted})`;
    } else if (hasNewStudentInput) {
        title = 'Stagiair: uren/aanwezigheid ingevuld';
        let stText = statusMap[record.student_status] || record.student_status || '';
        if (record.student_status === 'absent') {
            stText = 'Afwezig gemeld';
        } else if (record.student_status === 'sick') {
            stText = 'Ziek gemeld';
        } else if (record.student_status === 'late') {
            stText = `Te laat${record.student_hours ? ` (${record.student_hours}u)` : ''}`;
        } else if (record.student_status === 'present') {
            stText = `Aanwezig${record.student_hours ? ` (${record.student_hours}u)` : ''}`;
        } else if (record.student_hours > 0) {
            stText = `${record.student_hours} uur ingevoerd`;
        }
        message = `${student.name}: ${stText} (${dateFormatted})`;
    } else if (record.status) {
        title = 'Aanwezigheid bijgewerkt';
        let stText = statusMap[record.status] || record.status;
        if (record.status === 'late' && record.minutes_late > 0) {
            stText = `Te laat (${record.minutes_late} min)`;
        }
        message = `${student.name}: ${stText} (${dateFormatted})`;
    } else if (record.student_status || record.student_hours > 0) {
        title = 'Stagiair registratie bijgewerkt';
        let stText = statusMap[record.student_status] || (record.student_hours ? `${record.student_hours} uur` : 'Invoer');
        message = `${student.name}: ${stText} (${dateFormatted})`;
    }

    showNotification(title, message);
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

        const fetchedData = data || [];

        // Check for updates if this is not the initial load
        if (isInitialAttendanceLoaded && fetchedData.length > 0) {
            fetchedData.forEach(freshRecord => {
                const existing = allAttendance.find(a => a.student_id === freshRecord.student_id && a.date === freshRecord.date);
                const isChanged = !existing || 
                    existing.status !== freshRecord.status ||
                    existing.student_status !== freshRecord.student_status ||
                    existing.student_hours !== freshRecord.student_hours ||
                    existing.minutes_late !== freshRecord.minutes_late;

                if (isChanged) {
                    notifyAttendanceChange(freshRecord, existing);
                }
            });
        }

        allAttendance = fetchedData;
        isInitialAttendanceLoaded = true;

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
        if (dataLow) {
            if (isInitialAttendanceLoaded && dataLow.length > 0) {
                dataLow.forEach(freshRecord => {
                    const existing = allAttendance.find(a => a.student_id === freshRecord.student_id && a.date === freshRecord.date);
                    if (!existing || existing.status !== freshRecord.status || existing.student_status !== freshRecord.student_status) {
                        notifyAttendanceChange(freshRecord, existing);
                    }
                });
            }
            allAttendance = dataLow;
            isInitialAttendanceLoaded = true;
        }
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
            if (payload && payload.new && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
                notifyAttendanceChange(payload.new);
            }
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
    const filterStatus = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';

    let displayedStudents = students;
    if (filterClass) {
        displayedStudents = students.filter(s => s.class === filterClass);
    }
    if (filterStatus) {
        displayedStudents = displayedStudents.filter(student => {
            const todayAtt = allAttendance.find(a => {
                if (!a.student_id) return false;
                const dbId = String(a.student_id).trim().toLowerCase();
                const sId = String(student.id || '').trim().toLowerCase();
                const sName = String(student.name || '').trim().toLowerCase();
                return (dbId === sId || dbId === sName) && a.date === filterDate;
            });
            if (filterStatus === 'missing') {
                return !todayAtt || (!todayAtt.status && !todayAtt.student_status);
            }
            return todayAtt && (todayAtt.status === filterStatus || todayAtt.student_status === filterStatus);
        });
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
        late: 'Te laat',
        pending: 'Te bevestigen'
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
                const activeDateStr = filterDate || new Date().toISOString().split('T')[0];
                const filterDateObj = new Date(activeDateStr + 'T00:00:00');
                const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
                const dayCode = dayMap[filterDateObj.getDay()] || 'Ma';
                const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies, activeDateStr) : null;
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
                const activeDateStr = filterDate || new Date().toISOString().split('T')[0];
                const filterDateObj = new Date(activeDateStr + 'T00:00:00');
                const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
                const dayCode = dayMap[filterDateObj.getDay()] || 'Ma';
                const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies, activeDateStr) : null;
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
        const fmtPeriod = (a) => {
            if (!a.start_date && !a.end_date) return '';
            const fmt = (d) => {
                try {
                    return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
                } catch (_e) { return d; }
            };
            const txt = a.start_date && a.end_date
                ? `${fmt(a.start_date)} t/m ${fmt(a.end_date)}`
                : (a.start_date ? `vanaf ${fmt(a.start_date)}` : `t/m ${fmt(a.end_date)}`);
            return ` <span class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">📅 ${txt}</span>`;
        };
        companyHtml = assignments.map(a => {
            const daysStr = (a.days && a.days.length > 0) ? ` (${a.days.join(', ')})` : '';
            const periodStr = fmtPeriod(a);
            const cObj = companies.find(c => c.id === a.company_id);
            const contactStr = cObj && cObj.contact_person ? ` • 👤 ${cObj.contact_person}` : '';
            const phoneStr = cObj && cObj.phone ? ` • 📞 <a href="tel:${cObj.phone}" class="text-blue-600 hover:underline">${cObj.phone}</a>` : '';
            const emailStr = cObj && cObj.email ? ` • ✉️ <a href="mailto:${cObj.email}" class="text-blue-600 hover:underline">${cObj.email}</a>` : '';
            return `<div class="mb-1"><strong>📍 ${a.company_name}</strong>${daysStr}${periodStr}${contactStr}${phoneStr}${emailStr}</div>`;
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

    // Stagecontract status tonen in demo-modus
    renderDemoContractBlock(student);

    // Support for V2 modal fields
    const classEl = document.getElementById('modal-student-class');
    const yearEl = document.getElementById('modal-school-year');
    if (classEl) classEl.textContent = student.class || '-';
    if (yearEl) yearEl.textContent = student.school_year || '-';

    // Update current date label
    const filterDate = document.getElementById('filter-date').value || new Date().toISOString().split('T')[0];
    const dateObj = new Date(filterDate);
    const dateStrFormatted = dateObj.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
    const curDateLabelEl = document.getElementById('modal-current-date-label');
    if (curDateLabelEl) curDateLabelEl.textContent = `Datum: ${dateStrFormatted}`;

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

function renderDemoContractBlock(student) {
    const block = document.getElementById('modal-contract-block');
    if (block && student && window.StageAgreements) {
        window.StageAgreements.renderStudentAgreementManagerBlock(block, student, 'supervisor');
        return;
    }
    const statusText = document.getElementById('modal-contract-status-text');
    const toggleBtn = document.getElementById('modal-contract-toggle-btn');
    if (!block || !statusText || !toggleBtn || !student) return;

    const supEmail = (localStorage.getItem('supervisor_email') || '').trim().toLowerCase();
    const stuEmail = (student.email || '').trim().toLowerCase();
    const isDemoContext = supEmail === 'stage@begeleider.nl' || stuEmail === 'fake@leerling.nl' || sessionStorage.getItem('demo_unlocked') === 'true';

    if (!isDemoContext && typeof student.contract_submitted === 'undefined') {
        block.classList.add('hidden');
        return;
    }

    block.classList.remove('hidden');
    const storageKey = 'demo_contract_submitted_' + (student.id || student.name);
    const localVal = localStorage.getItem(storageKey);
    const isSubmitted = localVal ? localVal === 'true' : (student.contract_submitted === true);

    if (isSubmitted) {
        block.className = 'mb-4 p-3 rounded-xl border border-green-200 bg-green-50 flex items-center justify-between gap-2';
        statusText.className = 'text-xs font-semibold text-green-800 mt-0.5';
        statusText.textContent = '✅ Ingeleverd (Geen melding in Stagiair Portaal)';
        toggleBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-green-300 text-green-900 hover:bg-green-100 transition shrink-0 shadow-sm';
        toggleBtn.textContent = 'Zet op niet-ingeleverd';
    } else {
        block.className = 'mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between gap-2';
        statusText.className = 'text-xs font-semibold text-amber-800 mt-0.5';
        statusText.textContent = '⚠️ Nog niet ingeleverd (Melding actief in Stagiair Portaal)';
        toggleBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shrink-0 shadow-sm';
        toggleBtn.textContent = 'Markeer als ingeleverd';
    }
}

function toggleDemoContractStatus() {
    if (!currentStudent) return;
    const storageKey = 'demo_contract_submitted_' + (currentStudent.id || currentStudent.name);
    const currentVal = localStorage.getItem(storageKey) === 'true';
    const nextVal = !currentVal;
    localStorage.setItem(storageKey, nextVal ? 'true' : 'false');
    renderDemoContractBlock(currentStudent);
    showToast(nextVal ? 'Contract gemarkeerd als ingeleverd!' : 'Melding geactiveerd in Stagiair Portaal!');
}
window.toggleDemoContractStatus = toggleDemoContractStatus;

function formatDateLocal(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isSchoolHolidayDate(dateStr) {
    if (!dateStr || !Array.isArray(holidays) || holidays.length === 0) return false;
    return holidays.some(h => h.start_date && h.end_date && dateStr >= String(h.start_date).slice(0, 10) && dateStr <= String(h.end_date).slice(0, 10));
}

function getStudentStagePeriodRange(student) {
    const todayStr = formatDateLocal(new Date());
    const current = new Date();
    const day = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - day + (day === 0 ? -6 : 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    if (!student) {
        return { startDate: formatDateLocal(monday), endDate: formatDateLocal(friday) };
    }

    const assignments = typeof getStudentCompanyAssignments === 'function'
        ? getStudentCompanyAssignments(student, companies)
        : [];

    const startDates = [];
    const endDates = [];

    if (student.stage_start_date) startDates.push(String(student.stage_start_date).slice(0, 10));
    if (student.stage_end_date) endDates.push(String(student.stage_end_date).slice(0, 10));

    assignments.forEach(a => {
        if (a.start_date) startDates.push(String(a.start_date).slice(0, 10));
        if (a.end_date) endDates.push(String(a.end_date).slice(0, 10));
    });

    const studentAtt = allAttendance.filter(a => {
        if (!a.student_id) return false;
        const dbId = String(a.student_id).trim().toLowerCase();
        const sId = String(student.id || '').trim().toLowerCase();
        const sName = String(student.name || '').trim().toLowerCase();
        return dbId === sId || dbId === sName;
    });
    const attDates = studentAtt.map(a => String(a.date).slice(0, 10)).filter(Boolean).sort();

    let startDate = startDates.length > 0 ? startDates.sort()[0] : null;
    if (!startDate) {
        if (attDates.length > 0) {
            startDate = attDates[0];
        } else {
            // Standaard begin huidige schooljaar (1 september)
            const now = new Date();
            const schoolYearStartYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
            startDate = `${schoolYearStartYear}-09-01`;
        }
    }

    let endDate = endDates.length > 0 ? endDates.sort()[endDates.length - 1] : null;
    if (!endDate) {
        if (attDates.length > 0 && attDates[attDates.length - 1] > todayStr) {
            endDate = attDates[attDates.length - 1];
        } else {
            endDate = todayStr;
        }
    }

    if (endDate < startDate) {
        endDate = startDate;
    }

    return { startDate, endDate };
}

function isStudentScheduledOnDate(student, dateStr, dayCode) {
    if (!student) return false;
    const assignments = typeof getStudentCompanyAssignments === 'function'
        ? getStudentCompanyAssignments(student, companies)
        : [];
    if (assignments.length > 0) {
        const activeOnDate = assignments.filter(a =>
            typeof isAssignmentActiveOnDate === 'function' ? isAssignmentActiveOnDate(a, dateStr, student) : true
        );
        if (activeOnDate.length === 0) return false;
        return activeOnDate.some(a => !a.days || a.days.length === 0 || a.days.includes(dayCode));
    }
    if (student.stage_start_date && dateStr < String(student.stage_start_date).slice(0, 10)) return false;
    if (student.stage_end_date && dateStr > String(student.stage_end_date).slice(0, 10)) return false;
    const days = Array.isArray(student.scheduled_days) ? student.scheduled_days : [];
    return days.length === 0 || days.includes(dayCode);
}

function buildStudentStagePeriodHistoryItems(student, attendance) {
    if (!student) return attendance || [];
    const { startDate, endDate } = getStudentStagePeriodRange(student);
    const todayStr = formatDateLocal(new Date());
    // Voor de interactieve historielijst tonen we geplande stagedagen t/m vandaag (of t/m einddatum als die eerder is), plus eventuele al ingevulde toekomstige datums
    const effectiveEnd = endDate <= todayStr ? endDate : todayStr;

    const recordMap = new Map();
    (attendance || []).forEach(a => {
        if (a && a.date) {
            recordMap.set(String(a.date).slice(0, 10), a);
        }
    });

    if (startDate && effectiveEnd && startDate <= effectiveEnd) {
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const [eY, eM, eD] = effectiveEnd.split('-').map(Number);
        let cur = new Date(sY, sM - 1, sD);
        const end = new Date(eY, eM - 1, eD);
        const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
        let safety = 0;
        while (cur <= end && safety < 400) {
            const dStr = formatDateLocal(cur);
            const dayNum = cur.getDay();
            const dayCode = dayMap[dayNum];
            if (dayNum >= 1 && dayNum <= 5 && !recordMap.has(dStr)) {
                if (isStudentScheduledOnDate(student, dStr, dayCode) && !isSchoolHolidayDate(dStr)) {
                    recordMap.set(dStr, {
                        student_id: student.id,
                        date: dStr,
                        status: null,
                        student_status: null,
                        student_hours: 0,
                        is_missing: true
                    });
                }
            }
            cur.setDate(cur.getDate() + 1);
            safety++;
        }
    }

    return Array.from(recordMap.values());
}

function populateMonthFilter(attendance) {
    const monthFilter = document.getElementById('history-month-filter');
    if (!monthFilter) return;

    const allItems = currentStudent ? buildStudentStagePeriodHistoryItems(currentStudent, attendance) : attendance;

    // Get unique months from attendance & stage period data
    const months = new Set();
    allItems.forEach(a => {
        const date = new Date(a.date + 'T00:00:00');
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

    const selectedMonth = document.getElementById('history-month-filter')?.value || 'all';
    const studentAttendance = allAttendance.filter(a => {
        if (!a.student_id) return false;
        const dbId = String(a.student_id).trim().toLowerCase();
        const sId = String(currentStudent.id || '').trim().toLowerCase();
        const sName = String(currentStudent.name || '').trim().toLowerCase();
        return dbId === sId || dbId === sName;
    });

    renderAttendanceHistory(studentAttendance, selectedMonth);
}

function renderAttendanceHistory(attendance, monthFilter) {
    const historyContainer = document.getElementById('modal-attendance-history');
    if (!historyContainer) return;

    const statusFilter = document.getElementById('history-status-filter')?.value || 'all';
    let allItems = currentStudent ? buildStudentStagePeriodHistoryItems(currentStudent, attendance) : [...attendance];

    // Filter by month if not 'all'
    if (monthFilter && monthFilter !== 'all') {
        allItems = allItems.filter(a => {
            const date = new Date(a.date + 'T00:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === monthFilter;
        });
    }

    // Filter by status (all / missing / filled)
    if (statusFilter === 'missing') {
        allItems = allItems.filter(a => a.is_missing || (!a.status && !a.student_status));
    } else if (statusFilter === 'filled') {
        allItems = allItems.filter(a => !a.is_missing && (a.status || a.student_status));
    }

    // Sort by date descending (newest first)
    allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allItems.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm text-gray-500">Geen aanwezigheidsdata voor deze periode</p>';
    } else {
        historyContainer.innerHTML = allItems.map(a => {
            const isMissing = Boolean(a.is_missing || (!a.status && !a.student_status));
            const effSt = isMissing
                ? 'missing'
                : ((a.status && a.status !== 'pending' && a.status !== 'undefined' && a.status !== 'null') 
                    ? a.status 
                    : ((a.student_status && a.student_status !== 'pending' && a.student_status !== 'undefined' && a.student_status !== 'null') 
                        ? a.student_status 
                        : 'pending'));

            const statusColors = {
                present: 'bg-green-100 text-green-800',
                absent: 'bg-red-100 text-red-800',
                sick: 'bg-orange-100 text-orange-800',
                late: 'bg-yellow-100 text-yellow-800',
                pending: 'bg-amber-100 text-amber-800',
                missing: 'bg-orange-100 text-orange-700'
            };
            const statusLabels = {
                present: '✅ Aanwezig',
                absent: '❌ Afwezig',
                sick: '🤒 Ziek',
                late: `⏱️ Te laat (${a.minutes_late || 0}m)`,
                pending: '⏳ Te bevestigen',
                missing: '⚠️ Niet ingevuld'
            };

            // Format date nicely
            const date = new Date(a.date + 'T00:00:00');
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
                const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(currentStudent, dCode, companies, a.date) : null;
                if (dayComp) compName = dayComp.company_name;
            }

            if (isMissing) {
                return `
                    <div class="p-3 bg-orange-50/40 rounded-xl flex justify-between items-center border border-orange-200 hover:bg-orange-50 transition">
                        <div>
                            <span class="text-sm font-bold text-gray-800">${formattedDate}</span>
                            ${compName ? `<div class="text-[11px] text-indigo-700 font-semibold mt-0.5">📍 ${compName}</div>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">
                                ⚠️ Niet ingevuld
                            </span>
                            <button onclick="openCorrectModal('${a.date}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition">
                                + Invullen
                            </button>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="p-3 bg-gray-50 rounded-xl space-y-2 border border-blue-50">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold text-gray-800">${formattedDate}</span>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${statusColors[effSt] || 'bg-amber-100 text-amber-800'}">
                                ${statusLabels[effSt] || 'Te bevestigen'}
                            </span>
                            <button onclick="openCorrectModal('${a.date}')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition">
                                ✏️ Bewerk
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 text-[11px]">
                        ${compName ? `<div class="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">📍 ${compName}</div>` : ''}
                        ${a.student_hours ? `<div class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">Uren: ${a.student_hours}u</div>` : ''}
                        
                        ${(a.student_status && a.student_status !== 'pending' && a.student_status !== 'undefined' && a.student_status !== 'null') ? `
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
    openCorrectModal(filterDate);
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
    const dayComp = typeof getStudentCompanyForDay === 'function' ? getStudentCompanyForDay(student, dayCode, companies, date) : null;
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
        const dedupeKey = `${studentId}_${date}`;
        notifiedAttendanceKeys.set(dedupeKey, { val: `${statusToSave || ''}_${minutesLate || 0}`, time: Date.now() });
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

function populateCorrectModalForDate(dateVal) {
    if (!currentStudent || !dateVal) return;

    const hoursInput = document.getElementById('correct-hours');
    const lateInput = document.getElementById('correct-minutes-late');
    const noteInput = document.getElementById('correct-note');
    const deleteBtn = document.getElementById('correct-delete-btn');
    const empInfoBox = document.getElementById('correct-employer-info');
    const empStatusText = document.getElementById('correct-employer-status-text');

    const existingRecord = allAttendance.find(a =>
        (a.student_id === currentStudent.id || a.student_id === currentStudent.name) && a.date === dateVal
    );

    const statusLabelsRaw = { present: 'Aanwezig', absent: 'Afwezig', sick: 'Ziek', late: 'Te laat', pending: 'Te bevestigen' };
    if (empInfoBox && empStatusText) {
        if (existingRecord && existingRecord.status && existingRecord.status !== 'pending') {
            const empLabel = statusLabelsRaw[existingRecord.status] || existingRecord.status;
            const lateStr = (existingRecord.status === 'late' && existingRecord.minutes_late > 0) ? ` (${existingRecord.minutes_late} min te laat)` : '';
            empStatusText.innerHTML = `<span class="font-bold text-blue-900">${empLabel}</span>${lateStr}`;
            empInfoBox.classList.remove('hidden');
        } else {
            empStatusText.textContent = 'Nog geen invoer';
            empInfoBox.classList.add('hidden');
        }
    }

    if (existingRecord && (existingRecord.status || existingRecord.student_status)) {
        const st = (existingRecord.status && existingRecord.status !== 'pending')
            ? existingRecord.status
            : (existingRecord.student_status || 'present');
        selectCorrectStatus(st);
        if (hoursInput) hoursInput.value = existingRecord.student_hours ?? (st === 'absent' ? 0 : 8);
        if (lateInput) lateInput.value = existingRecord.minutes_late || 15;
        if (noteInput) noteInput.value = existingRecord.notes || '';
        if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
        selectCorrectStatus('present');
        if (hoursInput) hoursInput.value = 8;
        if (lateInput) lateInput.value = 15;
        if (noteInput) noteInput.value = '';
        if (deleteBtn) deleteBtn.classList.add('hidden');
    }
}

function onCorrectDateChange() {
    const dateVal = document.getElementById('correct-date')?.value;
    if (dateVal) {
        populateCorrectModalForDate(dateVal);
    }
}
window.onCorrectDateChange = onCorrectDateChange;

function openCorrectModal(targetDate) {
    if (!currentStudent) return;

    const modalName = document.getElementById('correct-modal-name');
    const modalSubtitle = document.getElementById('correct-modal-subtitle');
    const dateInput = document.getElementById('correct-date');

    if (modalName) modalName.textContent = currentStudent.name;
    if (modalSubtitle) modalSubtitle.textContent = `Vul aanwezigheid en opmerking in voor ${currentStudent.name}`;

    const dateVal = targetDate || document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = dateVal;

    populateCorrectModalForDate(dateVal);

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
    const colors = {
        present: 'border-green-400 bg-green-50 text-green-700 font-bold',
        absent: 'border-red-400 bg-red-50 text-red-700 font-bold',
        sick: 'border-orange-400 bg-orange-50 text-orange-700 font-bold',
        late: 'border-yellow-400 bg-yellow-50 text-yellow-700 font-bold'
    };
    statuses.forEach(s => {
        const btn = document.getElementById(`sup-btn-${s}`);
        if (btn) {
            if (s === status) {
                btn.className = `sup-status-btn flex items-center gap-2 p-3 rounded-xl border-2 ${colors[s] || 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'} text-sm transition scale-[1.02]`;
            } else {
                btn.className = 'sup-status-btn flex items-center gap-2 p-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm transition hover:bg-gray-50';
            }
        }
    });

    const hoursRow = document.getElementById('correct-hours-row');
    const hoursInput = document.getElementById('correct-hours');
    if (hoursRow) {
        if (status === 'absent') {
            hoursRow.classList.add('hidden');
            if (hoursInput) hoursInput.value = 0;
        } else {
            hoursRow.classList.remove('hidden');
            if (hoursInput && parseFloat(hoursInput.value) === 0) {
                hoursInput.value = 8;
            }
        }
    }

    const lateRow = document.getElementById('correct-late-row');
    if (lateRow) {
        if (status === 'late') {
            lateRow.classList.remove('hidden');
        } else {
            lateRow.classList.add('hidden');
        }
    }
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

    const hoursVal = parseFloat(document.getElementById('correct-hours')?.value) || 0;
    const minutesLate = selectedCorrectStatus === 'late'
        ? (parseInt(document.getElementById('correct-minutes-late')?.value) || 15)
        : 0;
    const noteVal = document.getElementById('correct-note')?.value?.trim() || null;

    const dateObj = new Date(dateVal + 'T00:00:00');
    const dayMap = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    const dayCode = dayMap[dateObj.getDay()] || 'Ma';
    const dayComp = typeof getStudentCompanyForDay === 'function'
        ? getStudentCompanyForDay(currentStudent, dayCode, companies, dateVal)
        : null;
    const companyId = dayComp ? dayComp.company_id : (currentStudent.company_id || null);

    const record = {
        student_id: currentStudent.id,
        date: dateVal,
        student_status: selectedCorrectStatus,
        status: selectedCorrectStatus,
        student_hours: selectedCorrectStatus === 'absent' ? 0 : hoursVal,
        minutes_late: minutesLate,
        notes: noteVal,
        employer_id: companyId,
        updated_at: new Date().toISOString()
    };

    try {
        const dedupeKey = `${currentStudent.id}_${dateVal}`;
        notifiedAttendanceKeys.set(dedupeKey, { val: `${selectedCorrectStatus || ''}_${record.student_hours || 0}_${record.minutes_late || 0}`, time: Date.now() });
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

async function deleteCorrection() {
    if (!currentStudent) return;
    const dateVal = document.getElementById('correct-date')?.value;
    if (!dateVal) return;
    if (!confirm('Weet je zeker dat je deze registratie wilt verwijderen?')) return;

    try {
        const { error } = await supabaseClient
            .from('Attendance')
            .delete()
            .eq('student_id', currentStudent.id)
            .eq('date', dateVal);

        if (error) throw error;

        showToast('Registratie verwijderd!');
        closeCorrectModal();

        await loadAttendance();
        renderDashboard();
        if (currentStudent) {
            openStudentDetail(currentStudent);
        }
    } catch (err) {
        console.error('Error deleting attendance:', err);
        alert('Fout bij verwijderen: ' + err.message);
    }
}
window.deleteCorrection = deleteCorrection;

// ========================
// PRINT OVERZICHT (Zoals bij Admin)
// ========================
let currentPrintMode = 'overview';

function getDaysInRange(startDateStr, endDateStr, selectedStudentId = 'all') {
    const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
    const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

    const start = new Date(sYear, sMonth - 1, sDay);
    const end = new Date(eYear, eMonth - 1, eDay);

    const days = [];
    let current = new Date(start);
    let count = 0;
    while (current <= end && count < 400) {
        const dayNum = current.getDay();
        const d = new Date(current);
        const dStr = formatDateLocal(d);

        const hasWeekendRecord = allAttendance.some(a => {
            const matchStudent = selectedStudentId === 'all' || String(a.student_id) === String(selectedStudentId);
            return matchStudent && a.date === dStr && (a.student_status || a.status);
        });

        const isWeekday = dayNum >= 1 && dayNum <= 5;
        if (isWeekday || hasWeekendRecord) {
            days.push({
                label: current.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'numeric' }),
                fullLabel: current.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }),
                dateStr: dStr,
                dayCode: ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][current.getDay()]
            });
        }
        current.setDate(current.getDate() + 1);
        count++;
    }
    return days;
}

function setPrintRangeToStudentStagePeriod() {
    const selectEl = document.getElementById('print-student-select');
    const selectedStudentId = selectEl ? selectEl.value : 'all';

    if (selectedStudentId && selectedStudentId !== 'all') {
        const st = students.find(s => String(s.id) === String(selectedStudentId));
        if (st) {
            const { startDate, endDate } = getStudentStagePeriodRange(st);
            document.getElementById('print-start-date').value = startDate;
            document.getElementById('print-end-date').value = endDate;
            regeneratePrintContent();
            return;
        }
    }

    // Voor 'Alle stagiairs': neem vroegste startdatum en laatste einddatum van de (gefilterde) stagiairs
    const classFilter = document.getElementById('filter-class') ? document.getElementById('filter-class').value : '';
    let pool = students;
    if (classFilter) pool = pool.filter(s => s.class === classFilter);
    if (pool.length > 0) {
        const ranges = pool.map(s => getStudentStagePeriodRange(s));
        const minStart = ranges.map(r => r.startDate).filter(Boolean).sort()[0];
        const maxEnd = ranges.map(r => r.endDate).filter(Boolean).sort().reverse()[0];
        if (minStart && maxEnd) {
            document.getElementById('print-start-date').value = minStart;
            document.getElementById('print-end-date').value = maxEnd;
            regeneratePrintContent();
        }
    }
}
window.setPrintRangeToStudentStagePeriod = setPrintRangeToStudentStagePeriod;

function onPrintStudentSelectChange() {
    const selectEl = document.getElementById('print-student-select');
    const selectedStudentId = selectEl ? selectEl.value : 'all';
    if (selectedStudentId && selectedStudentId !== 'all') {
        const st = students.find(s => String(s.id) === String(selectedStudentId));
        if (st) {
            const { startDate, endDate } = getStudentStagePeriodRange(st);
            document.getElementById('print-start-date').value = startDate;
            document.getElementById('print-end-date').value = endDate;
        }
    }
    regeneratePrintContent();
}
window.onPrintStudentSelectChange = onPrintStudentSelectChange;

function openPrintForCurrentStudent() {
    if (!currentStudent) return;
    const studentId = currentStudent.id;
    closeModal();
    openPrintSection('perStudent', studentId);
}
window.openPrintForCurrentStudent = openPrintForCurrentStudent;

function openPrintSection(mode, preselectStudentId = null) {
    const dateInput = document.getElementById('filter-date');
    const dateFilter = dateInput ? dateInput.value : '';

    currentPrintMode = mode;

    // Vul studenten dropdown in print-section
    const selectEl = document.getElementById('print-student-select');
    if (selectEl) {
        selectEl.innerHTML = '<option value="all">Alle stagiairs</option>';
        const sortedStudents = [...students].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        sortedStudents.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            selectEl.appendChild(opt);
        });
        if (preselectStudentId) {
            selectEl.value = preselectStudentId;
        }
    }

    if (preselectStudentId) {
        const st = students.find(s => String(s.id) === String(preselectStudentId));
        if (st) {
            const { startDate, endDate } = getStudentStagePeriodRange(st);
            document.getElementById('print-start-date').value = startDate;
            document.getElementById('print-end-date').value = endDate;
        }
    } else if (mode === 'perStudent') {
        // Bij Formulier per stagiair standaard de stageperiode invullen
        const classFilter = document.getElementById('filter-class') ? document.getElementById('filter-class').value : '';
        let pool = students;
        if (classFilter) pool = pool.filter(s => s.class === classFilter);
        if (pool.length > 0) {
            const ranges = pool.map(s => getStudentStagePeriodRange(s));
            const minStart = ranges.map(r => r.startDate).filter(Boolean).sort()[0];
            const maxEnd = ranges.map(r => r.endDate).filter(Boolean).sort().reverse()[0];
            document.getElementById('print-start-date').value = minStart;
            document.getElementById('print-end-date').value = maxEnd;
        }
    } else {
        // Bepaal standaard de week (maandag t/m vrijdag) op basis van de geselecteerde filterdatum of vandaag
        const current = dateFilter ? new Date(dateFilter) : new Date();
        const day = current.getDay();
        const monday = new Date(current);
        monday.setDate(current.getDate() - day + (day === 0 ? -6 : 1));
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        document.getElementById('print-start-date').value = formatDateLocal(monday);
        document.getElementById('print-end-date').value = formatDateLocal(friday);
    }

    regeneratePrintContent();

    const printSec = document.getElementById('print-section');
    const mainDash = document.getElementById('main-dashboard-container');
    const headerEl = document.querySelector('header');
    if (printSec) printSec.style.display = 'block';
    if (mainDash) mainDash.style.display = 'none';
    if (headerEl) headerEl.style.display = 'none';
}
window.openPrintSection = openPrintSection;

function closePrintSection() {
    const printSec = document.getElementById('print-section');
    const mainDash = document.getElementById('main-dashboard-container');
    const headerEl = document.querySelector('header');
    if (printSec) printSec.style.display = 'none';
    if (mainDash) mainDash.style.display = '';
    if (headerEl) headerEl.style.display = '';
}
window.closePrintSection = closePrintSection;

function regeneratePrintContent() {
    const startVal = document.getElementById('print-start-date')?.value;
    const endVal = document.getElementById('print-end-date')?.value;
    if (!startVal || !endVal) {
        alert('Selecteer een geldige start- en einddatum.');
        return;
    }

    const selectedStudentId = document.getElementById('print-student-select')?.value || 'all';
    const days = getDaysInRange(startVal, endVal, selectedStudentId);
    if (days.length === 0) {
        alert('Geen stagedagen gevonden in deze periode.');
        return;
    }

    const wStart = new Date(startVal + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const wEnd = new Date(endVal + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const periodLabel = `Periode van ${wStart} t/m ${wEnd}`;
    const printDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const schoolName = window.SCHOOL_NAME || 'StageConnectie';
    const schoolLogo = window.SCHOOL_LOGO || 'logo.png';

    // Filter studenten op basis van dropdown & klas filter
    const classFilter = document.getElementById('filter-class') ? document.getElementById('filter-class').value : '';
    let printStudents = [...students].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (classFilter) {
        printStudents = printStudents.filter(s => s.class === classFilter);
    }
    if (selectedStudentId !== 'all') {
        printStudents = printStudents.filter(s => String(s.id) === String(selectedStudentId));
    }

    const printContent = document.getElementById('print-content');
    if (!printContent) return;

    // Controleer op conflicten in de geselecteerde periode
    let conflictCount = 0;
    printStudents.forEach(student => {
        const studentRecords = allAttendance.filter(a => String(a.student_id) === String(student.id) && days.some(wd => wd.dateStr === a.date));
        studentRecords.forEach(r => {
            if (r.status && r.student_status && r.status !== r.student_status) {
                conflictCount++;
            }
        });
    });

    let conflictWarningHtml = '';
    if (conflictCount > 0) {
        conflictWarningHtml = `
            <div class="no-print" style="background:#fffbeb; border:1px solid #fef3c7; padding:16px; border-radius:12px; margin-bottom:20px; color:#b45309; font-family:'Inter', sans-serif; font-size:13px; line-height:1.5; display:flex; gap:12px; align-items:flex-start; box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);">
                <span style="font-size:20px; margin-top:2px;">⚠️</span>
                <div>
                    <strong style="font-weight:700; color:#92400e; display:block; margin-bottom:4px;">Let op: Er zijn ${conflictCount} onopgeloste conflicten in deze periode!</strong>
                    Er zijn dagen waarop de invoer van de stagiair afwijkt van de verificatie van het stagebedrijf (bijvoorbeeld: de stagiair meldt zich aanwezig, maar het stagebedrijf meldt hem afwezig). 
                    Het is belangrijk om deze conflicten eerst op te lossen in het dashboard voordat je het definitieve examendossier afdrukt.
                </div>
            </div>
        `;
    }

    if (currentPrintMode === 'overview') {
        // ── TOTAALOVERZICHT ──
        document.getElementById('print-mode-label').textContent = `Totaaloverzicht – ${periodLabel}`;
        printContent.innerHTML = conflictWarningHtml + `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e3a8a; padding-bottom:12px; margin-bottom:20px; font-family:'Inter', sans-serif;">
                <div>
                    <h1 style="font-size:20px; font-weight:800; color:#1e3a8a; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Aanwezigheidsoverzicht Stage</h1>
                    <p style="font-size:13px; color:#475569; margin:4px 0 0;">School: <strong>${schoolName}</strong></p>
                    <p style="font-size:12px; color:#475569; margin:2px 0 0;">Periode: <strong>${periodLabel}</strong></p>
                </div>
                <div style="text-align:right;">
                    <img src="${schoolLogo}" onerror="this.style.display='none'; document.getElementById('school-text-fallback-overview').style.display='block';" style="max-height:55px; max-width:180px; object-fit:contain; display:block; margin-left:auto;">
                    <span id="school-text-fallback-overview" style="display:none; font-size:15px; font-weight:700; color:#1e3a8a; text-transform:uppercase;">${schoolName}</span>
                    <p style="font-size:10px; color:#94a3b8; margin:6px 0 0;">Afdrukdatum: ${printDate}</p>
                </div>
            </div>
            <table class="print-table" style="width:100%; border-collapse:collapse; font-size:11px; font-family:'Inter', sans-serif;">
                <thead>
                    <tr>
                        <th style="text-align:left; padding:8px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700;">Naam stagiair</th>
                        <th style="text-align:left; padding:8px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700;">Stagebedrijf</th>
                        <th style="text-align:center; padding:8px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700;">Klas</th>
                        <th style="text-align:center; padding:8px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700;">Verwachte stagedagen</th>
                        <th style="text-align:center; padding:8px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700;">Totaal uren</th>
                        <th style="text-align:center; padding:8px; background:#f0fdf4; color:#15803d; border:1px solid #cbd5e1; font-weight:700;">Aanwezig</th>
                        <th style="text-align:center; padding:8px; background:#fef2f2; color:#b91c1c; border:1px solid #cbd5e1; font-weight:700;">Afwezig</th>
                        <th style="text-align:center; padding:8px; background:#fff7ed; color:#c2410c; border:1px solid #cbd5e1; font-weight:700;">Ziek</th>
                        <th style="text-align:center; padding:8px; background:#fefce8; color:#a16207; border:1px solid #cbd5e1; font-weight:700;">Te laat</th>
                        <th style="text-align:center; padding:8px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700; min-width:120px;">Handtekening docent</th>
                    </tr>
                </thead>
                <tbody>
                    ${printStudents.map(student => {
                        const assignments = typeof getStudentCompanyAssignments === 'function'
                            ? getStudentCompanyAssignments(student, companies)
                            : [];
                        let companyName = '–';
                        if (assignments.length > 0) {
                            companyName = assignments.map(a => a.company_name).join(', ');
                        } else {
                            const company = companies.find(c => String(c.id) === String(student.company_id));
                            if (company) companyName = company.company_name;
                        }

                        const studentRecords = allAttendance.filter(a => String(a.student_id) === String(student.id) && days.some(wd => wd.dateStr === a.date));
                        const stats = {
                            present: studentRecords.filter(a => a.status === 'present' || (!a.status && a.student_status === 'present')).length,
                            absent: studentRecords.filter(a => a.status === 'absent' || (!a.status && a.student_status === 'absent')).length,
                            sick: studentRecords.filter(a => a.status === 'sick' || (!a.status && a.student_status === 'sick')).length,
                            late: studentRecords.filter(a => a.status === 'late' || (!a.status && a.student_status === 'late')).length
                        };
                        const totalScheduled = days.filter(wd => isStudentScheduledOnDate(student, wd.dateStr, wd.dayCode) && !isSchoolHolidayDate(wd.dateStr)).length;
                        const totalHours = studentRecords.reduce((sum, r) => {
                            if (r.student_status === 'present' || r.student_status === 'late' || r.status === 'present' || r.status === 'late') {
                                return sum + (r.student_hours || 0);
                            }
                            return sum;
                        }, 0);

                        return `<tr>
                            <td style="text-align:left; padding:8px; border:1px solid #cbd5e1; font-weight:600; color:#1e293b;">${student.name}</td>
                            <td style="text-align:left; padding:8px; border:1px solid #cbd5e1; color:#334155;">${companyName}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; color:#334155;">${student.class || '–'}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:600; color:#334155;">${totalScheduled}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:700; color:#1e3a8a;">${totalHours} uur</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:700; color:#16a34a; background:#f0fdf4;">${stats.present}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:700; color:#dc2626; background:#fef2f2;">${stats.absent}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:700; color:#ea580c; background:#fff7ed;">${stats.sick}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:700; color:#ca8a04; background:#fefce8;">${stats.late}</td>
                            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">&nbsp;</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <div style="margin-top:20px; font-size:10px; color:#475569; border-top:1px solid #cbd5e1; padding-top:10px; display:flex; gap:15px; justify-content:center;">
                <span><strong>Legenda:</strong></span>
                <span><span style="background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; padding:1px 6px; border-radius:3px; font-weight:bold; font-size:9px;">Aanwezig</span> Present op stage</span>
                <span><span style="background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:1px 6px; border-radius:3px; font-weight:bold; font-size:9px;">Afwezig</span> Ongeoorloofd afwezig</span>
                <span><span style="background:#fff7ed; border:1px solid #fed7aa; color:#c2410c; padding:1px 6px; border-radius:3px; font-weight:bold; font-size:9px;">Ziek</span> Ziekgemeld</span>
                <span><span style="background:#fefce8; border:1px solid #fef08a; color:#a16207; padding:1px 6px; border-radius:3px; font-weight:bold; font-size:9px;">Te laat</span> Te laat gekomen</span>
            </div>
        `;
    } else {
        // ── FORMULIER PER LEERLING ──
        document.getElementById('print-mode-label').textContent = `Formulieren per stagiair – ${periodLabel}`;
        const fallbackSupervisorName = localStorage.getItem('supervisor_name') || '–';

        printContent.innerHTML = conflictWarningHtml + printStudents.map(student => {
            const assignments = typeof getStudentCompanyAssignments === 'function'
                ? getStudentCompanyAssignments(student, companies)
                : [];
            let companyName = '–';
            if (assignments.length > 0) {
                companyName = assignments.map(a => a.company_name).join(', ');
            } else {
                const company = companies.find(c => String(c.id) === String(student.company_id));
                if (company) companyName = company.company_name;
            }
            const supervisor = supervisors.find(s => String(s.id) === String(student.supervisor_id));
            const supervisorName = supervisor?.name || fallbackSupervisorName;

            const studentRecords = allAttendance.filter(a => String(a.student_id) === String(student.id) && days.some(wd => wd.dateStr === a.date));
            const stats = {
                present: studentRecords.filter(a => a.status === 'present' || (!a.status && a.student_status === 'present')).length,
                absent: studentRecords.filter(a => a.status === 'absent' || (!a.status && a.student_status === 'absent')).length,
                sick: studentRecords.filter(a => a.status === 'sick' || (!a.status && a.student_status === 'sick')).length,
                late: studentRecords.filter(a => a.status === 'late' || (!a.status && a.student_status === 'late')).length
            };
            const totalHours = studentRecords.reduce((sum, r) => {
                if (r.student_status === 'present' || r.student_status === 'late' || r.status === 'present' || r.status === 'late') {
                    return sum + (r.student_hours || 0);
                }
                return sum;
            }, 0);

            const rows = days.map(wd => {
                const record = allAttendance.find(a => String(a.student_id) === String(student.id) && a.date === wd.dateStr);
                const isHolidayDay = isSchoolHolidayDate(wd.dateStr);
                const isScheduled = isStudentScheduledOnDate(student, wd.dateStr, wd.dayCode);

                if (isHolidayDay && (!record || (!record.student_status && !record.status))) {
                    return `<tr style="background:#faf5ff; color:#7e22ce;">
                        <td style="font-weight:500;">${wd.fullLabel}</td>
                        <td colspan="4" style="text-align:center; font-style:italic; font-size:10px; color:#7e22ce; font-weight:500;">Schoolvakantie – geen stage</td>
                    </tr>`;
                }
                if (!isScheduled && (!record || (!record.student_status && !record.status))) {
                    return `<tr style="background:#f8fafc; color:#94a3b8;">
                        <td style="font-weight:500;">${wd.fullLabel}</td>
                        <td colspan="4" style="text-align:center; font-style:italic; font-size:10px; color:#94a3b8; font-weight:500;">Schooldag – geen stage</td>
                    </tr>`;
                }

                const statusLabelsFull = { present: 'Aanwezig', absent: 'Afwezig', sick: 'Ziek', late: 'Te laat', pending: 'Te bevestigen', PENDING: 'Te bevestigen', Pending: 'Te bevestigen' };
                const statusBgColors = { present: '#bbf7d0', absent: '#fecaca', sick: '#fed7aa', late: '#fef08a' };
                let ingevuldCell, ingevuldUren, werkgeverCheckCell, rowBg;
                if (record && record.student_status) {
                    const label = statusLabelsFull[record.student_status] || record.student_status;
                    const bg = statusBgColors[record.student_status] || '#f3f4f6';
                    rowBg = bg + '15';
                    ingevuldCell = `<span style="background:${bg}; padding:3px 12px; border-radius:5px; font-weight:700; font-size:11px; border:1px solid rgba(0,0,0,0.08);">${label}</span>`;
                    ingevuldUren = record.student_hours > 0
                        ? `<strong style="font-size:12px; color:#1e293b;">${record.student_hours}&thinsp;uur</strong>`
                        : `<span style="color:#94a3b8;">–</span>`;

                    if (record.status && record.status !== 'pending') {
                        const empLabel = statusLabelsFull[record.status] || record.status;
                        const lateStr = (record.status === 'late' && record.minutes_late > 0) ? ` (${record.minutes_late}m)` : '';
                        werkgeverCheckCell = `<span style="font-weight:700; color:#16a34a; font-size:12px;">☑ ${empLabel}${lateStr}</span>`;
                    } else {
                        werkgeverCheckCell = `<span style="color:#64748b; font-size:11px;">☐ Akkoord &nbsp; ☐ Corrigeer: ________</span>`;
                    }
                } else {
                    if (record && record.status && record.status !== 'pending') {
                        const empLabel = statusLabelsFull[record.status] || record.status;
                        const lateStr = (record.status === 'late' && record.minutes_late > 0) ? ` (${record.minutes_late}m)` : '';
                        const bg = statusBgColors[record.status] || '#f3f4f6';
                        rowBg = bg + '15';
                        ingevuldCell = `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Geen invoer</span>`;
                        ingevuldUren = record.student_hours > 0
                            ? `<strong style="font-size:12px; color:#1e293b;">${record.student_hours}&thinsp;uur</strong>`
                            : `<span style="color:#94a3b8;">–</span>`;
                        werkgeverCheckCell = `<span style="font-weight:700; color:#16a34a; font-size:12px;">☑ ${empLabel}${lateStr}</span>`;
                    } else {
                        rowBg = 'white';
                        ingevuldCell = `<span style="color:#94a3b8; font-size:10px; font-style:italic;">Geen invoer</span>`;
                        ingevuldUren = `<span style="display:inline-block; width:30px; border-bottom:1px solid #cbd5e1;">&nbsp;</span> uur`;
                        werkgeverCheckCell = `<span style="color:#64748b; font-size:11px;">☐ A &nbsp;&nbsp; ☐ AF &nbsp;&nbsp; ☐ Z &nbsp;&nbsp; ☐ TL</span>`;
                    }
                }
                return `<tr style="background:${rowBg};">
                    <td style="font-size:11px; font-weight:600; color:#334155;">${wd.fullLabel}</td>
                    <td style="text-align:center;">${ingevuldCell}</td>
                    <td style="text-align:center;">${ingevuldUren}</td>
                    <td style="text-align:center;">${werkgeverCheckCell}</td>
                    <td style="min-width:110px; padding:5px; text-align:center; vertical-align:middle;">
                        <div style="border:1px dashed #94a3b8; border-radius:4px; height:22px; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:9px; font-weight:500; background:#ffffff;">Paraaf</div>
                    </td>
                </tr>`;
            }).join('');

            return `
                <!-- PAGINA 1: SAMENVATTING & DECLARATIE (EXAMENDOSSIER) -->
                <div class="student-form-card" style="font-family:'Inter', sans-serif; page-break-after:always; break-after:page;">
                    <!-- School/Document Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e3a8a; padding-bottom:10px; margin-bottom:15px;">
                        <div>
                            <h1 style="font-size:20px; font-weight:800; color:#1e3a8a; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Verklaring Stage-uren & Aanwezigheid</h1>
                            <p style="font-size:11px; color:#475569; margin:4px 0 0; font-weight:500;">Officiële samenvatting ten behoeve van het examendossier</p>
                        </div>
                        <div style="text-align:right;">
                            <img src="${schoolLogo}" onerror="this.style.display='none'; document.getElementById('school-text-fallback-${student.id}-summary').style.display='block';" style="max-height:48px; max-width:180px; object-fit:contain; display:block; margin-left:auto;">
                            <span id="school-text-fallback-${student.id}-summary" style="display:none; font-size:14px; font-weight:700; color:#1e3a8a; text-transform:uppercase;">${schoolName}</span>
                        </div>
                    </div>

                    <!-- Metadata Card -->
                    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:15px; font-size:11px; color:#334155; line-height:1.5;">
                        <div>
                            <p style="margin:2px 0;"><strong>Naam stagiair:</strong> <span style="font-size:12px; font-weight:700; color:#1e293b;">${student.name}</span></p>
                            <p style="margin:2px 0;"><strong>Stagiairnummer:</strong> ${student.student_number || '–'}</p>
                            <p style="margin:2px 0;"><strong>Onderwijsinstelling:</strong> ${schoolName}</p>
                            <p style="margin:2px 0;"><strong>Schooljaar / Klas:</strong> ${student.school_year || '–'} &nbsp;/&nbsp; ${student.class || '–'}</p>
                        </div>
                        <div>
                            <p style="margin:2px 0;"><strong>Stagebedrijf:</strong> ${companyName}</p>
                            <p style="margin:2px 0;"><strong>Stagebegeleider:</strong> ${supervisorName}</p>
                            <p style="margin:2px 0;"><strong>Rapportageperiode:</strong> ${periodLabel}</p>
                            <p style="margin:2px 0;"><strong>Afdrukdatum:</strong> ${printDate}</p>
                        </div>
                    </div>

                    <!-- Stats Summary Grid -->
                    <div style="margin-top:15px; margin-bottom:20px;">
                        <h3 style="font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; margin:0 0 10px; letter-spacing:0.5px;">Geregistreerde resultaten</h3>
                        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; text-align:center;">
                            <div style="background:#eff6ff; border:1.5px solid #bfdbfe; padding:10px 4px; border-radius:8px;">
                                <span style="font-size:9px; color:#2563eb; font-weight:700; text-transform:uppercase; display:block; margin-bottom:4px;">Totaal Uren</span>
                                <div style="font-size:16px; font-weight:800; color:#1d4ed8;">${totalHours} uur</div>
                            </div>
                            <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; padding:10px 4px; border-radius:8px;">
                                <span style="font-size:9px; color:#16a34a; font-weight:700; text-transform:uppercase; display:block; margin-bottom:4px;">Aanwezig</span>
                                <div style="font-size:16px; font-weight:800; color:#15803d;">${stats.present} dgn</div>
                            </div>
                            <div style="background:#fef2f2; border:1.5px solid #fecaca; padding:10px 4px; border-radius:8px;">
                                <span style="font-size:9px; color:#dc2626; font-weight:700; text-transform:uppercase; display:block; margin-bottom:4px;">Afwezig</span>
                                <div style="font-size:16px; font-weight:800; color:#b91c1c;">${stats.absent} dgn</div>
                            </div>
                            <div style="background:#fff7ed; border:1.5px solid #fed7aa; padding:10px 4px; border-radius:8px;">
                                <span style="font-size:9px; color:#ea580c; font-weight:700; text-transform:uppercase; display:block; margin-bottom:4px;">Ziek</span>
                                <div style="font-size:16px; font-weight:800; color:#c2410c;">${stats.sick} dgn</div>
                            </div>
                            <div style="background:#fefce8; border:1.5px solid #fef08a; padding:10px 4px; border-radius:8px;">
                                <span style="font-size:9px; color:#ca8a04; font-weight:700; text-transform:uppercase; display:block; margin-bottom:4px;">Te laat</span>
                                <div style="font-size:16px; font-weight:800; color:#a16207;">${stats.late} dgn</div>
                            </div>
                        </div>
                    </div>

                    <!-- Signatures Box -->
                    <div style="margin-top:30px; border-top:2px solid #cbd5e1; padding-top:15px; page-break-inside:avoid; break-inside:avoid;">
                        <h3 style="font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; margin:0 0 10px; letter-spacing:0.5px;">Officiële ondertekening</h3>
                        <p style="font-size:11px; color:#64748b; margin-bottom:20px; line-height:1.4;">
                            Ondergetekenden verklaren hierbij dat de bovenstaande urenregistratie en aanwezigheidsstatistieken naar waarheid zijn ingevuld en gecontroleerd.
                        </p>
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; font-size:11px;">
                            <div>
                                <p style="font-weight:700; margin:0 0 25px 0; color:#334155;">1. Handtekening stagiair</p>
                                <div style="border-bottom:1px solid #94a3b8; height:20px; margin-bottom:6px;"></div>
                                <p style="color:#64748b; margin:0;">Datum: ___________________</p>
                            </div>
                            <div>
                                <p style="font-weight:700; margin:0 0 25px 0; color:#334155;">2. Handtekening praktijkopleider</p>
                                <div style="border-bottom:1px solid #94a3b8; height:20px; margin-bottom:6px;"></div>
                                <p style="color:#64748b; margin:0;">Datum: ___________________</p>
                            </div>
                            <div>
                                <p style="font-weight:700; margin:0 0 25px 0; color:#334155;">3. Handtekening stagebegeleider</p>
                                <div style="border-bottom:1px solid #94a3b8; height:20px; margin-bottom:6px;"></div>
                                <p style="color:#64748b; margin:0;">Datum: ___________________</p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer disclaimer -->
                    <div style="margin-top:40px; text-align:center; font-size:9px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:8px;">
                        Gegenereerd via StageConnectie &nbsp;·&nbsp; www.stageconnectie.nl &nbsp;·&nbsp; Document-ID: SC-DECL-${String(student.id || '').substring(0,8).toUpperCase()}
                    </div>
                </div>

                <!-- PAGINA 2: SPECIFICATIE STAGEDAGEN (DETAILOVERZICHT) -->
                <div class="student-form-card" style="font-family:'Inter', sans-serif;">
                    <!-- School/Document Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e3a8a; padding-bottom:12px; margin-bottom:20px;">
                        <div>
                            <h1 style="font-size:18px; font-weight:800; color:#1e3a8a; margin:0; text-transform:uppercase; letter-spacing:0.5px;">Specificatie Stagedagen</h1>
                            <p style="font-size:11px; color:#475569; margin:4px 0 0; font-weight:500;">Dag-tot-dag specificatie van aanwezigheid en uren</p>
                        </div>
                        <div style="text-align:right;">
                            <img src="${schoolLogo}" onerror="this.style.display='none'; document.getElementById('school-text-fallback-${student.id}-spec').style.display='block';" style="max-height:48px; max-width:180px; object-fit:contain; display:block; margin-left:auto;">
                            <span id="school-text-fallback-${student.id}-spec" style="display:none; font-size:14px; font-weight:700; color:#1e3a8a; text-transform:uppercase;">${schoolName}</span>
                        </div>
                    </div>

                    <!-- Student Info Summary line -->
                    <div style="background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:15px; font-size:11px; color:#334155; display:flex; justify-content:space-between;">
                        <span><strong>Stagiair:</strong> ${student.name}</span>
                        <span><strong>Periode:</strong> ${periodLabel}</span>
                        <span><strong>Bedrijf:</strong> ${companyName}</span>
                    </div>

                    <!-- Table -->
                    <table class="student-form-table">
                        <thead>
                            <tr>
                                <th style="min-width:130px; font-size:11px;">Stagedag</th>
                                <th style="min-width:140px; text-align:center; font-size:11px; background:#f1f5f9;">Ingevuld (app)</th>
                                <th style="min-width:70px; text-align:center; font-size:11px; background:#f1f5f9;">Uren</th>
                                <th style="min-width:140px; text-align:center; font-size:11px;">Verificatie Stagebedrijf</th>
                                <th style="min-width:100px; font-size:11px;">Handtekening/Paraaf</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    
                    <!-- Footer disclaimer -->
                    <div style="margin-top:20px; text-align:center; font-size:9px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:6px;">
                        Gegenereerd via StageConnectie &nbsp;·&nbsp; www.stageconnectie.nl &nbsp;·&nbsp; Document-ID: SC-SPEC-${String(student.id || '').substring(0,8).toUpperCase()}
                    </div>
                </div>
            `;
        }).join('');
    }
}
window.regeneratePrintContent = regeneratePrintContent;

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

    const statusLabels = { present: 'Aanwezig', absent: 'Afwezig', sick: 'Ziek', late: 'Te laat', pending: 'Te bevestigen' };

    reportContainer.innerHTML = `
        <div style="border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #1e40af; margin: 0;">📚 Klas-Aanwezigheidsoverzicht</h1>
            <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">StageConnectie – Groene Hart Pro College</p>
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

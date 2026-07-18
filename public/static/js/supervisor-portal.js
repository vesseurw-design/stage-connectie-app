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
let lastAttendanceCount = 0; // Track attendance count for notifications
let notificationsEnabled = false;

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
            .from('Stagebegeleiders')
            .select('terms_accepted_at')
            .eq('id', supervisorId)
            .single();

        if (!supervisorError && supervisor) {
            // Check gebruikersvoorwaarden akkoord (Click-wrap)
            if (!supervisor.terms_accepted_at) {
                checkTermsAcceptance('Stagebegeleiders', supervisorId, supervisor.terms_accepted_at, (acceptedAt) => {
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
    document.getElementById('supervisor-name').textContent = `Hallo, ${supervisorName}`;

    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filter-date').value = today;

    // Request notification permission
    requestNotificationPermission();

    console.log('🚀 Final Force Version 4.1: Initializing...');

    // Load initial data
    await refreshData();
    lastAttendanceCount = allAttendance.length;

    // Setup real-time and UI
    setupRealtimeSubscription();
    setupFilters();

    // Auto-refresh every 30 seconds (slower for stability)
    refreshInterval = setInterval(async () => {
        await loadAttendance();
        renderDashboard();
    }, 30000);
}

// In-app notifications don't need permission
function requestNotificationPermission() {
    notificationsEnabled = true;
    console.log('🔔 In-app notifications enabled');
}

// Show in-app notification banner
function showNotification(title, body) {
    const banner = document.getElementById('notification-banner');
    const titleEl = document.getElementById('notification-title');
    const messageEl = document.getElementById('notification-message');

    titleEl.textContent = title;
    messageEl.textContent = body;

    // Show banner
    banner.classList.remove('hidden');

    // Play sound
    playNotificationSound();

    // Auto-hide after 5 seconds
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 5000);
}

// Close notification banner
function closeNotificationBanner() {
    document.getElementById('notification-banner').classList.add('hidden');
}

// Play notification sound
function playNotificationSound() {
    // Simple beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
}

async function refreshData() {
    // We load students first because attendance depends on the student list
    // Load sequentially to avoid race conditions
    await loadCompanies();
    await loadStudents();
    await loadAttendance();

    renderDashboard();
}


async function loadCompanies() {
    const { data } = await supabaseClient.from('Bedrijven').select('*');
    companies = data || [];
}

async function loadStudents() {
    const supervisorId = localStorage.getItem('supervisor_id');
    console.log('🔍 Loading students for supervisor_id:', supervisorId);

    let data = null;
    let error = null;

    // Try capitalized first
    let { data: dataCap, error: errorCap } = await supabaseClient
        .from('Students')
        .select('*')
        .eq('supervisor_id', supervisorId);

    if (errorCap) {
        console.warn('Error loading Students (capitalized), trying lowercase...');
        // Try lowercase fallback
        const { data: dataLow, error: errorLow } = await supabaseClient
            .from('students')
            .select('*')
            .eq('supervisor_id', supervisorId);

        if (errorLow) {
            console.error('Final student load error:', errorLow);
            error = errorLow;
        } else {
            data = dataLow;
        }
    } else {
        data = dataCap;
    }

    if (error) {
        console.error('Final error loading students:', error);
        allAttendance = []; // Ensure we don't try to load attendance for 0 students
        return;
    }

    students = data || [];
    console.log('✅ Found students:', students.length, students);
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

            // Check if this is a new INSERT
            if (payload.eventType === 'INSERT') {
                const newRecord = payload.new;
                const student = students.find(s => s.name === newRecord.student_id);

                if (student) {
                    // Show notification
                    const statusLabels = {
                        present: 'Aanwezig',
                        absent: 'Afwezig',
                        sick: 'Ziek',
                        late: 'Te laat'
                    };

                    showNotification(
                        '📋 Nieuwe Aanwezigheid',
                        `${student.name} is gemarkeerd als ${statusLabels[newRecord.status] || newRecord.status}`
                    );
                }
            }

            loadAttendance().then(renderDashboard);
        })
        .subscribe();

    console.log('✅ Realtime subscription active');
}

function setupFilters() {
    ['filter-date', 'filter-status'].forEach(id => {
        document.getElementById(id).addEventListener('change', renderDashboard);
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
        filteredAttendance = filteredAttendance.filter(a => a.status === filterStatus);
    }

    // Update stats
    updateStats(filteredAttendance);

    // Render student cards
    renderStudentCards(filteredAttendance);

    // Update notification badge
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = allAttendance.filter(a => a.date === today);
    const newCount = todayAttendance.length;

    // Update badge in header (we'll add this to HTML)
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (newCount > 0) {
            badge.textContent = newCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function updateStats(attendance) {
    const today = document.getElementById('filter-date').value;
    const todayAttendance = allAttendance.filter(a => a.date === today);

    const stats = {
        total: students.length,
        present: todayAttendance.filter(a => a.status === 'present').length,
        absent: todayAttendance.filter(a => a.status === 'absent').length,
        sick: todayAttendance.filter(a => a.status === 'sick').length
    };

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-present').textContent = stats.present;
    document.getElementById('stat-absent').textContent = stats.absent;
    document.getElementById('stat-sick').textContent = stats.sick;
}

function renderStudentCards(attendance) {
    const container = document.getElementById('students-container');
    const filterDate = document.getElementById('filter-date').value;

    if (students.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-6 rounded-xl text-center">
                <p class="text-gray-500 italic">Gegevens ophalen...</p>
            </div>
        `;
        return;
    }

    container.innerHTML = students.map(student => {
        const company = companies.find(c => c.id === student.company_id);
        const todayAttendance = allAttendance.find(a => {
            if (!a.student_id) return false;
            const dbId = String(a.student_id).trim().toLowerCase();
            const sId = String(student.id || '').trim().toLowerCase();
            const sName = String(student.name || '').trim().toLowerCase();
            return (dbId === sId || dbId === sName) && a.date === filterDate;
        });

        let statusBadge = '';
        if (todayAttendance) {
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
                late: `Te laat (${todayAttendance.minutes_late}m)`
            };
            statusBadge = `
                <div class="flex flex-col items-end gap-1">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[todayAttendance.status]}">
                        ${statusLabels[todayAttendance.status]}
                    </span>
                    ${todayAttendance.student_status || todayAttendance.student_hours > 0 ? `
                        <div class="flex items-center gap-1 bg-purple-50 text-purple-700 text-[9px] px-1.5 py-0.5 rounded border border-purple-100" title="Eigen invoer student">
                            <span>🎓 ${todayAttendance.student_status ? todayAttendance.student_status.charAt(0).toUpperCase() + todayAttendance.student_status.slice(1) : ''}</span>
                            ${todayAttendance.student_hours > 0 ? `<span class="font-bold border-l border-purple-200 pl-1 ml-1">${todayAttendance.student_hours}u</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            // Show loading if allAttendance is still completely empty after first start
            const isLoading = allAttendance.length === 0;
            statusBadge = `
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500 italic">
                    ${isLoading ? 'Laden...' : 'Niet ingevuld'}
                </span>
            `;
        }

        return `
            <div class="student-card bg-white p-4 rounded-xl shadow-sm border border-gray-100" onclick='openStudentDetail(${JSON.stringify(student)})'>
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-semibold text-gray-800">${student.name}</h3>
                        <p class="text-sm text-gray-500">${student.student_number || '-'}</p>
                    </div>
                    ${statusBadge}
                </div>
                <div class="text-sm text-gray-600">
                    <p class="mb-1 text-xs px-2 py-0.5 bg-gray-100 rounded inline-block">
                        ${student.class || '-'} • ${student.school_year || '-'}
                    </p>
                    <p class="mb-1">📍 ${company?.company_name || 'Geen stagebedrijf'}</p>
                    <p>📅 ${(student.scheduled_days || []).join(', ') || 'Geen dagen'}</p>
                </div>
            </div>
        `;
    }).join('');
}

function openStudentDetail(student) {
    currentStudent = student;
    const company = companies.find(c => c.id === student.company_id);

    document.getElementById('modal-student-name').textContent = student.name;
    document.getElementById('modal-student-number').textContent = student.student_number || '-';
    document.getElementById('modal-company').textContent = company?.company_name || '-';
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
    const studentAttendance = allAttendance.filter(a => a.student_id === student.id || a.student_id === student.name);

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
                        ${a.hours_worked ? `<div class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">🏢 Stagebedrijf: ${a.hours_worked}u</div>` : ''}
                        
                        ${a.student_status || a.student_hours > 0 ? `
                            <div class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1" title="Invoer stagiair">
                                <span>🎓 Stagiair: ${a.student_status || 'ingevuld'}</span>
                                ${a.student_hours > 0 ? `<span class="font-black border-l border-purple-300 pl-1 ml-1">${a.student_hours}u</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function closeModal() {
    document.getElementById('student-modal').classList.add('hidden');
    currentStudent = null;
}

let activeEdit = null;

function editCurrentFilteredDateStatus() {
    if (!currentStudent) return;
    const filterDate = document.getElementById('filter-date').value || new Date().toISOString().split('T')[0];
    openSupervisorActionSheet(currentStudent.id, filterDate);
}
window.editCurrentFilteredDateStatus = editCurrentFilteredDateStatus;

function openSupervisorActionSheet(studentId, date) {
    activeEdit = { studentId, date };
    
    // Reset late input container
    document.getElementById('late-input-container').classList.add('hidden');
    document.getElementById('supervisor-late-minutes').value = 15;

    // Show modal & overlay
    document.getElementById('action-overlay').classList.remove('hidden');
    const sheet = document.getElementById('action-sheet');
    sheet.classList.remove('hidden');
    setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
}
window.openSupervisorActionSheet = openSupervisorActionSheet;

function openSupervisorLateInput() {
    document.getElementById('late-input-container').classList.remove('hidden');
}
window.openSupervisorLateInput = openSupervisorLateInput;

function closeActions() {
    const sheet = document.getElementById('action-sheet');
    sheet.classList.add('translate-y-full');
    setTimeout(() => {
        sheet.classList.add('hidden');
        document.getElementById('action-overlay').classList.add('hidden');
        activeEdit = null;
    }, 300);
}
window.closeActions = closeActions;

async function saveSupervisorAttendance(status) {
    if (!activeEdit) return;

    let minutesLate = 0;
    if (status === 'late') {
        minutesLate = parseInt(document.getElementById('supervisor-late-minutes').value) || 15;
    }

    const { studentId, date } = activeEdit;
    
    // Find matching student's company (for employer_id if exists)
    const student = students.find(s => s.id === studentId);
    const companyId = student ? student.company_id : null;

    const record = {
        student_id: studentId,
        date: date,
        status: status,
        minutes_late: minutesLate,
        employer_id: companyId,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient.from('Attendance').upsert(record, { onConflict: 'student_id,date' });
        if (error) throw error;

        // Show toast
        showToast('Wijziging opgeslagen!');

        // Update local state
        const existingIdx = allAttendance.findIndex(a => a.student_id === studentId && a.date === date);
        if (existingIdx !== -1) {
            if (status === '') {
                allAttendance.splice(existingIdx, 1);
            } else {
                allAttendance[existingIdx] = { ...allAttendance[existingIdx], status, minutes_late: minutesLate };
            }
        } else if (status !== '') {
            allAttendance.push(record);
        }

        // Refresh UI
        closeActions();
        
        // Refresh student list and open modal details
        await loadAttendance();
        renderStudents();
        if (currentStudent && currentStudent.id === studentId) {
            openStudentDetail(currentStudent);
        }
    } catch (err) {
        console.error('Error saving supervisor attendance:', err);
        alert('Fout bij opslaan: ' + err.message);
    }
}
window.saveSupervisorAttendance = saveSupervisorAttendance;

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translate(-50%, 0) scale(0.9)'; 
    }, 2000);
}

// Initialize on load
init();

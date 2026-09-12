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
                            <span>🎓 ${todayAttendance.student_status === 'late' ? `Te laat (${todayAttendance.minutes_late || 0}m)` : (todayAttendance.student_status ? todayAttendance.student_status.charAt(0).toUpperCase() + todayAttendance.student_status.slice(1) : '')}</span>
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
                        ${a.student_hours ? `<div class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">🏢 Uren: ${a.student_hours}u</div>` : ''}
                        
                        ${a.student_status ? `
                            <div class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1" title="Invoer stagiair">
                                <span>🎓 Stagiair: ${a.student_status === 'late' ? `Te laat (${a.minutes_late || 0}m)` : (a.student_status === 'present' ? 'Aanwezig' : (a.student_status === 'absent' ? 'Afwezig' : (a.student_status === 'sick' ? 'Ziek' : a.student_status)))}</span>
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
    const companyId = student ? student.company_id : null;

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

    const studentAttendance = allAttendance.filter(a => a.student_id === currentStudent.id || a.student_id === currentStudent.name);

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

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '750px';
    reportContainer.style.boxSizing = 'border-box';
    reportContainer.style.padding = '24px';
    reportContainer.style.fontFamily = 'Arial, sans-serif';
    reportContainer.style.color = '#1f2937';
    reportContainer.style.position = 'fixed';
    reportContainer.style.left = '-9999px';
    reportContainer.style.top = '0';
    document.body.appendChild(reportContainer);

    const statusLabels = { present: 'Aanwezig', absent: 'Afwezig', sick: 'Ziek', late: 'Te laat' };

    reportContainer.innerHTML = `
        <div style="border-bottom: 3px solid #7e22ce; padding-bottom: 12px; margin-bottom: 16px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #6b21a8; margin: 0;">📋 Stage-Logboek & Urenoverzicht</h1>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">Officieel document – ${schoolName}</p>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <div><strong>Stagiair:</strong> ${currentStudent.name}</div>
                <div><strong>Klas:</strong> ${currentStudent.class || '-'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <div><strong>Stagebedrijf:</strong> ${companyName}</div>
                <div><strong>Schooljaar:</strong> ${currentStudent.school_year || '-'}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div><strong>Email:</strong> ${currentStudent.email || '-'}</div>
                <div><strong>Datum export:</strong> ${new Date().toLocaleDateString('nl-NL')}</div>
            </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <div style="flex: 1; background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; font-weight: bold; color: #6b21a8;">${totalHours} uur</div>
                <div style="font-size: 11px; color: #7e22ce;">Totaal Gelopen</div>
            </div>
            <div style="flex: 1; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; font-weight: bold; color: #166534;">${daysPresent} dagen</div>
                <div style="font-size: 11px; color: #15803d;">Aanwezig</div>
            </div>
            <div style="flex: 1; background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; font-weight: bold; color: #854d0e;">${daysLate}x</div>
                <div style="font-size: 11px; color: #a16207;">Te laat</div>
            </div>
            <div style="flex: 1; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 16px; font-weight: bold; color: #991b1b;">${daysAbsent + daysSick}x</div>
                <div style="font-size: 11px; color: #b91c1c;">Afwezig / Ziek</div>
            </div>
        </div>

        <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #374151;">Aanwezigheid & Dagverslagen / Notities:</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">
            <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; text-align: left;">
                    <th style="padding: 8px 10px; width: 22%; font-weight: bold;">Datum</th>
                    <th style="padding: 8px 10px; width: 15%; font-weight: bold;">Status</th>
                    <th style="padding: 8px 10px; width: 12%; font-weight: bold;">Uren</th>
                    <th style="padding: 8px 10px; width: 51%; font-weight: bold;">Werkzaamheden / Notities</th>
                </tr>
            </thead>
            <tbody>
                ${sortedAttendance.map((r, idx) => {
                    const dateObj = new Date(r.date + 'T00:00:00');
                    const dateStr = dateObj.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                    const st = r.student_status || r.status;
                    const statusStr = st === 'late' ? `Te laat (${r.minutes_late || 0}m)` : (statusLabels[st] || st || '-');
                    const noteText = r.notes || '';
                    return `
                        <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb; page-break-inside: avoid;">
                            <td style="padding: 8px 10px; font-weight: bold; vertical-align: top; line-height: 1.4;">${dateStr}</td>
                            <td style="padding: 8px 10px; vertical-align: top; line-height: 1.4;">${statusStr}</td>
                            <td style="padding: 8px 10px; vertical-align: top; line-height: 1.4;">${r.student_hours || 0} u</td>
                            <td style="padding: 8px 10px; vertical-align: top; line-height: 1.4; word-break: break-word; white-space: pre-wrap; color: ${noteText ? '#111827' : '#9ca3af'}; font-style: ${noteText ? 'normal' : 'italic'};">
                                ${noteText ? noteText.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '- Geen notitie -'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: `Stageverslag_${currentStudent.name.replace(/\s+/g, '_')}.pdf`,
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
        alert('PDF bibliotheek kon niet worden geladen.');
    }
}
window.exportSupervisorStudentPDF = exportSupervisorStudentPDF;

// Initialize on load
init();

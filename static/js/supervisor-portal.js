

let students = [];
let companies = [];
let allAttendance = [];
let currentStudent = null;
let refreshInterval = null;

// Initialize
async function init() {
    // Set supervisor name
    const supervisorName = localStorage.getItem('supervisor_name');
    if (supervisorName) {
        document.getElementById('supervisor-name').textContent = `Hallo, ${supervisorName}`;
    }

    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filter-date').value = today;

    // Load data
    await refreshData();

    // Setup real-time subscription
    setupRealtimeSubscription();

    // Setup filters
    setupFilters();

    // Auto-refresh every 10 seconds to ensure data is always fresh
    refreshInterval = setInterval(async () => {
        await loadAttendance();
        renderDashboard();
    }, 10000);
}

async function refreshData() {
    await Promise.all([
        loadCompanies(),
        loadStudents(),
        loadAttendance()
    ]);
    renderDashboard();
}


async function loadCompanies() {
    const { data } = await supabase.from('Bedrijven').select('*');
    companies = data || [];
}

async function loadStudents() {
    const supervisorId = localStorage.getItem('supervisor_id');
    console.log('🔍 Loading students for supervisor_id:', supervisorId);

    let data = null;
    let error = null;

    // Try capitalized first
    const { data: dataCap, error: errorCap } = await supabase
        .from('Students')
        .select('*')
        .eq('supervisor_id', supervisorId);

    if (errorCap) {
        console.error('Error loading students (capitalized):', errorCap);
        // Try lowercase fallback
        const { data: dataLow, error: errorLow } = await supabase
            .from('students')
            .select('*')
            .eq('supervisor_id', supervisorId);

        if (errorLow) {
            console.error('Error loading students (lowercase):', errorLow);
            error = errorLow;
        } else {
            data = dataLow;
        }
    } else {
        data = dataCap;
    }

    if (error) {
        console.error('Final error loading students:', error);
        return;
    }

    students = data || [];
    console.log('✅ Found students:', students.length, students);
}

async function loadAttendance() {
    const studentNames = students.map(s => s.name);
    console.log('🔍 Loading attendance for students:', studentNames);

    if (studentNames.length === 0) {
        console.warn('⚠️ No students found, skipping attendance load');
        allAttendance = [];
        return;
    }

    // DEBUG: Check what's actually in the Attendance table
    const { data: allData } = await supabase
        .from('Attendance')
        .select('*')
        .limit(10);
    console.log('📊 Sample of ALL attendance records in database:', allData);

    const { data, error } = await supabase
        .from('Attendance')
        .select('*')
        .in('student_id', studentNames)
        .order('date', { ascending: false });

    if (error) {
        console.error('❌ Error loading attendance:', error);
        return;
    }

    allAttendance = data || [];
    console.log('✅ Found attendance records:', allAttendance.length, allAttendance);

    if (allAttendance.length === 0 && allData && allData.length > 0) {
        console.warn('⚠️ MISMATCH: Attendance records exist but student_id does not match!');
        console.warn('Expected student names:', studentNames);
        console.warn('Actual student_ids in database:', [...new Set(allData.map(a => a.student_id))]);
    }
}

function setupRealtimeSubscription() {
    supabase
        .channel('public:Attendance')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'Attendance'
        }, (payload) => {
            console.log('Real-time update:', payload);
            loadAttendance().then(renderDashboard);
        })
        .subscribe();
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
                <p class="text-gray-500">Geen studenten toegewezen</p>
            </div>
        `;
        return;
    }

    container.innerHTML = students.map(student => {
        const company = companies.find(c => c.id === student.company_id);
        const todayAttendance = allAttendance.find(a =>
            a.student_id === student.name && a.date === filterDate
        );

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
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[todayAttendance.status]}">
                    ${statusLabels[todayAttendance.status]}
                </span>
            `;
        } else {
            statusBadge = `
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                    Geen data
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
                    <p class="mb-1">📍 ${company?.company_name || 'Geen bedrijf'}</p>
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

    // Load attendance history
    const studentAttendance = allAttendance
        .filter(a => a.student_id === student.name)
        .slice(0, 10); // Last 10 records

    const historyContainer = document.getElementById('modal-attendance-history');

    if (studentAttendance.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm text-gray-500">Geen aanwezigheidsdata</p>';
    } else {
        historyContainer.innerHTML = studentAttendance.map(a => {
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

            return `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span class="text-sm text-gray-700">${a.date}</span>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[a.status]}">
                        ${statusLabels[a.status]}
                    </span>
                </div>
            `;
        }).join('');
    }

    document.getElementById('student-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('student-modal').classList.add('hidden');
    currentStudent = null;
}

// Initialize on load
init();

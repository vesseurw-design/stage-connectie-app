// Use the Supabase client from admin-auth.js
// Use a different variable name to avoid conflict with window.supabase
const supabaseDB = window.supabaseClient || window.supabase.createClient(
    'https://vdeipnqyesduiohxvuvu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU'
);

let allAttendance = [];
let companies = [];
let students = [];
let currentUser = null;

async function checkAuth() {
    console.log('🔐 Checking authentication...');
    const { data: { session }, error } = await supabaseDB.auth.getSession();

    if (error) {
        console.error('❌ Auth error:', error);
        window.location.href = 'admin-login.html';
        return false;
    }

    if (!session) {
        console.log('⚠️ No active session, redirecting to login...');
        window.location.href = 'admin-login.html';
        return false;
    }

    currentUser = session.user;
    console.log('✅ Authenticated as:', currentUser.email);
    console.log('👤 User role:', currentUser.user_metadata?.role);

    // Verify admin role
    if (currentUser.user_metadata?.role !== 'admin') {
        console.error('❌ User is not an admin');
        alert('Je hebt geen admin rechten!');
        window.location.href = 'admin-login.html';
        return false;
    }

    return true;
}

async function init() {
    console.log('🚀 Initializing admin dashboard...');

    // First check if user is authenticated
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return; // Will redirect to login
    }

    await Promise.all([
        loadCompanies(),
        loadStudents(),
        loadAttendance()
    ]);
    setupRealtimeSubscription();
    setupFilters();
    updateDashboard();
}

async function loadCompanies() {
    console.log('📦 Loading companies...');
    const { data, error } = await supabaseDB
        .from('Bedrijven')
        .select('*');

    if (error) {
        console.error('❌ Error loading companies:', error);
        return;
    }

    companies = data || [];
    console.log('✅ Loaded companies:', companies.length);

    const filterCompany = document.getElementById('filter-company');
    companies.forEach(company => {
        filterCompany.innerHTML += `<option value="${company.id}">${company.company_name}</option>`;
    });
}

async function loadStudents() {
    console.log('👥 Loading students...');
    const { data, error } = await supabaseDB
        .from('Students')
        .select('*');

    if (error) {
        console.error('❌ Error loading students:', error);
        return;
    }

    students = data || [];
    console.log('✅ Loaded students:', students.length, students);
}

async function loadAttendance() {
    console.log('📊 Loading attendance...');
    const { data, error } = await supabaseDB
        .from('Attendance')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('❌ Error loading attendance:', error);
        return;
    }

    allAttendance = data || [];
    console.log('✅ Loaded attendance records:', allAttendance.length, allAttendance);
}

function setupRealtimeSubscription() {
    supabaseDB
        .channel('public:Attendance')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'Attendance' },
            (payload) => {
                console.log('🔄 Real-time update:', payload);
                loadAttendance().then(updateDashboard);
            }
        )
        .subscribe();
}

function setupFilters() {
    ['filter-date', 'filter-company', 'filter-status'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateDashboard);
    });

    // Set default date to today
    document.getElementById('filter-date').valueAsDate = new Date();
}

function updateDashboard() {
    const dateFilter = document.getElementById('filter-date').value;
    const companyFilter = document.getElementById('filter-company').value;
    const statusFilter = document.getElementById('filter-status').value;

    console.log('🔍 Filtering with:', { dateFilter, companyFilter, statusFilter });

    let filtered = allAttendance;

    if (dateFilter) {
        filtered = filtered.filter(a => a.date === dateFilter);
    }

    if (companyFilter) {
        filtered = filtered.filter(a => a.employer_id === companyFilter);
    }

    if (statusFilter) {
        filtered = filtered.filter(a => a.status === statusFilter);
    }

    console.log('📋 Filtered attendance:', filtered.length, filtered);

    updateStats(filtered);
    renderTable(filtered);
}

function updateStats(attendance) {
    const stats = {
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        sick: attendance.filter(a => a.status === 'sick').length,
        late: attendance.filter(a => a.status === 'late').length
    };

    document.getElementById('stat-present').textContent = stats.present;
    document.getElementById('stat-absent').textContent = stats.absent;
    document.getElementById('stat-sick').textContent = stats.sick;
    document.getElementById('stat-late').textContent = stats.late;
}

function renderTable(attendance) {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';

    console.log('🎨 Rendering table with', attendance.length, 'records');

    if (attendance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    Geen aanwezigheidsgegevens gevonden voor de geselecteerde filters
                </td>
            </tr>
        `;
        return;
    }

    attendance.forEach(record => {
        console.log('📝 Processing record:', record);
        console.log('🔍 Looking for student with id:', record.student_id);

        // FIX: Search by id instead of name
        const student = students.find(s => s.id === record.student_id);
        console.log('👤 Found student:', student);

        const company = companies.find(c => c.id === record.employer_id);
        console.log('🏢 Found company:', company);

        const statusClasses = {
            'present': 'bg-green-100 text-green-800',
            'absent': 'bg-red-100 text-red-800',
            'sick': 'bg-orange-100 text-orange-800',
            'late': 'bg-yellow-100 text-yellow-800'
        };

        const statusLabels = {
            'present': 'Aanwezig',
            'absent': 'Afwezig',
            'sick': 'Ziek',
            'late': `Te laat (${record.minutes_late}m)`
        };

        const studentName = student ? student.name : `ID: ${record.student_id}`;
        const companyName = company ? company.company_name : 'Onbekend';

        const row = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${studentName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${companyName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.date}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[record.status]}">
                        ${statusLabels[record.status]}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.status === 'late' ? `${record.minutes_late} minuten` : '-'}
                </td>
            </tr>
        `;

        tbody.innerHTML += row;
    });
}

// Initialize on page load
init();
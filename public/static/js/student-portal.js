
// Student Portal Logic
const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentStudent = null;
let currentStatus = '';

async function init() {
    const email = localStorage.getItem('student_email');
    if (!email) {
        window.location.href = 'student-login.html';
        return;
    }

    try {
        console.log('🔍 Fetching student for email:', email);
        const { data: student, error: studentError } = await supabaseClient
            .from('Students')
            .select('*')
            .eq('email', email)
            .single();

        if (studentError || !student) {
            console.error('Error fetching student:', studentError);
            alert('Kon je gegevens niet laden. Log opnieuw in.');
            logout();
            return;
        }
        currentStudent = student;

        if (currentStudent.company_id) {
            const { data: company } = await supabaseClient
                .from('Bedrijven')
                .select('company_name')
                .eq('id', currentStudent.company_id)
                .single();
            if (company) currentStudent.Bedrijven = company;
        }

        renderHeader();

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

        const { data: attendance } = await supabaseClient
            .from('Attendance')
            .select('student_status, student_hours')
            .eq('student_id', currentStudent.id)
            .eq('date', today)
            .single();

        if (attendance) {
            selectStatus(attendance.student_status);
            document.getElementById('hours-worked').value = attendance.student_hours || 0;
        } else {
            const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
            const todayName = dayNames[new Date().getDay()];
            if (currentStudent.scheduled_days && currentStudent.scheduled_days.includes(todayName)) {
                document.getElementById('hours-worked').value = 8;
            }
        }

        loadHistory();
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

    } catch (err) {
        console.error('Init error:', err);
    }
}

function renderHeader() {
    document.getElementById('student-name').textContent = `Hoi ${currentStudent.name.split(' ')[0]}!`;
    const company = currentStudent.Bedrijven?.company_name || 'Geen bedrijf gekoppeld';
    document.getElementById('student-info').textContent = `${company} • ${currentStudent.student_number || ''}`;
}

function selectStatus(status) {
    currentStatus = status;
    // Reset buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50', 'border-orange-500', 'bg-orange-50', 'border-yellow-500', 'bg-yellow-50');
        btn.classList.add('border-gray-100', 'bg-gray-50');
    });

    // Highlight selected
    const btn = document.getElementById(`btn-${status}`);
    if (btn) {
        btn.classList.remove('border-gray-100', 'bg-gray-50');
        if (status === 'present') btn.classList.add('border-green-500', 'bg-green-50');
        else if (status === 'absent') btn.classList.add('border-red-500', 'bg-red-50');
        else if (status === 'sick') btn.classList.add('border-orange-500', 'bg-orange-50');
        else if (status === 'late') btn.classList.add('border-yellow-500', 'bg-yellow-50');
    }
}

async function saveReporting() {
    if (!currentStatus) {
        alert('Kies eerst een status (aanwezig, afwezig, etc.)');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const hours = parseFloat(document.getElementById('hours-worked').value) || 0;

    const btnSave = document.getElementById('btn-save');
    btnSave.disabled = true;
    btnSave.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>';

    try {
        console.log('💾 Saving to "Attendance" table (Upper case)...');
        const { error } = await supabaseClient.from('Attendance').upsert({
            student_id: currentStudent.id,
            date: today,
            student_status: currentStatus,
            student_hours: hours,
            updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,date' });

        if (error) {
            console.error('❌ Database error:', error);
            throw new Error(`Database fout: ${error.message} (Code: ${error.code})`);
        }

        showToast();
        loadHistory();

    } catch (err) {
        console.error('Save error:', err);
        alert('Oeps! ' + err.message);
    } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Opslaan';
    }
}

async function loadHistory() {
    const { data: history, error } = await supabaseClient
        .from('Attendance')
        .select('*')
        .eq('student_id', currentStudent.id)
        .order('date', { ascending: false })
        .limit(10);

    if (error) return;

    const container = document.getElementById('attendance-history');
    if (history.length === 0) {
        container.innerHTML = '<p class="p-6 text-center text-gray-400 italic">Nog geen activiteit gevonden.</p>';
        return;
    }

    const icons = { 'present': '✅', 'absent': '❌', 'late': '⏱️' };
    const label = { 'present': 'Aanwezig', 'absent': 'Afwezig', 'late': 'Te laat' };

    container.innerHTML = history.map(item => `
        <div class="p-4 flex justify-between items-center">
            <div>
                <p class="font-bold text-gray-800">${new Date(item.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                <p class="text-xs text-gray-500">${icons[item.student_status] || '❓'} ${label[item.student_status] || 'Geen eigen invoer'}</p>
            </div>
            <div class="text-right">
                <p class="font-black text-purple-600">${item.student_hours || 0}u</p>
            </div>
        </div>
    `).join('');
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    toast.style.pointerEvents = 'auto';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
    }, 2000);
}

function logout() {
    supabaseClient.auth.signOut();
    localStorage.removeItem('stageconnect_student_session');
    localStorage.removeItem('student_email');
    window.location.href = 'student-login.html';
}

init();

const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentWeekOffset = 0;
let students = [];
let supervisors = [];
let currentCompany = null;
let activeCell = null;

async function init() {
    try {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) { window.location.href = 'index.html'; return; }

        const { data: companies, error: companyError } = await supabase.from('Bedrijven').select('*').eq('email', userEmail);

        if (companyError || !companies.length) {
            console.error('Company fetch error or empty:', companyError);
            if (userEmail !== 'test@test.nl') {
                document.getElementById('company-name').textContent = 'Niet gevonden';
                document.getElementById('supervisor-select').innerHTML = '<option>Geen toegang</option>';
                document.getElementById('students-grid').innerHTML = '<div class="p-12 text-center text-red-500 font-bold">Geen bedrijfsprofiel gevonden. Controleer of u bent ingelogd met het juiste emailadres of neem contact op met de beheerder.</div>';
                // alert('Geen bedrijf gevonden voor dit emailadres.'); 
                return;
            }
            currentCompany = { id: 'demo-company', company_name: 'Demo Bedrijf' };
        } else {
            currentCompany = companies[0];
        }

        document.getElementById('company-name').textContent = currentCompany.company_name;

        await loadStudents();
        await loadSupervisors(); // Load supervisors after students
        updateWeekDisplay();
        await loadAttendance();

    } catch (err) {
        console.error('Init error:', err);
        document.getElementById('students-grid').innerHTML = `
            <div class="p-8 text-center">
                <div class="text-red-500 font-bold mb-2">Er is een fout opgetreden bij het laden.</div>
                <div class="text-sm text-gray-500">${err.message || 'Onbekende fout'}</div>
                <button onclick="window.location.reload()" class="mt-4 text-blue-600 hover:text-blue-800 underline">Probeer opnieuw</button>
            </div>
        `;
    }
}

async function loadStudents() {
    let { data, error } = await supabase.from('Students').select('*');

    // Fallback to lowercase 'students' if uppercase fails
    if (error) {
        const { data: dataLow, error: errorLow } = await supabase.from('students').select('*');
        if (!errorLow) {
            data = dataLow;
            error = null;
        } else {
            // Keep original error if both fail
            console.warn('Both Students and students table fetch failed');
        }
    }

    if (error || !data) {
        console.error('Error loading students:', error);
        throw new Error('Kon studenten niet laden: ' + (error?.message || 'Onbekende fout'));
    }

    if (currentCompany.id === 'demo-company') {
        students = data.slice(0, 3);
    } else {
        students = data.filter(s =>
            s.company_id === currentCompany.id ||
            s.companyId === currentCompany.id ||
            (s.company_name && s.company_name === currentCompany.company_name)
        );
    }
}

async function loadSupervisors() {
    // Get unique supervisor IDs from our students
    const supervisorIds = [...new Set(students.map(s => s.supervisor_id).filter(id => id))];

    if (supervisorIds.length === 0) {
        document.getElementById('supervisor-select').innerHTML = '<option>Geen begeleider</option>';
        return;
    }

    // Try creating table name variants to handle case sensitivity
    const { data: dataCap, error: errorCap } = await supabase
        .from('Stagebegeleiders')
        .select('*')
        .in('id', supervisorIds);

    let fetchedSupervisors = [];

    if (errorCap) {
        const { data: dataLow } = await supabase
            .from('stagebegeleiders')
            .select('*')
            .in('id', supervisorIds);
        fetchedSupervisors = dataLow || [];
    } else {
        fetchedSupervisors = dataCap || [];
    }

    supervisors = fetchedSupervisors;
    populateSupervisorDropdown();
}

function populateSupervisorDropdown() {
    const select = document.getElementById('supervisor-select');
    select.innerHTML = '';

    if (supervisors.length === 0) {
        select.innerHTML = '<option>Geen begeleider gevonden</option>';
        updateSupervisorInfo();
        return;
    }

    supervisors.forEach(sup => {
        const option = document.createElement('option');
        option.value = sup.id;
        option.textContent = sup.name;
        select.appendChild(option);
    });

    // Automatically select the first one
    if (supervisors.length > 0) {
        select.value = supervisors[0].id;
        updateSupervisorInfo();
    }
}

function updateSupervisorInfo() {
    const select = document.getElementById('supervisor-select');
    const actionsContainer = document.getElementById('supervisor-actions');
    const selectedId = select.value;
    const supervisor = supervisors.find(s => s.id === selectedId);

    actionsContainer.innerHTML = '';

    if (!supervisor) return;

    // Phone Button (Always valid if phone exists)
    if (supervisor.phone) {
        const phoneBtn = document.createElement('a');
        phoneBtn.href = `tel:${supervisor.phone}`;
        phoneBtn.className = 'flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-sm transition';
        phoneBtn.innerHTML = `
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            <span>${supervisor.phone}</span>
        `;
        actionsContainer.appendChild(phoneBtn);

        // WhatsApp Button (Only if enabled)
        if (supervisor.whatsapp_enabled) {
            // Clean phone number for WA link (remove non-digits)
            const waNumber = supervisor.phone.replace(/[^0-9]/g, '');
            const waBtn = document.createElement('a');
            waBtn.href = `https://wa.me/${waNumber}`;
            waBtn.target = '_blank';
            waBtn.className = 'flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl shadow-md transition ml-2';
            waBtn.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.374-5.03c0-5.429 4.421-9.988 9.925-9.988 2.651 0 5.145 1.032 7.02 2.906 1.874 1.874 2.905 4.368 2.905 7.019 0 5.432-4.427 9.851-9.967 9.725z"></path></svg>
                <span>WhatsApp</span>
            `;
            actionsContainer.appendChild(waBtn);
        }
    } else {
        actionsContainer.innerHTML = '<span class="text-sm text-gray-500 italic">Geen contactgegevens beschikbaar</span>';
    }
}

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getWeekDate(offsetDays) {
    const today = new Date();
    const monday = getMonday(today);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + offsetDays);
    return targetDate.toISOString().split('T')[0];
}

function updateWeekDisplay() {
    const monday = new Date(getWeekDate(0));
    const friday = new Date(getWeekDate(4));

    const oneJan = new Date(monday.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((monday - oneJan) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((monday.getDay() + 1 + numberOfDays) / 7);

    document.getElementById('current-week-label').textContent = `Week ${weekNum}`;
    const options = { month: 'short', day: 'numeric' };
    document.getElementById('current-date-range').textContent = `${monday.toLocaleDateString('nl-NL', options)} - ${friday.toLocaleDateString('nl-NL', options)}`;

    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    days.forEach((day, index) => {
        const date = new Date(getWeekDate(index));
        document.getElementById(`date-${day}`).textContent = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' });
    });
}

async function loadAttendance() {
    const container = document.getElementById('students-grid');

    const weekDates = [0, 1, 2, 3, 4].map(i => getWeekDate(i));
    const studentNames = students.map(s => s.name);

    if (studentNames.length === 0) { renderGrid([]); return; }

    const { data: attendanceData, error } = await supabase
        .from('Attendance')
        .select('*')
        .in('student_id', studentNames)
        .in('date', weekDates);

    renderGrid(attendanceData || []);
}

function renderGrid(existingAttendance) {
    const container = document.getElementById('students-grid');
    container.innerHTML = '';

    if (students.length === 0) {
        container.innerHTML = '<div class="p-12 text-center text-gray-500">Geen studenten gevonden voor dit bedrijf.</div>';
        return;
    }

    students.forEach(student => {
        const row = document.createElement('div');
        row.className = 'week-grid mb-1';

        const nameCell = document.createElement('div');
        nameCell.className = 'week-cell student-name pl-6 bg-white rounded-xl shadow-sm border border-gray-200 justify-start';
        nameCell.innerHTML = `<div><div class="text-gray-900 font-black text-sm uppercase tracking-wide">${student.name}</div><div class="text-xs text-blue-600 font-bold mt-0.5">${student.student_number || ''}</div></div>`;
        row.appendChild(nameCell);

        const dayMap = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

        [0, 1, 2, 3, 4].forEach(dayIndex => {
            const dateStr = getWeekDate(dayIndex);

            const dayCode = dayMap[dayIndex];
            const isScheduled = !student.scheduled_days || student.scheduled_days.length === 0 || student.scheduled_days.includes(dayCode);

            const cell = document.createElement('div');

            if (!isScheduled) {
                cell.className = 'week-cell cursor-default opacity-0';
                cell.style.pointerEvents = 'none';
                cell.innerHTML = '';
            } else {
                const record = existingAttendance.find(a => a.student_id === student.name && a.date === dateStr);
                const status = record ? record.status : '';
                const minutesLate = record ? record.minutes_late : 0;

                // Strong permanent border for empty cells
                cell.className = 'week-cell bg-white rounded-xl shadow-sm border-2 transition-all duration-150 transform';

                // CRITICAL: Add data attributes so saveWeek can find these cells
                cell.dataset.studentId = student.name;
                cell.dataset.date = dateStr;

                cell.onclick = () => openActionSheet(student.name, dateStr, cell);

                // Content will set the border colors
                updateCellContent(cell, status, minutesLate);

                // Hover effect: just scale and blue border for all interactable cells
                cell.classList.add('hover:border-blue-400');
                cell.classList.add('hover:-translate-y-0.5');
            }

            row.appendChild(cell);
        });

        container.appendChild(row);
    });
}

function updateCellContent(cell, status, minutesLate) {
    const icons = { 'present': '✅', 'absent': '❌', 'sick': '🤒', 'late': '⏱️', '': '' };

    // Explicit placeholder '+' if empty
    const content = status ? icons[status] : '<span class="text-gray-300 text-3xl font-black">+</span>';

    cell.innerHTML = `<div class="status-badge ${status || 'empty'}">${content}</div>`;

    if (status === 'late' && minutesLate > 0) {
        cell.innerHTML += `<div class="late-minutes">${minutesLate}m</div>`;
    }

    // Reset specific borders
    cell.classList.remove('border-gray-300', 'border-gray-100', 'border-green-400', 'border-red-400', 'border-orange-400', 'border-yellow-400');

    if (status) {
        // Active Status Coloring
        if (status === 'present') cell.classList.add('border-green-400');
        else if (status === 'absent') cell.classList.add('border-red-400');
        else if (status === 'sick') cell.classList.add('border-orange-400');
        else if (status === 'late') cell.classList.add('border-yellow-400');

        cell.classList.add('shadow-md');
    } else {
        // Empty State: Gray border = visible box
        cell.classList.add('border-gray-300');
        cell.classList.remove('shadow-md');
    }

    // Store data
    cell.dataset.status = status;
    cell.dataset.minutes = minutesLate;
}

function openActionSheet(studentId, date, element) {
    activeCell = { studentId, date, element };
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    sheet.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.getElementById('late-input-container').classList.add('hidden');
    setTimeout(() => { sheet.classList.remove('translate-y-full'); }, 10);
}

function closeActions() {
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    sheet.classList.add('translate-y-full');
    setTimeout(() => { sheet.classList.add('hidden'); overlay.classList.add('hidden'); }, 300);
}

function setStatus(status) {
    if (!activeCell) return;
    updateCellContent(activeCell.element, status, 0);
    closeActions();
}

function showLateInput() {
    document.getElementById('late-input-container').classList.remove('hidden');
    document.getElementById('minute-slider').value = 15;
    updateMinuteDisplay();
}

function hideLateInput() {
    document.getElementById('late-input-container').classList.add('hidden');
}

function updateMinuteDisplay() {
    const val = document.getElementById('minute-slider').value;
    document.getElementById('minute-display').textContent = val;
}

function adjustMinutes(delta) {
    const slider = document.getElementById('minute-slider');
    let val = parseInt(slider.value) + delta;
    if (val < 5) val = 5;
    if (val > 120) val = 120;
    slider.value = val;
    updateMinuteDisplay();
}

function confirmLate() {
    if (!activeCell) return;
    const minutes = document.getElementById('minute-slider').value;
    updateCellContent(activeCell.element, 'late', minutes);
    closeActions();
}

async function saveWeek() {
    const cells = document.querySelectorAll('.week-cell[data-student-id]');
    console.log('💾 Saving week - found cells:', cells.length);

    const updates = [];
    cells.forEach(cell => {
        const status = cell.dataset.status;
        if (status) {
            updates.push({
                student_id: cell.dataset.studentId,
                date: cell.dataset.date,
                status: status,
                employer_id: currentCompany.id,
                minutes_late: status === 'late' ? parseInt(cell.dataset.minutes) : 0
            });
        }
    });

    console.log('💾 Attendance records to save:', updates.length, updates);

    if (updates.length === 0) {
        console.warn('⚠️ No attendance data to save');
        showToast();
        return;
    }

    const { error } = await supabase.from('Attendance').upsert(updates, { onConflict: 'student_id,date' });
    if (error) {
        console.error('❌ Save error:', error);
        alert('Fout bij opslaan: ' + error.message);
    } else {
        console.log('✅ Attendance saved successfully!');
        showToast();
    }
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translate(-50%, 0) scale(0.9)'; }, 2000);
}

function logout() {
    localStorage.removeItem('stageconnect_session');
    localStorage.removeItem('user_email');
    window.location.href = 'index.html';
}

init();

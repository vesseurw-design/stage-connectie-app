const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentWeekOffset = 0; // Fixed to current week
let students = [];
let currentCompany = null;
let activeCell = null; 

async function init() {
    try {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) { window.location.href = 'index.html'; return; }

        const { data: companies, error: companyError } = await supabase.from('Bedrijven').select('*').eq('email', userEmail);
            
        if (companyError || !companies.length) {
            if(userEmail !== 'test@test.nl') { alert('Geen bedrijf gevonden voor dit emailadres.'); return; }
            currentCompany = { id: 'demo-company', company_name: 'Demo Bedrijf' };
        } else {
            currentCompany = companies[0];
        }
        
        document.getElementById('company-name').textContent = currentCompany.company_name;

        await loadStudents();
        updateWeekDisplay(); // Just sets label for current week
        await loadAttendance();

    } catch (err) { console.error('Init error:', err); }
}

async function loadStudents() {
    const { data, error } = await supabase.from('Students').select('*');
    if (error) { console.error('Error loading students:', error); return; }

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

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
  return new Date(d.setDate(diff));
}

function getWeekDate(offsetDays) {
    const today = new Date();
    // Offset is effectively 0 for "Current Week Only"
    // today.setDate(today.getDate() + (currentWeekOffset * 7)); 
    // We removed nav, so offset is always 0.
    const monday = getMonday(today);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + offsetDays);
    return targetDate.toISOString().split('T')[0];
}

function updateWeekDisplay() {
    const monday = new Date(getWeekDate(0));
    const friday = new Date(getWeekDate(4));
    
    // Label
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

// Nav functions removed (changeWeek)

async function loadAttendance() {
    const container = document.getElementById('students-grid');
    // container.innerHTML = '<div class="p-12 text-center text-gray-500 font-bold">Laden...</div>'; 
    // Optimization: don't wipe layout on reload if possible, but simplest is to redraw.
    
    const weekDates = [0,1,2,3,4].map(i => getWeekDate(i));
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
        row.className = 'week-grid mb-1'; // row spacing via mb
        
        // Name Cell - Styled like a card header
        const nameCell = document.createElement('div');
        nameCell.className = 'week-cell student-name pl-6 bg-white rounded-xl shadow-sm border border-gray-200 justify-start'; 
        nameCell.innerHTML = `<div><div class="text-gray-900 font-black text-sm uppercase tracking-wide">${student.name}</div><div class="text-xs text-blue-600 font-bold mt-0.5">${student.student_number || ''}</div></div>`;
        row.appendChild(nameCell);
        
        // Days
        const dayMap = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
        
        [0, 1, 2, 3, 4].forEach(dayIndex => {
            const dateStr = getWeekDate(dayIndex);
            
            const dayCode = dayMap[dayIndex];
            const isScheduled = !student.scheduled_days || student.scheduled_days.length === 0 || student.scheduled_days.includes(dayCode);

            const cell = document.createElement('div');
            
            if (!isScheduled) {
                // INVISIBLE
                cell.className = 'week-cell cursor-default opacity-0'; 
                cell.style.pointerEvents = 'none';
                cell.innerHTML = ''; 
            } else {
                // ACTIVE CARD
                // High contrast: White bg, Border, Shadow
                const record = existingAttendance.find(a => a.student_id === student.name && a.date === dateStr);
                const status = record ? record.status : '';
                const minutesLate = record ? record.minutes_late : 0;
                
                cell.className = 'week-cell bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-blue-300 transition-all duration-150 transform hover:-translate-y-0.5';
                // We use inline style for border color of active status vs empty? 
                // Let's keep it simple: border-white default, hover blue.
                // Or maybe border-gray-100?
                cell.classList.add('border-gray-100');
                
                cell.onclick = () => openActionSheet(student.name, dateStr, cell);
                
                cell.dataset.status = status;
                cell.dataset.minutes = minutesLate;
                cell.dataset.studentId = student.name;
                cell.dataset.date = dateStr;
                
                updateCellContent(cell, status, minutesLate);
            }
            
            row.appendChild(cell);
        });
        
        container.appendChild(row);
    });
}

function updateCellContent(cell, status, minutesLate) {
    const icons = { 'present': '✅', 'absent': '❌', 'sick': '🤒', 'late': '⏱️', '': '' };
    
    // Icon larger
    cell.innerHTML = `<div class="status-badge ${status || 'empty'}">${icons[status] || '<span class="text-gray-200 text-3xl font-black">+</span>'}</div>`;
    // If empty, show a big subtle + sign? user said "lastig te zien". A + indicates "add here"
    
    if (status === 'late' && minutesLate > 0) {
        cell.innerHTML += `<div class="late-minutes">${minutesLate}m</div>`;
    }
    
    // Visual feedback for filled cells
    if (status) {
        cell.classList.remove('border-gray-100');
        cell.classList.add('border-blue-200'); // Highlight filled cards slightly
        cell.classList.add('shadow-md');
    } else {
        cell.classList.remove('border-blue-200');
        cell.classList.remove('shadow-md');
        cell.classList.add('border-gray-100');
    }

    // Store data
    cell.dataset.status = status;
    cell.dataset.minutes = minutesLate;
}

// Action sheet logic unchanged mostly...
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

    if (updates.length === 0) { showToast(); return; }
    
    const { error } = await supabase.from('Attendance').upsert(updates, { onConflict: 'student_id,date' });
    if (error) { console.error('Save error:', error); alert('Fout bij opslaan: ' + error.message); } 
    else { showToast(); }
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

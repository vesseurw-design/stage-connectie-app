// Student Portal Logic
const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentStudent = null;
let holidays = [];
let activeCell = null; // { date, element }
let isSaving = false;

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

        // Check gebruikersvoorwaarden akkoord (Click-wrap)
        if (!currentStudent.terms_accepted_at) {
            checkTermsAcceptance('Students', currentStudent.id, currentStudent.terms_accepted_at, (acceptedAt) => {
                currentStudent.terms_accepted_at = acceptedAt;
                continueStudentInit();
            });
            return;
        }

        await continueStudentInit();
    } catch (err) {
        console.error('Init error:', err);
    }
}

async function continueStudentInit() {
    try {
        if (currentStudent.company_id) {
            const { data: company } = await supabaseClient
                .from('Bedrijven')
                .select('company_name, phone, contact_person')
                .eq('id', currentStudent.company_id)
                .single();
            if (company) {
                currentStudent.Bedrijven = company;
                // Toon telefoonnummer in header
                if (company.phone) {
                    const phoneBlock = document.getElementById('company-phone-block');
                    const phoneLink = document.getElementById('company-phone-link');
                    const phoneText = document.getElementById('company-phone-text');
                    if (phoneBlock && phoneLink && phoneText) {
                        phoneText.textContent = `Bel stagebedrijf: ${company.phone}`;
                        phoneLink.href = `tel:${company.phone}`;
                        phoneBlock.classList.remove('hidden');
                    }
                    // Toon ook in afwezigheidsmodal
                    const absentBlock = document.getElementById('absent-phone-block');
                    const absentLink = document.getElementById('absent-phone-link');
                    if (absentBlock && absentLink) {
                        absentLink.textContent = `Bel stagebedrijf (${company.phone})`;
                        absentLink.href = `tel:${company.phone}`;
                        absentBlock.classList.remove('hidden');
                    }
                }
            }
        }

        renderHeader();

        // Load holidays
        const { data: fetchedHolidays } = await supabaseClient.from('Vakanties').select('*');
        if (fetchedHolidays) holidays = fetchedHolidays;

        updateWeekDisplay();
        updateNavigationButtons();
        await loadAttendance();

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');
    } catch (err) {
        console.error('continueStudentInit error:', err);
    }
}

function renderHeader() {
    document.getElementById('student-name').textContent = `Hoi ${currentStudent.name.split(' ')[0]}!`;
    const company = currentStudent.Bedrijven?.company_name || 'Geen stagebedrijf gekoppeld';
    const classInfo = currentStudent.class ? ` • Klas: ${currentStudent.class}` : '';
    document.getElementById('student-info').textContent = `${company}${classInfo}`;
}

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

let currentWeekOffset = 0;

function getWeekDate(offsetDays) {
    const today = new Date();
    const monday = getMonday(today);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + (currentWeekOffset * 7) + offsetDays);
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

function changeWeek(direction) {
    const newOffset = currentWeekOffset + direction;
    
    // Bepaal de limiet: op maandag (1) en dinsdag (2) mag je 1 week terug (-1).
    // Op andere dagen is de limiet 0 (alleen de huidige week).
    const today = new Date();
    const dayOfWeek = today.getDay();
    const maxPastWeeks = (dayOfWeek === 1 || dayOfWeek === 2) ? -1 : 0;
    
    if (newOffset < maxPastWeeks || newOffset > 0) return;
    
    currentWeekOffset = newOffset;
    updateWeekDisplay();
    loadAttendance();
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const btnPrev = document.getElementById('btn-prev-week');
    const btnNext = document.getElementById('btn-next-week');
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const maxPastWeeks = (dayOfWeek === 1 || dayOfWeek === 2) ? -1 : 0;
    
    const canGoPrev = (currentWeekOffset > maxPastWeeks);
    const canGoNext = (currentWeekOffset < 0);
    
    if (btnPrev) {
        btnPrev.disabled = !canGoPrev;
        if (!canGoPrev) {
            btnPrev.classList.add('opacity-30', 'cursor-not-allowed');
        } else {
            btnPrev.classList.remove('opacity-30', 'cursor-not-allowed');
        }
    }
    if (btnNext) {
        btnNext.disabled = !canGoNext;
        if (!canGoNext) {
            btnNext.classList.add('opacity-30', 'cursor-not-allowed');
        } else {
            btnNext.classList.remove('opacity-30', 'cursor-not-allowed');
        }
    }
}

// Make changeWeek globally accessible
window.changeWeek = changeWeek;
window.updateNavigationButtons = updateNavigationButtons;


async function loadAttendance() {
    const container = document.getElementById('student-week-row');
    container.innerHTML = '<div class="p-12 col-span-5 text-center text-gray-500 font-bold">Laden...</div>';

    const weekDates = [0, 1, 2, 3, 4].map(i => getWeekDate(i));

    const { data: attendanceData, error } = await supabaseClient
        .from('Attendance')
        .select('*')
        .eq('student_id', currentStudent.id)
        .in('date', weekDates);

    renderGrid(attendanceData || []);
}

function isHoliday(dateStr) {
    return holidays.some(h => dateStr >= h.start_date && dateStr <= h.end_date);
}

function renderGrid(existingAttendance) {
    const container = document.getElementById('student-week-row');
    container.innerHTML = '';

    const dayMap = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

    [0, 1, 2, 3, 4].forEach(dayIndex => {
        const dateStr = getWeekDate(dayIndex);
        const dayCode = dayMap[dayIndex];
        const isScheduled = !currentStudent.scheduled_days || currentStudent.scheduled_days.length === 0 || currentStudent.scheduled_days.includes(dayCode);
        const holiday = isHoliday(dateStr);

        const cell = document.createElement('div');
        
        if (holiday) {
            cell.className = 'flex flex-col items-center justify-center p-4 bg-purple-50 rounded-xl border border-purple-100 text-center min-h-[120px] shadow-sm';
            cell.innerHTML = `
                <span class="text-3xl mb-1 filter drop-shadow-sm">🏖️</span>
                <span class="text-xs font-bold text-purple-700 uppercase tracking-wider">Vakantie</span>
            `;
        } else if (!isScheduled) {
            cell.className = 'flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 text-center min-h-[120px] cursor-pointer hover:bg-gray-100 transition shadow-sm hover:-translate-y-0.5';
            cell.onclick = () => openActionSheet(dateStr, cell, true);
            cell.innerHTML = `
                <span class="text-3xl mb-1 filter drop-shadow-sm opacity-50">🏫</span>
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">School</span>
            `;
            cell.dataset.date = dateStr;
            cell.dataset.status = '';
            cell.dataset.hours = 0;
            
            // Check if there was an exception filled in
            const record = existingAttendance.find(a => a.date === dateStr);
            if (record && record.student_status) {
                updateCellContent(cell, record.student_status, record.student_hours || 0);
            }
        } else {
            const record = existingAttendance.find(a => a.date === dateStr);
            const status = record ? record.student_status : '';
            const hours = record ? record.student_hours : 0;

            cell.className = 'flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm min-h-[120px]';
            cell.dataset.date = dateStr;
            cell.onclick = () => openActionSheet(dateStr, cell, false);

            updateCellContent(cell, status, hours);
        }

        container.appendChild(cell);
    });
}

function updateCellContent(cell, status, hours) {
    const icons = { 'present': '✅', 'absent': '❌', 'sick': '🤒', 'late': '⏱️', '': '<span class="text-gray-300 text-3xl font-black">+</span>' };
    
    let content = icons[status] || icons[''];
    if (status !== '') content = `<span class="text-4xl filter drop-shadow-sm">${content}</span>`;

    cell.innerHTML = `
        <div class="mb-2">${content}</div>
        ${status ? `<span class="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">${getStatusLabel(status)}</span>` : '<span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Vul in</span>'}
        ${hours > 0 && status !== 'absent' ? `<div class="bg-purple-100 text-purple-700 text-xs font-black px-2 py-0.5 rounded shadow-sm mt-auto">${hours} uur</div>` : ''}
    `;

    // Remove old borders and colors
    cell.classList.remove('border-gray-100', 'border-gray-200', 'border-green-400', 'border-red-400', 'border-orange-400', 'border-yellow-400', 'hover:border-purple-400', 'hover:shadow-md', 'bg-gray-50', 'bg-white');
    
    cell.classList.add('bg-white');

    if (status) {
        if (status === 'present') cell.classList.add('border-green-400');
        else if (status === 'absent') cell.classList.add('border-red-400');
        else if (status === 'sick') cell.classList.add('border-orange-400');
        else if (status === 'late') cell.classList.add('border-yellow-400');
    } else {
        cell.classList.add('border-gray-200', 'hover:border-purple-400', 'hover:shadow-md');
    }

    cell.dataset.status = status;
    cell.dataset.hours = hours;
}

function getStatusLabel(status) {
    switch (status) {
        case 'present': return 'Aanwezig';
        case 'absent': return 'Afwezig';
        case 'sick': return 'Ziek';
        case 'late': return 'Te laat';
        default: return '';
    }
}

// Action Sheet Logic
function openActionSheet(dateStr, element, isUnscheduled) {
    activeCell = { date: dateStr, element: element };
    
    // Set date label
    const dateObj = new Date(dateStr);
    document.getElementById('action-date-label').textContent = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

    // Pre-fill from cell dataset
    const currentStatus = element.dataset.status || '';
    const currentHours = element.dataset.hours || (isUnscheduled ? 0 : 8);

    document.getElementById('action-hours-worked').value = currentHours;
    updateActionSheetButtons(currentStatus);

    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    sheet.classList.remove('hidden');
    overlay.classList.remove('hidden');
    setTimeout(() => { sheet.classList.remove('translate-y-full'); }, 10);
}

function closeActions() {
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    sheet.classList.add('translate-y-full');
    setTimeout(() => { sheet.classList.add('hidden'); overlay.classList.add('hidden'); }, 300);
}

function updateActionSheetButtons(status) {
    // Reset buttons
    ['present', 'absent', 'sick', 'late'].forEach(s => {
        const btn = document.getElementById(`action-btn-${s}`);
        if (btn) {
            btn.classList.remove('bg-green-50', 'border-green-200', 'text-green-700', 'bg-red-50', 'border-red-200', 'text-red-700', 'bg-orange-50', 'border-orange-200', 'text-orange-700', 'bg-yellow-50', 'border-yellow-200', 'text-yellow-700', 'border-gray-300', 'scale-[1.02]');
            btn.classList.add('bg-gray-50', 'border-gray-100', 'text-gray-700');
        }
    });

    if (status) {
        const activeBtn = document.getElementById(`action-btn-${status}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-gray-50', 'border-gray-100', 'text-gray-700');
            activeBtn.classList.add('scale-[1.02]');
            
            if (status === 'present') activeBtn.classList.add('bg-green-50', 'border-green-300', 'text-green-700');
            else if (status === 'absent') activeBtn.classList.add('bg-red-50', 'border-red-300', 'text-red-700');
            else if (status === 'sick') activeBtn.classList.add('bg-orange-50', 'border-orange-300', 'text-orange-700');
            else if (status === 'late') activeBtn.classList.add('bg-yellow-50', 'border-yellow-300', 'text-yellow-700');
        }
    }

    const hoursContainer = document.getElementById('action-hours-container');
    if (status === 'absent') {
        hoursContainer.classList.add('hidden');
        document.getElementById('action-hours-worked').value = 0;
    } else {
        hoursContainer.classList.remove('hidden');
    }
}

let pendingStatus = '';

function setStatus(status) {
    if (status === 'absent') {
        pendingStatus = 'absent';
        showAbsentModal();
    } else {
        activeCell.tempStatus = status;
        updateActionSheetButtons(status);
    }
}

function confirmAction() {
    if (!activeCell) return;
    
    let activeBtnDataset = activeCell.element.dataset.status;
    let activeBtn = activeBtnDataset ? document.getElementById(`action-btn-${activeBtnDataset}`) : null;
    const status = activeCell.tempStatus || (activeBtn && activeBtn.classList.contains('scale-[1.02]') ? activeBtnDataset : '');
    
    let finalStatus = status;
    
    ['present', 'absent', 'sick', 'late'].forEach(s => {
        const btn = document.getElementById(`action-btn-${s}`);
        if(btn && btn.classList.contains('scale-[1.02]')) {
            finalStatus = s;
        }
    });

    if (!finalStatus) {
        alert('Kies eerst een status.');
        return;
    }

    let hours = parseFloat(document.getElementById('action-hours-worked').value) || 0;
    if (finalStatus === 'absent') hours = 0;

    updateCellContent(activeCell.element, finalStatus, hours);
    closeActions();
}

function showAbsentModal() {
    const modal = document.getElementById('absent-modal');
    if (!modal) return;
    const content = document.getElementById('absent-modal-content');

    ['check-1', 'check-2', 'check-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
    ['label-check-1', 'label-check-2', 'label-check-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('border-red-400', 'bg-red-50', 'border-green-400', 'bg-green-50');
    });
    const confirmBtn = document.getElementById('confirm-absent-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.className = 'w-full bg-red-300 text-white font-bold py-3 px-4 rounded-xl transition shadow-md cursor-not-allowed opacity-60';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth; 
    modal.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
}

function updateModalButton() {
    const allChecked = ['check-1', 'check-2', 'check-3'].every(id => {
        const el = document.getElementById(id);
        return el && el.checked;
    });

    ['check-1', 'check-2', 'check-3'].forEach(id => {
        const checkbox = document.getElementById(id);
        const label = document.getElementById('label-' + id);
        if (label && checkbox) {
            if (checkbox.checked) {
                label.classList.remove('border-gray-200');
                label.classList.add('border-green-400', 'bg-green-50');
            } else {
                label.classList.remove('border-green-400', 'bg-green-50');
                label.classList.add('border-gray-200');
            }
        }
    });

    const confirmBtn = document.getElementById('confirm-absent-btn');
    if (confirmBtn) {
        if (allChecked) {
            confirmBtn.disabled = false;
            confirmBtn.className = 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-md hover:shadow-lg cursor-pointer';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.className = 'w-full bg-red-300 text-white font-bold py-3 px-4 rounded-xl transition shadow-md cursor-not-allowed opacity-60';
        }
    }
}

function closeAbsentModal() {
    const modal = document.getElementById('absent-modal');
    if (!modal) return;
    const content = document.getElementById('absent-modal-content');
    
    const allChecked = ['check-1', 'check-2', 'check-3'].every(id => document.getElementById(id) && document.getElementById(id).checked);
    
    if (allChecked && pendingStatus === 'absent') {
        activeCell.tempStatus = 'absent';
        updateActionSheetButtons('absent');
    }

    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

async function saveWeek() {
    if (isSaving) return;
    isSaving = true;

    const btnSave = document.getElementById('btn-save');
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>';

    const cells = document.querySelectorAll('#student-week-row > div[data-date]');
    const updates = [];

    cells.forEach(cell => {
        const status = cell.dataset.status;
        if (status && status !== '') {
            updates.push({
                student_id: currentStudent.id,
                date: cell.dataset.date,
                student_status: status,
                student_hours: parseFloat(cell.dataset.hours) || 0,
                updated_at: new Date().toISOString()
            });
        }
    });

    if (updates.length > 0) {
        try {
            const { error } = await supabaseClient.from('Attendance').upsert(updates, { onConflict: 'student_id,date' });
            if (error) throw error;
            
            showToast();
        } catch (err) {
            console.error('Save error:', err);
            alert('Fout bij opslaan: ' + err.message);
        }
    } else {
        showToast();
    }

    isSaving = false;
    btnSave.innerHTML = originalText;
    
    setTimeout(loadAttendance, 1000);
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translate(-50%, 0) scale(0.9)'; 
    }, 2000);
}

function logout() {
    supabaseClient.auth.signOut();
    localStorage.removeItem('stageconnect_student_session');
    localStorage.removeItem('student_email');
    window.location.href = 'student-login.html';
}

// ── GESCHIEDENIS TOGGLE ──
let historyLoaded = false;

function toggleHistory() {
    const panel = document.getElementById('attendance-history-panel');
    const chevron = document.getElementById('history-chevron');
    const isHidden = panel.classList.contains('hidden');

    if (isHidden) {
        panel.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
        if (!historyLoaded) loadAttendanceHistory();
    } else {
        panel.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
    }
}

async function loadAttendanceHistory() {
    const container = document.getElementById('attendance-history');
    container.innerHTML = '<div class="text-center text-gray-400 text-sm py-4">Laden...</div>';

    const { data, error } = await supabaseClient
        .from('Attendance')
        .select('*')
        .eq('student_id', currentStudent.id)
        .not('student_status', 'is', null)
        .order('date', { ascending: false })
        .limit(60);

    if (error || !data || data.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 text-sm py-4">Nog geen registraties gevonden.</div>';
        historyLoaded = true;
        return;
    }

    const statusConfig = {
        present: { label: 'Aanwezig', icon: '✅', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
        absent:  { label: 'Afwezig',  icon: '❌', bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800'   },
        sick:    { label: 'Ziek',     icon: '🤒', bg: 'bg-orange-50',border: 'border-orange-200',text: 'text-orange-800' },
        late:    { label: 'Te laat',  icon: '⏱️', bg: 'bg-yellow-50',border: 'border-yellow-200',text: 'text-yellow-800' },
    };

    container.innerHTML = data.map(record => {
        const cfg = statusConfig[record.student_status] || { label: record.student_status, icon: '❓', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
        const dateObj = new Date(record.date);
        const dateLabel = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const hoursStr = record.student_hours > 0 && record.student_status !== 'absent'
            ? `<span class="ml-auto text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">${record.student_hours} uur</span>`
            : '';
        return `
            <div class="flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}">
                <span class="text-xl flex-shrink-0">${cfg.icon}</span>
                <div class="flex-1 min-w-0">
                    <div class="text-xs text-gray-500 capitalize">${dateLabel}</div>
                    <div class="font-bold ${cfg.text} text-sm">${cfg.label}</div>
                </div>
                ${hoursStr}
            </div>
        `;
    }).join('');

    historyLoaded = true;
}

init();

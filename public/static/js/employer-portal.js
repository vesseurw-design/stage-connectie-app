const SUPABASE_URL = window.SUPABASE_URL || 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentWeekOffset = 0;
let students = [];
let supervisors = [];
let currentCompany = null;
let activeCell = null;
let isSaving = false;

async function init() {
    try {
        // 1. Check of het bedrijf via een directe e-maillink (?etoken=...) binnenkomt
        const urlParams = new URLSearchParams(window.location.search);
        const etoken = urlParams.get('etoken');
        const autoApproveWeek = urlParams.get('autoApproveWeek');

        if (etoken) {
            const compNameEl = document.getElementById('company-name');
            if (compNameEl) compNameEl.textContent = autoApproveWeek ? 'Bezig met 1-klik goedkeuren...' : 'Automatisch inloggen...';

            try {
                const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/create-auth-account`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    },
                    body: JSON.stringify({
                        action: 'verify-employer-token',
                        etoken: etoken,
                        autoApproveWeek: autoApproveWeek || ''
                    })
                });
                const verifyData = await verifyRes.json();
                if (verifyRes.ok && verifyData.success && verifyData.company) {
                    // Activeer direct de echte Supabase Auth sessie zonder wachtwoord
                    if (verifyData.token_hash) {
                        await supabaseClient.auth.verifyOtp({
                            token_hash: verifyData.token_hash,
                            type: 'magiclink'
                        }).catch(e => console.warn('OTP session notice:', e));
                    }

                    localStorage.setItem('stageconnect_session', 'true');
                    localStorage.setItem('user_email', verifyData.email);
                    localStorage.setItem('company_id', verifyData.company.id);
                    localStorage.setItem('company_name', verifyData.company.company_name);
                    localStorage.setItem('remember_employer_email', verifyData.email);
                    localStorage.removeItem('admin_preview_mode');
                    sessionStorage.removeItem('demo_unlocked');

                    // Als er een specifieke week is goedgekeurd, spring naar die week
                    if (verifyData.weekMonday) {
                        const targetMon = new Date(verifyData.weekMonday + 'T12:00:00');
                        const currentMon = getMonday(new Date());
                        const diffWeeks = Math.round((targetMon - currentMon) / (7 * 24 * 60 * 60 * 1000));
                        if (!isNaN(diffWeeks) && diffWeeks <= 0 && diffWeeks >= -52) {
                            currentWeekOffset = diffWeeks;
                        }
                    }

                    if (verifyData.autoApproved) {
                        const banner = document.getElementById('auto-approve-banner');
                        if (banner) {
                            const countTxt = verifyData.approvedCount > 0
                                ? `(${verifyData.approvedCount} stagedag${verifyData.approvedCount === 1 ? '' : 'en'} direct bevestigd)`
                                : '(alle geplande stagedagen van deze week staan op goedgekeurd)';
                            banner.innerHTML = `
                                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <div class="text-lg font-black text-green-900">🎉 Bedankt! Deze week is met 1 klik goedgekeurd en opgeslagen ${countTxt}.</div>
                                        <div class="text-sm text-green-800 mt-0.5">U hoeft verder niets te doen. Wilt u toch nog een dag wijzigen (bijv. Ziek of Te laat)? Klik dan hieronder op de betreffende dag.</div>
                                    </div>
                                    <button onclick="document.getElementById('auto-approve-banner').classList.add('hidden')" class="px-3 py-1.5 bg-green-200 hover:bg-green-300 text-green-900 rounded-lg text-xs font-bold shrink-0">Sluiten</button>
                                </div>
                            `;
                            banner.classList.remove('hidden');
                        }
                    }

                    // Haal etoken uit de adresbalk zodat verversen netjes werkt
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    alert(verifyData?.error || 'Deze inloglink is verlopen. Vraag op de inlogpagina een nieuwe link aan.');
                    window.location.href = 'login.html';
                    return;
                }
            } catch (tokenErr) {
                console.error('Error verifying employer token:', tokenErr);
            }
        }

        let userEmail = localStorage.getItem('user_email');
        let companyName = localStorage.getItem('company_name');
        let companyId = localStorage.getItem('company_id');

        // Check if there is an active Supabase Auth session first
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            userEmail = session.user.email;
            console.log('✅ Active Supabase session recovered for:', userEmail);

            if (userEmail !== 'test@test.nl' && userEmail !== 'test@testbedrijf.nl') {
                sessionStorage.removeItem('demo_unlocked');
                if (companyId === 'demo-company' || companyName === 'Demo Bedrijf') {
                    companyId = null;
                    companyName = null;
                    localStorage.removeItem('company_id');
                    localStorage.removeItem('company_name');
                }
            }
        }

        if (!userEmail) { window.location.href = 'login.html'; return; }

        // Show company name from localStorage immediately
        if (companyName) {
            document.getElementById('company-name').textContent = companyName;
        }

        const metaCompanyId = session?.user?.user_metadata?.company_id || session?.user?.app_metadata?.company_id || companyId;
        let companies = [];
        let companyError = null;

        if (metaCompanyId && metaCompanyId !== 'demo-company') {
            const { data, error } = await supabaseClient
                .from('Bedrijven')
                .select('*')
                .eq('id', metaCompanyId);
            if (data && data.length) {
                companies = data;
            } else {
                companyError = error;
            }
        }

        if (!companies.length) {
            const { data, error } = await supabaseClient
                .from('Bedrijven')
                .select('*')
                .ilike('email', userEmail);
            companies = data || [];
            if (error) companyError = error;
        }

        if (companyError || !companies.length) {
            console.error('Company fetch error or empty:', companyError);
            // Use localStorage data as fallback
            if (companyId && companyName) {
                currentCompany = { id: companyId, company_name: companyName };
                console.log('✅ Using company data from localStorage');
            } else if (userEmail !== 'test@test.nl' && userEmail !== 'test@testbedrijf.nl') {
                document.getElementById('company-name').textContent = 'Niet gevonden';
                document.getElementById('supervisor-select').innerHTML = '<option>Geen toegang</option>';
                document.getElementById('students-grid').innerHTML = '<div class="p-12 text-center text-red-500 font-bold">Geen stagebedrijf profiel gevonden. Controleer of u bent ingelogd met het juiste emailadres of neem contact op met de beheerder.</div>';
                return;
            } else {
                currentCompany = { id: 'demo-company', company_name: 'Demo Bedrijf' };
            }
        } else {
            currentCompany = companies[0];
            document.getElementById('company-name').textContent = currentCompany.company_name;

            // Ensure localStorage is updated
            localStorage.setItem('user_email', userEmail);
            localStorage.setItem('company_id', currentCompany.id);
            localStorage.setItem('company_name', currentCompany.company_name);
            localStorage.setItem('stageconnect_session', 'true');
        }

        // Check gebruikersvoorwaarden akkoord (Click-wrap)
        if (currentCompany && !currentCompany.terms_accepted_at && currentCompany.id !== 'demo-company') {
            if (typeof checkTermsAcceptance === 'function') {
                checkTermsAcceptance('Bedrijven', currentCompany.id, currentCompany.terms_accepted_at, (acceptedAt) => {
                    currentCompany.terms_accepted_at = acceptedAt;
                    continueEmployerInit();
                });
                return;
            }
        }

        await continueEmployerInit();
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

async function continueEmployerInit() {
    if (currentCompany?.id === 'demo-company' || currentCompany?.company_name === 'Demo Bedrijf' || currentCompany?.company_name === 'Testbedrijf' || localStorage.getItem('user_email') === 'test@testbedrijf.nl' || localStorage.getItem('user_email') === 'test@test.nl') {
        const existingDemoBanner = document.getElementById('demo-mode-banner');
        if (!existingDemoBanner) {
            const banner = document.createElement('div');
            banner.id = 'demo-mode-banner';
            banner.className = 'bg-amber-600 text-white font-bold px-4 py-3 text-center text-sm flex flex-col sm:flex-row justify-between items-center gap-2 sticky top-0 z-50 shadow-md border-b border-amber-700';
            banner.innerHTML = `
                <span>⚠️ <strong>Demo Modus Actief</strong>: U bent ingelogd in het demonstratie-account (<strong>${currentCompany?.company_name || 'Demo Bedrijf'}</strong>). Ingevulde aanwezigheid wordt <u>niet</u> opgeslagen voor uw eigen stagiairs.</span>
                <button onclick="exitDemoMode()" class="bg-amber-950 hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shadow cursor-pointer">
                    🚪 Uitloggen uit Demo & Inloggen met Eigen Account
                </button>
            `;
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }

    if (localStorage.getItem('admin_preview_mode') === 'true') {
        const existingBanner = document.getElementById('admin-preview-banner');
        if (!existingBanner) {
            const banner = document.createElement('div');
            banner.id = 'admin-preview-banner';
            banner.className = 'bg-amber-500 text-white font-bold px-4 py-2.5 text-center text-sm flex justify-between items-center sticky top-0 z-50 shadow';
            banner.innerHTML = `<span>👁️ Beheerder Voorbeeldmodus: U bekijkt het portaal als <strong>${currentCompany?.company_name || 'Werkgever'}</strong></span>
                <button onclick="localStorage.removeItem('admin_preview_mode'); window.close();" class="bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded text-xs transition">Sluit Voorbeeld</button>`;
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }
    await loadStudents();
    await loadSupervisors(); // Load supervisors after students
    updateWeekDisplay();
    updateWeekButtons();
    await loadAttendance();

    // Setup realtime subscription for live updates
    setupRealtimeSubscription();
}

function exitDemoMode() {
    localStorage.removeItem('user_email');
    localStorage.removeItem('company_id');
    localStorage.removeItem('company_name');
    localStorage.removeItem('stageconnect_session');
    sessionStorage.removeItem('demo_unlocked');
    if (window.supabaseClient) {
        window.supabaseClient.auth.signOut().catch(() => {});
    }
    window.location.href = 'login.html';
}
window.exitDemoMode = exitDemoMode;

async function loadStudents() {
    let { data, error } = await supabaseClient.from('Students').select('*');

    // Fallback to lowercase 'students' if uppercase fails
    if (error) {
        const { data: dataLow, error: errorLow } = await supabaseClient.from('students').select('*');
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
        throw new Error('Kon stagiairs niet laden: ' + (error?.message || 'Onbekende fout'));
    }

    if (currentCompany.id === 'demo-company') {
        students = data.slice(0, 3);
    } else {
        students = data.filter(s =>
            (typeof isStudentAssignedToCompany === 'function' && isStudentAssignedToCompany(s, currentCompany.id)) ||
            (s.company_assignments && Array.isArray(s.company_assignments) && s.company_assignments.some(a => (a.company_id || a.companyId) === currentCompany.id)) ||
            (s.company_id && String(s.company_id).includes(currentCompany.id)) ||
            (s.companyId && String(s.companyId).includes(currentCompany.id)) ||
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
    const { data: dataCap, error: errorCap } = await supabaseClient
        .from('stagebegeleiders')
        .select('*')
        .in('id', supervisorIds);

    let fetchedSupervisors = [];

    if (errorCap) {
        const { data: dataLow } = await supabaseClient
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

        // Find students assigned to this supervisor
        const supStudents = students.filter(s => s.supervisor_id === sup.id);
        const studentLabel = supStudents.length > 0
            ? supStudents.map(s => s.name.split(' ')[0]).join(' & ')
            : '';

        option.textContent = studentLabel ? `${sup.name} (Begeleider van ${studentLabel})` : sup.name;
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
    targetDate.setDate(monday.getDate() + offsetDays + (currentWeekOffset * 7));
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
    if (newOffset < -52 || newOffset > 0) return; // Allow going back up to 52 weeks
    currentWeekOffset = newOffset;
    
    updateWeekButtons();
    updateWeekDisplay();
    loadAttendance();
}

function updateWeekButtons() {
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    if (prevBtn) {
        prevBtn.disabled = (currentWeekOffset <= -52);
        prevBtn.style.opacity = currentWeekOffset <= -52 ? '0.5' : '1';
        prevBtn.style.cursor = currentWeekOffset <= -52 ? 'default' : 'pointer';
    }
    if (nextBtn) {
        nextBtn.disabled = (currentWeekOffset >= 0);
        nextBtn.style.opacity = currentWeekOffset >= 0 ? '0.5' : '1';
        nextBtn.style.cursor = currentWeekOffset >= 0 ? 'default' : 'pointer';
    }
}

async function loadAttendance() {
    const container = document.getElementById('students-grid');

    const weekDates = [0, 1, 2, 3, 4].map(i => getWeekDate(i));
    const studentIds = students.map(s => s.id);

    if (studentIds.length === 0) { renderGrid([]); return; }

    const { data: attendanceData, error } = await supabaseClient
        .from('Attendance')
        .select('*')
        .in('student_id', studentIds)
        .in('date', weekDates);

    renderGrid(attendanceData || []);
}

function renderGrid(existingAttendance) {
    const container = document.getElementById('students-grid');
    container.innerHTML = '';

    if (students.length === 0) {
        container.innerHTML = '<div class="p-12 text-center text-gray-500">Geen stagiairs gevonden voor dit stagebedrijf.</div>';
        updateApprovalButtonsState();
        return;
    }

    students.forEach(student => {
        const row = document.createElement('div');
        row.className = 'week-grid mb-1';

        const nameCell = document.createElement('div');
        nameCell.className = 'week-cell student-name pl-5 pr-3 py-2 bg-white rounded-xl shadow-sm border border-gray-200 justify-start';
        nameCell.dataset.studentRowId = student.id;
        nameCell.innerHTML = `
            <div class="w-full">
                <div class="text-gray-900 font-black text-sm uppercase tracking-wide leading-tight">${student.name}</div>
                <div class="text-xs text-blue-600 font-bold mt-0.5">${student.class || ''} ${student.student_number ? '• ' + student.student_number : ''}</div>
                <div class="student-quick-approve-slot mt-1.5" data-slot-student-id="${student.id}"></div>
            </div>
        `;
        row.appendChild(nameCell);

        const dayMap = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

        [0, 1, 2, 3, 4].forEach(dayIndex => {
            const dateStr = getWeekDate(dayIndex);

            const dayCode = dayMap[dayIndex];
            const isScheduled = typeof isStudentScheduledForCompany === 'function'
                ? isStudentScheduledForCompany(student, currentCompany.id, dayCode)
                : (!student.scheduled_days || student.scheduled_days.length === 0 || student.scheduled_days.includes(dayCode));

            const cell = document.createElement('div');

            if (!isScheduled) {
                cell.className = 'week-cell cursor-default opacity-0';
                cell.style.pointerEvents = 'none';
                cell.innerHTML = '';
            } else {
                const record = existingAttendance.find(a => a.student_id === student.id && a.date === dateStr);
                const status = record ? record.status : '';
                const minutesLate = record ? record.minutes_late : 0;
                const studentStatus = record ? record.student_status : '';
                const studentHours = record ? record.student_hours : 0;
                const notes = record ? (record.notes || '') : '';

                // Strong permanent border for empty cells
                cell.className = 'week-cell bg-white rounded-xl shadow-sm border-2 transition-all duration-150 transform';

                cell.dataset.studentId = student.id;
                cell.dataset.date = dateStr;

                // Employer can ALWAYS click/edit their own status
                cell.onclick = () => openActionSheet(student.id, dateStr, cell);
                cell.classList.add('hover:border-blue-400');
                cell.classList.add('hover:-translate-y-0.5');

                // Content will set the border colors
                updateCellContent(cell, status, minutesLate, studentStatus, studentHours, notes);
            }

            row.appendChild(cell);
        });

        container.appendChild(row);
    });

    updateApprovalButtonsState();
}

function updateApprovalButtonsState() {
    let totalUnapproved = 0;

    students.forEach(student => {
        const cells = document.querySelectorAll(`.week-cell[data-student-id="${student.id}"]`);
        let unapproved = 0;
        let hasStudentPending = 0;

        cells.forEach(cell => {
            const st = cell.dataset.status || '';
            const stuSt = cell.dataset.studentStatus || '';
            const stuHrs = parseFloat(cell.dataset.studentHours || 0);
            if (!st) {
                unapproved++;
                totalUnapproved++;
                if (stuSt || stuHrs > 0) hasStudentPending++;
            }
        });

        const slot = document.querySelector(`.student-quick-approve-slot[data-slot-student-id="${student.id}"]`);
        if (slot) {
            if (unapproved > 0) {
                const labelTxt = hasStudentPending > 0
                    ? `✅ Keur invoer goed (${unapproved}d)`
                    : `✅ Week Aanwezig (${unapproved}d)`;
                slot.innerHTML = `
                    <button type="button" onclick="approveStudentWeek('${student.id}')"
                        class="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer active:scale-95">
                        <span>${labelTxt}</span>
                    </button>
                `;
            } else if (cells.length > 0) {
                slot.innerHTML = `<span class="inline-block text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">✓ Week ingevuld</span>`;
            } else {
                slot.innerHTML = '';
            }
        }
    });

    const topApproveBtn = document.getElementById('approve-week-btn');
    if (topApproveBtn) {
        if (totalUnapproved > 0) {
            topApproveBtn.disabled = false;
            topApproveBtn.className = 'w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-base cursor-pointer';
            topApproveBtn.innerHTML = `<span>✅ Keur hele week met 1 klik goed (${totalUnapproved}d)</span>`;
        } else {
            topApproveBtn.disabled = false;
            topApproveBtn.className = 'w-full sm:w-auto bg-green-50 text-green-800 border-2 border-green-300 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-base';
            topApproveBtn.innerHTML = `<span>✅ Hele week is ingevuld</span>`;
        }
    }
}

function getStudentStatusLabel(st) {
    if (!st || st === 'undefined' || st === 'null') return '';
    switch (st) {
        case 'present': return 'Aanwezig';
        case 'absent': return 'Afwezig';
        case 'sick': return 'Ziek';
        case 'late': return 'Te laat';
        default: return '';
    }
}

function updateCellContent(cell, status, minutesLate, studentStatus = '', studentHours = 0, notes = '') {
    const icons = { 'present': '✅', 'absent': '❌', 'sick': '🤒', 'late': '⏱️', '': '' };

    const cleanEmployerStatus = (status && status !== 'pending' && status !== 'undefined' && status !== 'null') ? status : '';
    const cleanStudentStatus = (studentStatus && studentStatus !== 'pending' && studentStatus !== 'undefined' && studentStatus !== 'null') ? studentStatus : '';
    const hasStudentInput = Boolean(cleanStudentStatus || (studentHours && parseFloat(studentHours) > 0));

    // Reset specific borders & backgrounds
    cell.classList.remove(
        'border-gray-300', 'border-gray-100', 'border-green-400', 'border-red-400', 'border-orange-400', 'border-yellow-400', 'border-amber-400',
        'bg-amber-50/50', 'bg-green-50/80', 'bg-red-50/80', 'bg-orange-50/80', 'bg-yellow-50/80',
        'border-green-300', 'border-red-300', 'border-orange-300', 'border-yellow-300', 'border-amber-300', 'border-dashed',
        'shadow-md', 'shadow-sm'
    );

    if (cleanEmployerStatus) {
        // Employer has accorded/set status (Definitief geaccordeerd)
        const content = icons[cleanEmployerStatus] || cleanEmployerStatus;
        cell.innerHTML = `<div class="status-badge ${cleanEmployerStatus}">${content}</div>`;
        if (cleanEmployerStatus === 'late' && minutesLate > 0) {
            cell.innerHTML += `<div class="late-minutes">${minutesLate}m</div>`;
        }
        // Active Status Coloring
        if (cleanEmployerStatus === 'present') cell.classList.add('border-green-400');
        else if (cleanEmployerStatus === 'absent') cell.classList.add('border-red-400');
        else if (cleanEmployerStatus === 'sick') cell.classList.add('border-orange-400');
        else if (cleanEmployerStatus === 'late') cell.classList.add('border-yellow-400');
        cell.classList.add('shadow-md');
    } else if (hasStudentInput) {
        // Student registered attendance, but employer has NOT yet accorded -> Show light colored tile with student entry & "Te goedkeuren"!
        const studentLabel = getStudentStatusLabel(cleanStudentStatus);
        const icon = icons[cleanStudentStatus] || (cleanStudentStatus ? '📝' : '');
        const hoursText = parseFloat(studentHours) > 0 ? `${studentHours}u` : '';
        const detailText = [icon, studentLabel, hoursText].filter(Boolean).join(' ') || 'Invoer';

        let bgClass = 'bg-amber-50/70';
        let borderClass = 'border-amber-300';
        let badgeBg = 'bg-amber-100';
        let badgeBorder = 'border-amber-300';
        let badgeText = 'text-amber-800';
        let textClass = 'text-amber-900';

        if (cleanStudentStatus === 'present') {
            bgClass = 'bg-green-50/80';
            borderClass = 'border-green-300';
            badgeBg = 'bg-green-100';
            badgeBorder = 'border-green-300';
            badgeText = 'text-green-800';
            textClass = 'text-green-900';
        } else if (cleanStudentStatus === 'absent') {
            bgClass = 'bg-red-50/80';
            borderClass = 'border-red-300';
            badgeBg = 'bg-red-100';
            badgeBorder = 'border-red-300';
            badgeText = 'text-red-800';
            textClass = 'text-red-900';
        } else if (cleanStudentStatus === 'sick') {
            bgClass = 'bg-orange-50/80';
            borderClass = 'border-orange-300';
            badgeBg = 'bg-orange-100';
            badgeBorder = 'border-orange-300';
            badgeText = 'text-orange-800';
            textClass = 'text-orange-900';
        } else if (cleanStudentStatus === 'late') {
            bgClass = 'bg-yellow-50/80';
            borderClass = 'border-yellow-300';
            badgeBg = 'bg-yellow-100';
            badgeBorder = 'border-yellow-300';
            badgeText = 'text-yellow-800';
            textClass = 'text-yellow-900';
        }

        cell.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full gap-0.5 p-1">
                <span class="text-[9px] font-extrabold ${badgeText} ${badgeBg} px-1.5 py-0.5 rounded-full border ${badgeBorder} shadow-sm leading-none tracking-tight">Te goedkeuren</span>
                <span class="text-[10px] font-black ${textClass} leading-tight mt-0.5 text-center">
                    ${detailText}
                </span>
            </div>
        `;
        cell.classList.add(borderClass, bgClass, 'border-dashed', 'shadow-sm');
    } else {
        // Empty State: Gray border = visible box with +
        cell.innerHTML = `<div class="status-badge empty"><span class="text-gray-300 text-3xl font-black">+</span></div>`;
        cell.classList.add('border-gray-300');
    }

    // Small badge at bottom right for student hours if employer has accorded
    if (cleanEmployerStatus && hasStudentInput) {
        const label = getStudentStatusLabel(cleanStudentStatus);
        const titleText = label ? `Eigen invoer student: ${label}` : 'Eigen invoer student';
        cell.innerHTML += `
            <div class="absolute bottom-1 right-1 flex items-center gap-0.5 bg-purple-100 text-purple-700 text-[9px] font-black px-1 rounded shadow-sm" title="${titleText}">
                ${parseFloat(studentHours) > 0 ? `<span>${studentHours}u</span>` : ''}
            </div>
        `;
    }

    // Store data (preserve notes for DB save)
    cell.dataset.status = cleanEmployerStatus;
    cell.dataset.minutes = minutesLate || 0;
    cell.dataset.studentStatus = cleanStudentStatus;
    cell.dataset.studentHours = studentHours || 0;
    cell.dataset.notes = notes || '';
}

function openActionSheet(studentId, date, element) {
    activeCell = { studentId, date, element };
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');

    // Header info: Student Name & Formatted Date & Student Entry Hint
    const student = students.find(s => s.id === studentId);
    const studentNameElem = document.getElementById('action-student-name');
    const studentStatus = element.dataset.studentStatus || '';
    const studentHours = element.dataset.studentHours || '';
    const studentLabel = getStudentStatusLabel(studentStatus);

    let hint = student ? student.name : '';
    if (studentLabel || (studentHours && parseFloat(studentHours) > 0)) {
        const detail = [studentLabel, studentHours ? `${studentHours} uur` : ''].filter(Boolean).join(' • ');
        hint += ` (Invoer leerling: ${detail})`;
    }
    if (studentNameElem) studentNameElem.textContent = hint;

    const dateObj = new Date(date);
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const formattedDate = dateObj.toLocaleDateString('nl-NL', dateOptions);
    const dateLabelElem = document.getElementById('action-date-label');
    if (dateLabelElem) dateLabelElem.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Pre-fill hours input with student's hours or default 8
    const currentHours = parseFloat(element.dataset.studentHours) || 8;
    const hoursInput = document.getElementById('employer-hours-input');
    if (hoursInput) hoursInput.value = currentHours;

    sheet.classList.remove('hidden');
    overlay.classList.remove('hidden');
    const grid = document.getElementById('status-buttons-grid');
    if (grid) grid.classList.remove('hidden');
    document.getElementById('late-input-container').classList.add('hidden');
    setTimeout(() => { sheet.classList.remove('translate-y-full'); }, 10);
}

function adjustEmployerHours(delta) {
    const input = document.getElementById('employer-hours-input');
    if (!input) return;
    let val = parseFloat(input.value) || 0;
    val = Math.max(0, Math.min(24, val + delta));
    input.value = val;
}

function closeActions() {
    const sheet = document.getElementById('action-sheet');
    const overlay = document.getElementById('action-overlay');
    sheet.classList.add('translate-y-full');
    setTimeout(() => { 
        sheet.classList.add('hidden'); 
        overlay.classList.add('hidden'); 
        const grid = document.getElementById('status-buttons-grid');
        if (grid) grid.classList.remove('hidden');
        document.getElementById('late-input-container').classList.add('hidden');
    }, 300);
}

async function autoSaveCell(cell, customToastMsg) {
    if (!cell || !currentCompany) return;
    isSaving = true;
    const status = cell.dataset.status || null;
    const notes = cell.dataset.notes || null;
    const payload = {
        student_id: cell.dataset.studentId,
        date: cell.dataset.date,
        status: status,
        employer_id: currentCompany.id,
        minutes_late: status === 'late' ? parseInt(cell.dataset.minutes || 0) : 0,
        student_hours: parseFloat(cell.dataset.studentHours || 0),
        notes: notes
    };

    try {
        const { error } = await supabaseClient.from('Attendance').upsert([payload], { onConflict: 'student_id,date' });
        if (error) {
            console.error('❌ Auto-save error:', error);
            alert('Fout bij automatisch opslaan: ' + error.message);
        } else {
            showToast(customToastMsg || '✅ Direct opgeslagen!');
        }
    } finally {
        updateApprovalButtonsState();
        setTimeout(() => { isSaving = false; }, 1000);
    }
}

function setStatus(status) {
    if (!activeCell) return;
    const cellElem = activeCell.element;
    const notes = cellElem.dataset.notes || '';
    const studentStatus = cellElem.dataset.studentStatus || '';
    const hoursInput = document.getElementById('employer-hours-input');
    const updatedHours = hoursInput ? (parseFloat(hoursInput.value) || 0) : (parseFloat(cellElem.dataset.studentHours) || 0);
    const finalHours = (status === 'present' || status === 'late') ? updatedHours : 0;
    updateCellContent(cellElem, status, 0, studentStatus, finalHours, notes);
    closeActions();
    autoSaveCell(cellElem, status ? '✅ Direct opgeslagen!' : '🗑️ Status gewist & opgeslagen');
}

let isCustomLate = false;

function showLateInput() {
    const grid = document.getElementById('status-buttons-grid');
    if (grid) grid.classList.add('hidden');
    document.getElementById('late-input-container').classList.remove('hidden');
    document.getElementById('minute-input').value = 15;
    toggleCustomLate(false);
}

function hideLateInput() {
    document.getElementById('late-input-container').classList.add('hidden');
    const grid = document.getElementById('status-buttons-grid');
    if (grid) grid.classList.remove('hidden');
}

function toggleCustomLate(show) {
    isCustomLate = show;
    if (show) {
        document.getElementById('regular-late-input').classList.add('hidden');
        document.getElementById('custom-late-input').classList.remove('hidden');
        document.getElementById('custom-minute-input').value = 121;
        document.getElementById('custom-minute-input').focus();
    } else {
        document.getElementById('custom-late-input').classList.add('hidden');
        document.getElementById('regular-late-input').classList.remove('hidden');
        document.getElementById('minute-input').value = 15;
        document.getElementById('minute-input').focus();
    }
}

function validateMinuteInput() {
    const input = document.getElementById('minute-input');
    let val = parseInt(input.value);
    if (val > 120) {
        input.value = 120;
    } else if (val < 1) {
        input.value = 1;
    }
}

function confirmLate() {
    if (!activeCell) return;
    const cellElem = activeCell.element;
    
    let minutes;
    if (isCustomLate) {
        minutes = parseInt(document.getElementById('custom-minute-input').value);
        if (isNaN(minutes) || minutes < 121) minutes = 121;
    } else {
        minutes = parseInt(document.getElementById('minute-input').value);
        if (isNaN(minutes) || minutes < 1) minutes = 1;
        if (minutes > 120) minutes = 120;
    }
    
    const notes = cellElem.dataset.notes || '';
    const studentStatus = cellElem.dataset.studentStatus || '';
    const hoursInput = document.getElementById('employer-hours-input');
    const updatedHours = hoursInput ? (parseFloat(hoursInput.value) || 0) : (parseFloat(cellElem.dataset.studentHours) || 0);
    updateCellContent(cellElem, 'late', minutes, studentStatus, updatedHours, notes);
    closeActions();
    autoSaveCell(cellElem, '✅ Te laat geregistreerd & opgeslagen!');
}

async function approveStudentWeek(studentId) {
    const cells = document.querySelectorAll(`.week-cell[data-student-id="${studentId}"]`);
    let count = 0;
    cells.forEach(cell => {
        const currentEmpStatus = cell.dataset.status || '';
        if (!currentEmpStatus) {
            const stuStatus = cell.dataset.studentStatus || '';
            const finalStatus = ['present', 'absent', 'sick', 'late'].includes(stuStatus) ? stuStatus : 'present';
            const rawHours = parseFloat(cell.dataset.studentHours || 0);
            const finalHours = (finalStatus === 'present' || finalStatus === 'late') ? (rawHours > 0 ? rawHours : 8) : 0;
            const mins = parseInt(cell.dataset.minutes || 0);
            const notes = cell.dataset.notes || '';
            updateCellContent(cell, finalStatus, mins, stuStatus, finalHours, notes);
            count++;
        }
    });
    if (count > 0) {
        await saveWeek(`✅ ${count} stagedag${count === 1 ? '' : 'en'} met 1 klik goedgekeurd!`);
    } else {
        showToast('Alle dagen van deze stagiair zijn al goedgekeurd!');
    }
}
window.approveStudentWeek = approveStudentWeek;

async function approveEntireWeek() {
    const cells = document.querySelectorAll('.week-cell[data-student-id]');
    let count = 0;
    cells.forEach(cell => {
        const currentEmpStatus = cell.dataset.status || '';
        if (!currentEmpStatus) {
            const stuStatus = cell.dataset.studentStatus || '';
            const finalStatus = ['present', 'absent', 'sick', 'late'].includes(stuStatus) ? stuStatus : 'present';
            const rawHours = parseFloat(cell.dataset.studentHours || 0);
            const finalHours = (finalStatus === 'present' || finalStatus === 'late') ? (rawHours > 0 ? rawHours : 8) : 0;
            const mins = parseInt(cell.dataset.minutes || 0);
            const notes = cell.dataset.notes || '';
            updateCellContent(cell, finalStatus, mins, stuStatus, finalHours, notes);
            count++;
        }
    });
    if (count > 0) {
        await saveWeek(`✅ Hele week (${count} dag${count === 1 ? '' : 'en'}) met 1 klik goedgekeurd!`);
    } else {
        showToast('Alle geplande stagedagen van deze week zijn al ingevuld!');
    }
}
window.approveEntireWeek = approveEntireWeek;

async function saveWeek(customMessage) {
    isSaving = true;
    const cells = document.querySelectorAll('.week-cell[data-student-id]');
    console.log('💾 Saving week - found cells:', cells.length);

    // Collect attendance records
    const updates = [];
    cells.forEach(cell => {
        const status = cell.dataset.status;
        const notes = cell.dataset.notes || null;
        if (status || notes) {
            updates.push({
                student_id: cell.dataset.studentId,
                date: cell.dataset.date,
                status: status || null,
                employer_id: currentCompany.id,
                minutes_late: status === 'late' ? parseInt(cell.dataset.minutes || 0) : 0,
                student_hours: parseFloat(cell.dataset.studentHours || 0),
                notes: notes
            });
        }
    });

    console.log('💾 Attendance records to save:', updates.length, updates);

    // Upsert records (if any)
    if (updates.length > 0) {
        const { error } = await supabaseClient.from('Attendance').upsert(updates, { onConflict: 'student_id,date' });
        if (error) {
            console.error('❌ Save error:', error);
            alert('Fout bij opslaan: ' + error.message);
            isSaving = false;
            return;
        }
    }

    console.log('✅ Attendance saved successfully!');
    updateApprovalButtonsState();
    showToast(typeof customMessage === 'string' ? customMessage : 'Wijzigingen opgeslagen!');

    // Wait a bit before re-enabling realtime to avoid race condition
    setTimeout(() => {
        isSaving = false;
        loadAttendance(); // Reload once to sync
    }, 1500);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (msgEl && typeof msg === 'string' && msg) {
        msgEl.textContent = msg;
    } else if (msgEl) {
        msgEl.textContent = 'Wijzigingen opgeslagen!';
    }
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translate(-50%, 0) scale(0.9)'; }, 2200);
}

async function logout() {
    console.log('logout() function called!');
    try {
        console.log('Calling Supabase signOut...');
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.warn('Error signing out of Supabase:', e);
    }

    console.log('Clearing localStorage...');
    localStorage.removeItem('stageconnect_session');
    localStorage.removeItem('user_email');
    localStorage.removeItem('company_name');
    localStorage.removeItem('company_id');

    console.log('Redirecting to index.html...');
    window.location.href = 'index.html';
}
window.logout = logout;


// Setup realtime subscription for live updates across devices
function setupRealtimeSubscription() {
    supabaseClient
        .channel('public:Attendance')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'Attendance'
        }, (payload) => {
            console.log('🔄 Real-time update:', payload);
            // Only reload if we're not currently saving
            if (!isSaving) {
                console.log('📥 Loading attendance from realtime update');
                loadAttendance();
            } else {
                console.log('⏸️ Skipping reload - save in progress');
            }
        })
        .subscribe();

    console.log('✅ Realtime subscription active');
}

async function refreshData() {
    console.log('🔄 Refreshing employer portal data...');
    const btn = document.getElementById('refresh-btn');
    const icon = document.getElementById('refresh-icon');

    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('animate-spin');

    try {
        await continueEmployerInit();
        showToast('Gegevens succesvol ververst!');
    } catch (err) {
        console.error('Error refreshing data:', err);
        showToast('Fout bij verversen: ' + err.message);
    } finally {
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('animate-spin');
    }
}

let currentColleagueShareLink = '';

async function openColleagueModal() {
    const modal = document.getElementById('colleague-access-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const feedback = document.getElementById('colleague-email-feedback');
    if (feedback) feedback.classList.add('hidden');

    if (!currentCompany || !currentCompany.id) return;

    try {
        const portalUrl = `${window.location.origin}${window.location.pathname}`;
        const res = await fetch(`${window.SUPABASE_URL}/functions/v1/create-auth-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.SUPABASE_KEY}`
            },
            body: JSON.stringify({
                action: 'get-colleague-access',
                companyId: currentCompany.id,
                portalUrl
            })
        });
        const data = await res.json();
        if (data && data.success && data.shareLink) {
            currentColleagueShareLink = data.shareLink;
            const waBtn = document.getElementById('colleague-whatsapp-btn');
            if (waBtn) {
                const waText = encodeURIComponent(
                    `Hoi! Via deze link kun je op je telefoon direct (zonder wachtwoord) de stage-uren goedkeuren voor ${currentCompany.company_name}:\n\n${currentColleagueShareLink}`
                );
                waBtn.href = `https://wa.me/?text=${waText}`;
            }
            const qrImg = document.getElementById('colleague-qr-img');
            if (qrImg) {
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentColleagueShareLink)}`;
            }
            const extraInput = document.getElementById('colleague-extra-email');
            if (extraInput) {
                extraInput.value = data.extraEmail || '';
            }
        }
    } catch (e) {
        console.warn('Could not load colleague share link:', e);
    }
}
window.openColleagueModal = openColleagueModal;

function closeColleagueModal() {
    const modal = document.getElementById('colleague-access-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeColleagueModal = closeColleagueModal;

async function copyColleagueShareLink() {
    if (!currentColleagueShareLink) return;
    try {
        await navigator.clipboard.writeText(currentColleagueShareLink);
        const label = document.getElementById('copy-colleague-link-label');
        if (label) {
            label.textContent = '✅ Link gekopieerd!';
            setTimeout(() => { label.textContent = '📋 Kopieer link'; }, 2500);
        }
        showToast('✅ Directe inloglink voor collega gekopieerd!');
    } catch (e) {
        prompt('Kopieer deze link voor uw collega:', currentColleagueShareLink);
    }
}
window.copyColleagueShareLink = copyColleagueShareLink;

async function saveColleagueEmail() {
    if (!currentCompany || !currentCompany.id) return;
    const extraInput = document.getElementById('colleague-extra-email');
    const saveBtn = document.getElementById('save-colleague-email-btn');
    const feedback = document.getElementById('colleague-email-feedback');
    const extraEmail = extraInput ? extraInput.value.trim().toLowerCase() : '';

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Bezig...';
    }
    try {
        const portalUrl = `${window.location.origin}${window.location.pathname}`;
        const res = await fetch(`${window.SUPABASE_URL}/functions/v1/create-auth-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.SUPABASE_KEY}`
            },
            body: JSON.stringify({
                action: 'save-colleague-email',
                companyId: currentCompany.id,
                extraEmail,
                portalUrl,
                sendInvite: Boolean(extraEmail)
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data?.error || 'Opslaan mislukt');
        }
        if (feedback) {
            feedback.textContent = extraEmail
                ? `✅ Opgeslagen! Er is direct een toegangslink gestuurd naar ${extraEmail}.`
                : '✅ Extra e-mailadres verwijderd.';
            feedback.classList.remove('hidden');
        }
        showToast(extraEmail ? '✅ Collega e-mail opgeslagen & link verstuurd!' : '✅ Opgeslagen!');
    } catch (e) {
        alert('Fout bij opslaan collega e-mail: ' + e.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Opslaan & Stuur link';
        }
    }
}
window.saveColleagueEmail = saveColleagueEmail;

init();

/**
 * Admin Companies Management
 * Met branche functionaliteit
 */

// Conditional initialization to prevent redeclaration errors
if (typeof window.SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
}
if (typeof window.SUPABASE_KEY === 'undefined') {
    window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
}
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
}
var supabaseClient = window.supabaseClient;

let allBranches = [];
let currentFilter = '';

// Load branches
async function loadBranches() {
    const { data, error } = await supabaseClient
        .from('Branches')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error loading branches:', error);
        return;
    }

    allBranches = data || [];

    // Populate branche dropdown in modal
    const brancheSelect = document.getElementById('branche');
    brancheSelect.innerHTML = '<option value="">Selecteer branche...</option>';

    allBranches.forEach(branch => {
        brancheSelect.innerHTML += `<option value="${branch.name}">${branch.name}</option>`;
    });

    // Populate filter dropdown
    const filterSelect = document.getElementById('branche-filter');
    filterSelect.innerHTML = '<option value="">Alle Branches</option>';

    allBranches.forEach(branch => {
        filterSelect.innerHTML += `<option value="${branch.name}">${branch.name}</option>`;
    });
}

let authEmailsSet = null;

async function getAuthEmails() {
    if (authEmailsSet) return authEmailsSet;
    try {
        const res = await fetch(`${window.SUPABASE_URL}/functions/v1/create-auth-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.SUPABASE_KEY}`
            },
            body: JSON.stringify({ action: 'list-auth-users' })
        });
        const data = await res.json();
        const users = data.users || [];
        authEmailsSet = new Set(users.map(u => u.email?.toLowerCase()).filter(Boolean));
    } catch (e) {
        console.warn('Could not fetch auth users status:', e);
        authEmailsSet = new Set();
    }
    return authEmailsSet;
}

/// Load companies
let allCompanies = [];
let currentSearch = '';
let companyStudentCountMap = {};
let companyStudentNamesMap = {};

function getFilteredCompanies() {
    const q = (currentSearch || '').trim().toLowerCase();
    return (allCompanies || []).filter(company => {
        if (currentFilter && company.branche !== currentFilter) {
            return false;
        }
        if (!q) return true;

        const linkedStudentNames = (companyStudentNamesMap[company.id] || []).join(' ').toLowerCase();
        const searchable = [
            company.company_name || '',
            company.contact_person || '',
            company.email || '',
            company.extra_email || '',
            company.branche || '',
            company.phone || '',
            linkedStudentNames
        ].join(' ').toLowerCase();

        return searchable.includes(q);
    });
}

async function loadData() {
    const { data, error } = await supabaseClient
        .from('Bedrijven')
        .select('*')
        .order('company_name');

    if (error) {
        console.error('Error loading companies:', error);
        return;
    }

    allCompanies = data || [];

    // Fetch active students to calculate student count & names per company
    try {
        const { data: studentsData } = await supabaseClient
            .from('Students')
            .select('name, company_id, unenrollment_date, stage_end_date, company_assignments');

        const now = new Date();
        companyStudentCountMap = {};
        companyStudentNamesMap = {};
        const addStudentToCompany = (cId, sName) => {
            if (!cId) return;
            companyStudentCountMap[cId] = (companyStudentCountMap[cId] || 0) + 1;
            if (sName) {
                if (!companyStudentNamesMap[cId]) companyStudentNamesMap[cId] = [];
                if (!companyStudentNamesMap[cId].includes(sName)) {
                    companyStudentNamesMap[cId].push(sName);
                }
            }
        };

        (studentsData || []).forEach(s => {
            const isUnenrolled = (s.unenrollment_date && new Date(s.unenrollment_date) <= now) ||
                                 (s.stage_end_date && new Date(s.stage_end_date) <= now);
            if (!isUnenrolled) {
                if (s.company_id) {
                    addStudentToCompany(s.company_id, s.name);
                }
                if (s.company_assignments) {
                    try {
                        const assignments = typeof s.company_assignments === 'string' 
                            ? JSON.parse(s.company_assignments) 
                            : s.company_assignments;
                        if (Array.isArray(assignments)) {
                            assignments.forEach(a => {
                                const cId = a.company_id || a.companyId || (a.company && a.company.id);
                                if (cId && cId !== s.company_id) {
                                    addStudentToCompany(cId, s.name);
                                }
                            });
                        }
                    } catch (e) {}
                }
            }
        });
    } catch (stErr) {
        console.warn('Could not fetch student counts:', stErr);
        companyStudentCountMap = {};
        companyStudentNamesMap = {};
    }

    await renderCompanies();
}

async function renderCompanies() {
    const tbody = document.getElementById('companies-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = getFilteredCompanies();
    const countBadge = document.getElementById('companies-count-badge');
    if (countBadge) {
        if (currentFilter || (currentSearch && currentSearch.trim())) {
            countBadge.textContent = `${filtered.length} van ${allCompanies.length} bedrijven`;
        } else {
            countBadge.textContent = `${allCompanies.length} bedrijven`;
        }
    }

    if (!filtered || filtered.length === 0) {
        let emptyMessage = 'Nog geen stagebedrijven toegevoegd';
        if (currentSearch && currentSearch.trim()) {
            emptyMessage = `Geen stagebedrijven gevonden voor "${currentSearch.trim()}"`;
        } else if (currentFilter) {
            emptyMessage = 'Geen stagebedrijven gevonden in deze branche';
        }
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    ${emptyMessage}
                </td>
            </tr>
        `;
        return;
    }

    const authSet = await getAuthEmails();

    filtered.forEach(company => {
        const compJson = JSON.stringify(company).replace(/'/g, "&apos;");
        const cleanEmail = company.email ? company.email.trim().toLowerCase() : '';
        const isAuthActive = cleanEmail && authSet.has(cleanEmail);
        const activeStudentsCount = companyStudentCountMap[company.id] || 0;
        const studentNames = companyStudentNamesMap[company.id] || [];

        const studentBadge = activeStudentsCount > 0
            ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium" title="${studentNames.join(', ')}">${activeStudentsCount} stagiair${activeStudentsCount > 1 ? 's' : ''}${studentNames.length > 0 ? `: ${studentNames.join(', ')}` : ''}</span>`
            : `<span class="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">⚠️ 0 stagiairs</span>`;

        const statusBadge = isAuthActive
            ? `<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">🟢 Inlog-account actief</span>`
            : `<span class="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">🟡 Nog niet actief</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">
                    <div>${company.company_name}</div>
                    <div class="mt-1">${studentBadge}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${company.branche ? `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">${company.branche}</span>` : '-'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${company.contact_person || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    <div>${company.email || '-'}</div>
                    ${company.extra_email ? `<div class="text-xs text-emerald-700 font-medium mt-0.5">👥 Collega: ${company.extra_email}</div>` : ''}
                </td>
                <td class="px-6 py-4 text-sm">${statusBadge}</td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                    <button onclick='previewCompanyPortal(${compJson})' class="text-emerald-600 hover:text-emerald-900 font-semibold mr-3" title="Bekijk portaal als dit bedrijf zonder wachtwoord">
                        👁️ Bekijk Portaal
                    </button>
                    <button onclick='sendCompanyInvite(${compJson})' class="text-purple-600 hover:text-purple-900 mr-3" title="Stuur uitnodigingsmail">
                        ✉️ Mail
                    </button>
                    <button onclick='editCompany(${compJson})' class="text-blue-600 hover:text-blue-900 mr-3">
                        Bewerk
                    </button>
                    <button onclick="deleteCompany('${company.id}')" class="text-red-600 hover:text-red-900">
                        Verwijder
                    </button>
                </td>
            </tr>
        `;
    });
}

// Admin Preview Portal function (geen wachtwoord nodig)
window.previewCompanyPortal = function (company) {
    if (!company || !company.id) {
        alert('Kan werkgeversportaal niet openen: onbekend bedrijf.');
        return;
    }
    localStorage.setItem('stageconnect_session', 'true');
    localStorage.setItem('user_email', (company.email || '').trim().toLowerCase());
    localStorage.setItem('company_id', company.id);
    localStorage.setItem('company_name', company.company_name);
    localStorage.setItem('admin_preview_mode', 'true');
    window.open('employer-portal.html', '_blank');
};

// Helper om alle e-mailontvangers (1e + eventuele 2e/extra e-mailadressen) van een bedrijf op te halen
function getCompanyInviteRecipients(primaryEmail, extraEmail) {
    const list = [];
    const seen = new Set();
    const addEmails = (raw) => {
        String(raw || '')
            .split(/[,;\s]+/)
            .map(s => s.trim().toLowerCase())
            .filter(s => s && s.includes('@'))
            .forEach(addr => {
                if (!seen.has(addr)) {
                    seen.add(addr);
                    list.push(addr);
                }
            });
    };
    addEmails(primaryEmail);
    addEmails(extraEmail);
    return list;
}

// Verstuur uitnodigingsmail naar alle opgegeven e-mailadressen van een stagebedrijf
async function sendEmployerInviteToRecipients({ recipients, companyId, companyName, contactPerson, loginUrl }) {
    const functionUrl = `${window.SUPABASE_URL}/functions/v1/create-auth-account`;
    const sent = [];
    const failed = [];

    for (const targetEmail of recipients) {
        try {
            const authRes = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    email: targetEmail,
                    password: '',
                    role: 'employer',
                    sendEmail: true,
                    name: contactPerson || companyName,
                    loginUrl,
                    metadata: {
                        company_name: companyName,
                        company_id: companyId
                    }
                })
            });
            const authResult = await authRes.json().catch(() => ({}));
            if (!authRes.ok || !authResult.success) {
                throw new Error(authResult?.error || `HTTP ${authRes.status}`);
            }
            sent.push(targetEmail);
        } catch (err) {
            failed.push(`${targetEmail} (${err.message})`);
        }
    }

    return { sent, failed };
}

// Send single company invitation email (naar 1e én 2e e-mailadres indien ingevuld)
window.sendCompanyInvite = async function (company) {
    const recipients = getCompanyInviteRecipients(company.email, company.extra_email);
    if (recipients.length === 0) {
        alert('Dit stagebedrijf heeft geen e-mailadres geregistreerd.');
        return;
    }

    const recipientsLabel = recipients.join(' & ');
    const studentCount = companyStudentCountMap[company.id] || 0;
    if (studentCount === 0) {
        const confirmSend = confirm(
            `⚠️ LET OP: ${company.company_name} heeft momenteel GEEN actieve stagiair gekoppeld in het systeem.\n\n` +
            `Weet je zeker dat je toch een uitnodigingsmail met inloglink wilt versturen naar:\n${recipients.join('\n')}?`
        );
        if (!confirmSend) return;
    } else {
        if (!confirm(`Wil je een uitnodigingsmail sturen naar ${company.company_name} (${recipientsLabel})?`)) {
            return;
        }
    }

    try {
        const loginOrigin = (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
            ? 'https://ghpc.stageconnectie.nl'
            : window.location.origin;

        const { sent, failed } = await sendEmployerInviteToRecipients({
            recipients,
            companyId: company.id,
            companyName: company.company_name,
            contactPerson: company.contact_person,
            loginUrl: `${loginOrigin}/employer-portal.html`
        });

        authEmailsSet = null;
        if (failed.length > 0 && sent.length === 0) {
            throw new Error(failed.join(', '));
        } else if (failed.length > 0) {
            alert(
                `✅ Uitnodigingsmail verzonden naar:\n• ${sent.join('\n• ')}\n\n` +
                `⚠️ Niet verzonden naar:\n• ${failed.join('\n• ')}`
            );
        } else {
            alert(`✅ Uitnodigingsmail met directe inloglink (zonder wachtwoord) is succesvol verzonden naar:\n• ${sent.join('\n• ')}`);
        }
        loadData();
    } catch (err) {
        alert('Fout bij verzenden van uitnodiging: ' + err.message);
    }
};

// Verstuur de wekelijkse 1-klik goedkeuringsmail ALLEEN naar bedrijven die deze week nog niets hebben ingevuld
window.sendWeeklyUnfilledReminders = async function () {
    const btn = document.getElementById('weekly-reminder-btn');
    const originalText = btn ? btn.innerHTML : '';
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Controleren wie nog niets heeft ingevuld...';
        }

        const baseUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
            ? 'https://ghpc.stageconnectie.nl'
            : window.location.origin;

        const functionUrl = `${window.SUPABASE_URL}/functions/v1/create-auth-account`;
        const previewRes = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.SUPABASE_KEY}`
            },
            body: JSON.stringify({
                action: 'send-weekly-unfilled-reminders',
                dryRun: true,
                baseUrl
            })
        });

        const preview = await previewRes.json();
        if (!previewRes.ok || !preview.success) {
            throw new Error(preview?.error || 'Kon overzicht niet ophalen.');
        }

        const unfilledCount = preview.toSendCount ?? preview.unfilledCount ?? 0;
        const weekLabel = preview.weekMonday || preview.weekStart || 'deze week';

        if (unfilledCount === 0) {
            alert(
                `🎉 Geweldig! Voor de week vanaf ${weekLabel} hebben alle ingeroosterde bedrijven hun uren al ingevuld (${preview.alreadyFilledCount} bedrijven).\n\nEr hoeft geen herinneringsmail verstuurd te worden.`
            );
            return;
        }

        const sampleList = (preview.companiesToSend || preview.companies || [])
            .slice(0, 8)
            .map(c => `• ${c.company_name} (${c.email})`)
            .join('\n');
        const moreText = unfilledCount > 8 ? `\n...en nog ${unfilledCount - 8} andere bedrijven.` : '';

        const confirmed = confirm(
            `📬 Vrijdag-herinnering (Week vanaf ${weekLabel})\n\n` +
            `• Al ingevuld deze week (worden overgeslagen): ${preview.alreadyFilledCount} bedrijven\n` +
            `• Nog NIETS ingevuld deze week: ${unfilledCount} bedrijven\n\n` +
            `Bedrijven die de 1-klik goedkeuringsmail ontvangen:\n${sampleList}${moreText}\n\n` +
            `Wil je nu de 1-klik goedkeuringsmail versturen naar deze ${unfilledCount} bedrijven?`
        );

        if (!confirmed) return;

        if (btn) {
            btn.innerHTML = `📨 Verzenden naar ${unfilledCount} bedrijven...`;
        }

        const sendRes = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.SUPABASE_KEY}`
            },
            body: JSON.stringify({
                action: 'send-weekly-unfilled-reminders',
                dryRun: false,
                baseUrl
            })
        });

        const sendResult = await sendRes.json();
        if (!sendRes.ok || !sendResult.success) {
            throw new Error(sendResult?.error || 'Verzenden mislukt');
        }

        alert(
            `✅ Klaar! Er zijn ${sendResult.sentCount} herinneringsmails met 1-klik goedkeuring verzonden.\n` +
            `(${sendResult.alreadyFilledCount} bedrijven hadden al ingevuld en zijn netjes overgeslagen.)`
        );
    } catch (err) {
        alert('Fout bij wekelijkse herinnering: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

// Open modal
function openModal(company = null) {
    const modal = document.getElementById('company-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('company-form');

    modal.classList.remove('hidden');

    const sendInviteCheckbox = document.getElementById('send_invite_immediately');
    if (sendInviteCheckbox) {
        sendInviteCheckbox.checked = false;
    }

    if (company) {
        title.textContent = 'Stagebedrijf Bewerken';
        document.getElementById('company-id').value = company.id;
        document.getElementById('company_name').value = company.company_name;
        document.getElementById('branche').value = company.branche || '';
        document.getElementById('contact_person').value = company.contact_person || '';
        document.getElementById('email').value = company.email || '';
        const extraEl = document.getElementById('extra_email');
        if (extraEl) extraEl.value = company.extra_email || '';
        document.getElementById('phone_number').value = company.phone || '';
    } else {
        title.textContent = 'Stagebedrijf Toevoegen';
        form.reset();
        document.getElementById('company-id').value = '';
        const extraEl = document.getElementById('extra_email');
        if (extraEl) extraEl.value = '';
        if (sendInviteCheckbox) sendInviteCheckbox.checked = false;
    }
}

// Close modal
function closeModal() {
    document.getElementById('company-modal').classList.add('hidden');
}

// Edit company
window.editCompany = function (company) {
    openModal(company);
};

// Delete company
window.deleteCompany = async function (id) {
    if (!confirm('Weet je zeker dat je dit stagebedrijf wilt verwijderen?\n\nLet op: gekoppelde stagiairs verliezen hun koppeling.')) {
        return;
    }

    try {
        // Step 1: Get company email first
        const { data: company, error: fetchError } = await supabaseClient
            .from('Bedrijven')
            .select('email')
            .eq('id', id)
            .single();

        if (fetchError) {
            alert('Fout bij ophalen stagebedrijf: ' + fetchError.message);
            return;
        }

        // Step 2: Delete from database
        const { error: deleteError } = await supabaseClient
            .from('Bedrijven')
            .delete()
            .eq('id', id);

        if (deleteError) {
            alert('Fout bij verwijderen: ' + deleteError.message);
            return;
        }

        // Step 3: Delete auth account via Edge Function
        if (company.email || id) {
            const functionUrl = `${window.SUPABASE_URL}/functions/v1/delete-auth-account`;
            try {
                const authRes = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.SUPABASE_KEY}`
                    },
                    body: JSON.stringify({ 
                        email: company.email,
                        userId: id
                    })
                });

                const authResult = await authRes.json();
                if (!authRes.ok || !authResult.success) {
                    throw new Error(authResult?.error || 'Auth account delete failed');
                }

                alert('✅ Stagebedrijf en login account succesvol verwijderd!');
            } catch (authError) {
                console.warn('Auth account delete failed:', authError);
                alert('✅ Stagebedrijf verwijderd!\n\n⚠️ Let op: Het login account kon niet automatisch worden verwijderd. (Fout: ' + authError.message + ')\nGa naar Supabase → Authentication → Users en verwijder handmatig.');
            }
        } else {
            alert('✅ Stagebedrijf verwijderd!\n\n⚠️ Geen email gevonden.');
        }

        loadData();
    } catch (err) {
        console.error('Delete error:', err);
        alert('Onverwachte fout: ' + err.message);
    }
};

// Form submit
document.getElementById('company-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('company-id').value;
    const companyName = document.getElementById('company_name').value;
    const email = document.getElementById('email').value;
    const extraEmailEl = document.getElementById('extra_email');
    const extraEmail = extraEmailEl ? extraEmailEl.value.trim().toLowerCase() : '';

    const companyData = {
        company_name: companyName,
        branche: document.getElementById('branche').value || null,
        contact_person: document.getElementById('contact_person').value || null,
        email: email || null,
        extra_email: extraEmail || null,
        phone: document.getElementById('phone_number').value || null,
        address: null  // No address field in form yet
    };

    const sendInviteNow = document.getElementById('send_invite_immediately')?.checked || false;
    const contactPerson = document.getElementById('contact_person').value || '';
    const loginOrigin = (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
        ? 'https://ghpc.stageconnectie.nl'
        : window.location.origin;

    if (id) {
        // Update existing company via Edge Function (to bypass RLS limitations)
        try {
            const functionUrl = `${window.SUPABASE_URL}/functions/v1/create-auth-account`;
            const authRes = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    action: 'update-company',
                    metadata: {
                        companyId: id,
                        companyPayload: companyData
                    }
                })
            });

            const authResult = await authRes.json();
            if (!authRes.ok || !authResult.success) {
                throw new Error(authResult?.error || 'Bijwerken mislukt');
            }

            const inviteRecipients = getCompanyInviteRecipients(email, extraEmail);
            if (sendInviteNow && inviteRecipients.length > 0) {
                const { sent, failed } = await sendEmployerInviteToRecipients({
                    recipients: inviteRecipients,
                    companyId: id,
                    companyName,
                    contactPerson,
                    loginUrl: `${loginOrigin}/employer-portal.html`
                });
                authEmailsSet = null;
                if (failed.length > 0 && sent.length === 0) {
                    alert(`✅ Stagebedrijf bijgewerkt.\n\n⚠️ De uitnodigingsmail is NIET verzonden:\n• ${failed.join('\n• ')}\n\nControleer het e-mailadres en probeer het opnieuw via de knop "✉️ Mail".`);
                } else if (failed.length > 0) {
                    alert(`✅ Stagebedrijf bijgewerkt én uitnodigingsmail direct verzonden naar:\n• ${sent.join('\n• ')}\n\n⚠️ Niet verzonden naar:\n• ${failed.join('\n• ')}`);
                } else {
                    alert(`✅ Stagebedrijf bijgewerkt én uitnodigingsmail direct verzonden naar:\n• ${sent.join('\n• ')}`);
                }
            }

            closeModal();
            loadData();
        } catch (err) {
            console.error('Edge Function update error, trying direct update fallback:', err);
            // Fallback direct update with .select()
            const { data, error } = await supabaseClient
                .from('Bedrijven')
                .update(companyData)
                .eq('id', id)
                .select();

            if (error) {
                if (error.code === '23505' || (error.message && (error.message.includes('Bedrijven_email_key') || error.message.includes('unique constraint')))) {
                    alert(`⚠️ Er bestaat al een stagebedrijf met het e-mailadres '${email}'.`);
                } else {
                    alert('Fout bij opslaan: ' + error.message);
                }
            } else if (!data || data.length === 0) {
                alert('Fout bij opslaan: Kon stagebedrijf niet bijwerken vanwege toegangsrechten.');
            } else {
                closeModal();
                loadData();
            }
        }
    } else {
        // Insert new company via Edge Function (to bypass RLS limitations)
        if (!email) {
            alert('Email is verplicht voor nieuwe stagebedrijven (voor login)');
            return;
        }

        try {
            const functionUrl = `${window.SUPABASE_URL}/functions/v1/create-auth-account`;
            const authRes = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    action: 'upsert-company',
                    metadata: {
                        company: companyData
                    }
                })
            });

            const authResult = await authRes.json();
            if (!authRes.ok || !authResult.success) {
                if (authResult?.error && authResult.error.includes('unique constraint')) {
                    alert(`⚠️ Er bestaat al een stagebedrijf met het e-mailadres '${email}'.`);
                } else {
                    throw new Error(authResult?.error || 'Aanmaken stagebedrijf mislukt');
                }
                return;
            }

            const createdCompanyId = Array.isArray(authResult.company)
                ? authResult.company[0]?.id
                : authResult.company?.id;

            // Alleen direct uitnodigingsmail versturen als het vinkje aan staat
            const inviteRecipients = getCompanyInviteRecipients(email, extraEmail);
            if (sendInviteNow && inviteRecipients.length > 0) {
                const { sent, failed } = await sendEmployerInviteToRecipients({
                    recipients: inviteRecipients,
                    companyId: createdCompanyId || '',
                    companyName,
                    contactPerson,
                    loginUrl: `${loginOrigin}/employer-portal.html`
                });
                authEmailsSet = null;
                if (failed.length > 0 && sent.length === 0) {
                    alert(`✅ Stagebedrijf aangemaakt.\n\n⚠️ De uitnodigingsmail is NIET verzonden:\n• ${failed.join('\n• ')}\n\nControleer het e-mailadres en probeer het opnieuw via de knop "✉️ Mail".`);
                } else if (failed.length > 0) {
                    alert(`✅ Stagebedrijf aangemaakt!\n\nEr is direct een uitnodigingsmail verzonden naar:\n• ${sent.join('\n• ')}\n\n⚠️ Niet verzonden naar:\n• ${failed.join('\n• ')}`);
                } else {
                    alert(`✅ Stagebedrijf aangemaakt!\n\nEr is direct een uitnodigingsmail verzonden naar:\n• ${sent.join('\n• ')}`);
                }
            } else {
                alert(
                    '✅ Stagebedrijf aangemaakt (nog geen mail verstuurd)!\n\n' +
                    '💡 Zodra je bij Stagiairs Beheer een leerling aan dit bedrijf koppelt, krijgt het bedrijf standaard automatisch de uitnodigingsmail (of verstuur hem later handmatig via de knop "✉️ Mail").'
                );
            }

            closeModal();
            loadData();
        } catch (err) {
            alert('Fout bij opslaan stagebedrijf: ' + err.message);
        }
    }
});

// Filter & Search change
document.getElementById('branche-filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderCompanies();
});

const searchInputEl = document.getElementById('search-input');
const clearSearchBtnEl = document.getElementById('clear-search-btn');

if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        if (clearSearchBtnEl) {
            clearSearchBtnEl.classList.toggle('hidden', !currentSearch);
        }
        renderCompanies();
    });
}

window.clearCompanySearch = function () {
    currentSearch = '';
    if (searchInputEl) {
        searchInputEl.value = '';
        searchInputEl.focus();
    }
    if (clearSearchBtnEl) {
        clearSearchBtnEl.classList.add('hidden');
    }
    renderCompanies();
};

// Logout
function logout() {
    localStorage.removeItem('stageconnect_admin_session');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_name');
    window.location.href = 'admin-login.html';
}

// Export companies to CSV (Excel compatible)
window.exportCompaniesToCSV = async function () {
    try {
        if (!allCompanies || allCompanies.length === 0) {
            await loadData();
        }
        const bedrijven = getFilteredCompanies();

        if (!bedrijven || bedrijven.length === 0) {
            alert('Geen bedrijven gevonden om te exporteren.');
            return;
        }

        const authSet = await getAuthEmails();

        const headers = ['Bedrijfsnaam', 'Branche', 'Praktijkbegeleider', 'Email', 'Telefoonnummer', 'Inlog Status', 'Aangemaakt Op'];
        
        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '""';
            const val = String(str).replace(/"/g, '""');
            return `"${val}"`;
        };

        const rows = bedrijven.map(b => {
            const cleanEmail = b.email ? b.email.trim().toLowerCase() : '';
            const isAuthActive = cleanEmail && authSet.has(cleanEmail);
            const statusStr = isAuthActive ? 'Actief (ingelogd)' : 'Nog niet actief';
            
            return [
                escapeCsv(b.company_name),
                escapeCsv(b.branche || 'Niet opgegeven'),
                escapeCsv(b.contact_person || 'Niet opgegeven'),
                escapeCsv(b.email || 'Geen email'),
                escapeCsv(b.phone || 'Geen telefoonnummer'),
                escapeCsv(statusStr),
                escapeCsv(b.created_at ? new Date(b.created_at).toLocaleDateString('nl-NL') : '')
            ];
        });

        const bom = '\uFEFF';
        const csvContent = bom + [headers.map(h => `"${h}"`).join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `stagebedrijven_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        alert('Fout bij exporteren: ' + err.message);
    }
};

// Initialize
async function init() {
    await loadBranches();
    await loadData();
}

init();

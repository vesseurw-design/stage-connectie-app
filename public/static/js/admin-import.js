/**
 * admin-import.js - StageConnectie Bulk CSV Import Controller (v31)
 * Robuuste afhandeling van CSV imports voor Stagiairs, Stagebedrijven en Stagebegeleiders.
 */

// Global Supabase Helper
function getImportSupabaseClient() {
    const supabaseUrl = window.SUPABASE_URL || window.ENV_SUPABASE_URL || localStorage.getItem('supabaseUrl');
    const supabaseKey = window.SUPABASE_KEY || window.ENV_SUPABASE_KEY || localStorage.getItem('supabaseKey');

    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient && supabaseUrl && supabaseKey) {
        try {
            window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            return window.supabaseClient;
        } catch (e) {
            console.warn("Supabase client init warning:", e);
        }
    }
    return null;
}

// Fetch helper met timeout om stagnering/bevriezen te voorkomen
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Verzoek duurde te lang (timeout)');
        }
        throw err;
    }
}

// Edge Function Auth account creator / updater
async function callCreateAuthAccount(payload) {
    const supabaseUrl = window.SUPABASE_URL || window.ENV_SUPABASE_URL || localStorage.getItem('supabaseUrl');
    const supabaseKey = window.SUPABASE_KEY || window.ENV_SUPABASE_KEY || localStorage.getItem('supabaseKey');
    const functionUrl = `${supabaseUrl}/functions/v1/create-auth-account`;

    let attempts = 0;
    while (attempts < 2) {
        attempts++;
        try {
            const authRes = await fetchWithTimeout(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify(payload)
            }, 15000);

            if (authRes.status === 404) {
                throw new Error('Edge Function create-auth-account is niet geconfigureerd op deze Supabase server (404).');
            }

            if (authRes.status === 429 && attempts < 2) {
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }

            const authData = await authRes.json();
            if (!authRes.ok || !authData.success) {
                throw new Error(authData.error || 'Aanmaken account/uitnodiging mislukt');
            }
            return authData;
        } catch (err) {
            if (attempts >= 2 || err.message.includes('404')) throw err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

// Fallback CSV Parser voor wanneer PapaParse niet geladen is of faalt
function parseCsvFallback(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0].replace(/^\uFEFF/, '');
    const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : (firstLine.includes('|') ? '|' : ','));
    const rawHeaders = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const vals = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        rawHeaders.forEach((h, idx) => {
            obj[h] = vals[idx] !== undefined ? vals[idx] : '';
        });
        rows.push(obj);
    }
    return rows;
}

// Universele CSV Parser (PapaParse met Fallback & Single-Column header auto-split)
async function parseCsvFile(file) {
    let rows = [];

    if (typeof window.Papa !== 'undefined') {
        rows = await new Promise((resolve) => {
            window.Papa.parse(file, {
                header: true,
                skipEmptyLines: 'greedy',
                delimitersToGuess: [';', ',', '\t', '|'],
                transformHeader: h => (h ? h.trim().replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '') : ''),
                complete: function(results) {
                    let data = results.data || [];
                    if (data.length > 0 && Object.keys(data[0]).length === 1) {
                        const rawHeaderKey = Object.keys(data[0])[0];
                        const delimiter = rawHeaderKey.includes(';') ? ';' : (rawHeaderKey.includes('\t') ? '\t' : (rawHeaderKey.includes(',') ? ',' : null));
                        if (delimiter) {
                            const cleanHeaders = rawHeaderKey.split(delimiter).map(h => h.trim().replace(/^\uFEFF/, '').replace(/^["']|["']$/g, ''));
                            data = data.map(r => {
                                const rawVal = Object.values(r)[0] || '';
                                const vals = String(rawVal).split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
                                const newObj = {};
                                cleanHeaders.forEach((h, idx) => {
                                    newObj[h] = vals[idx] !== undefined ? vals[idx] : '';
                                });
                                return newObj;
                            });
                        }
                    }
                    resolve(data);
                },
                error: function(err) {
                    console.warn("Papa.parse warning, converting with fallback parser...", err);
                    file.text().then(txt => resolve(parseCsvFallback(txt))).catch(() => resolve([]));
                }
            });
        });
    }

    if (!rows || rows.length === 0) {
        try {
            const text = await file.text();
            rows = parseCsvFallback(text);
        } catch (e) {
            console.error("CSV text fallback reading failed:", e);
        }
    }

    return rows;
}

// Schooljaar normalisatie (bijv. "2627", "26/27", "26-27" -> "2026-2027")
function normalizeSchoolYear(val) {
    if (!val) return null;
    let s = String(val).trim();
    if (s === '2627' || s === '26/27' || s === '26-27' || s === '2026/2027' || s === '2026-2027') return '2026-2027';
    if (s === '2526' || s === '25/26' || s === '25-26' || s === '2025/2026' || s === '2025-2026') return '2025-2026';
    if (s === '2728' || s === '27/28' || s === '27-28' || s === '2027/2028' || s === '2027-2028') return '2027-2028';
    const m4 = s.match(/^(\d{2})(\d{2})$/);
    if (m4) return `20${m4[1]}-20${m4[2]}`;
    const mSep = s.match(/^(\d{2})[\/\-](\d{2})$/);
    if (mSep) return `20${mSep[1]}-20${mSep[2]}`;
    const mFullSep = s.match(/^(20\d{2})[\/\-](20\d{2})$/);
    if (mFullSep) return `${mFullSep[1]}-${mFullSep[2]}`;
    return s;
}

// Algemene Import Handlende Functie
async function executeImportProcess(fileInput, type, sendEmailCheckbox, progressElements, resultsElement, button) {
    // Forceer UI-elementen direct zichtbaar bij elke klik
    if (progressElements && progressElements.container) {
        progressElements.container.classList.remove('hidden');
    }
    if (resultsElement) {
        resultsElement.classList.remove('hidden');
        resultsElement.style.display = 'block';
    }

    const file = fileInput ? fileInput.files[0] : null;
    if (!file) {
        if (resultsElement) {
            resultsElement.innerHTML = '<div class="text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium">⚠️ Er is nog geen CSV-bestand geselecteerd. Klik eerst op <strong>"Kies bestand"</strong> om je CSV-bestand te selecteren.</div>';
        } else {
            alert('Selecteer eerst een CSV bestand.');
        }
        return;
    }

    const supabase = getImportSupabaseClient();
    if (!supabase) {
        if (resultsElement) {
            resultsElement.innerHTML = '<div class="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">❌ Supabase verbinding is niet beschikbaar. Vernieuw de pagina met Cmd+Shift+R of Ctrl+F5.</div>';
        } else {
            alert('Supabase verbinding is niet beschikbaar. Vernieuw de pagina.');
        }
        return;
    }

    // UI Reset & Directe feedback
    if (button) {
        button.disabled = true;
        button.classList.add('opacity-50');
    }
    
    if (resultsElement) {
        resultsElement.innerHTML = `<div class="text-blue-600 font-medium py-1">⏳ CSV-bestand "${file.name}" (${Math.round(file.size / 1024)} KB) inlezen en analyseren...</div>`;
    }

    try {
        const data = await parseCsvFile(file);
        if (!data || data.length === 0) {
            if (resultsElement) resultsElement.innerHTML = '<div class="text-red-600 font-medium py-1">❌ Het CSV-bestand bevat geen rijen of kon niet worden gelezen. Controleer het bestand.</div>';
            return;
        }

        const total = data.length;
        let successCount = 0;
        let failCount = 0;

        if (progressElements) {
            if (progressElements.text) progressElements.text.textContent = `0 / ${total} verwerkt`;
            if (progressElements.bar) progressElements.bar.style.width = '0%';
        }

        if (resultsElement) {
            resultsElement.innerHTML = `<div class="text-blue-700 font-semibold py-1 border-b pb-2 mb-2">📋 ${total} rijen gevonden in CSV. Bezig met verwerken...</div>`;
        }

        // Pre-load stagebedrijven & stagebegeleiders bij leerlingimport
        let allCompanies = [];
        let allSupervisors = [];
        if (type === 'student') {
            try {
                const { data: compData } = await supabase.from('Bedrijven').select('id, company_name, email');
                allCompanies = compData || [];
                const { data: supData } = await supabase.from('stagebegeleiders').select('id, name, email');
                allSupervisors = supData || [];
            } catch (err) {
                console.error('Error pre-loading companies/supervisors:', err);
            }
        }

        for (let i = 0; i < total; i++) {
            const row = data[i];
            if (progressElements) {
                if (progressElements.text) progressElements.text.textContent = `${i + 1} / ${total} verwerkt...`;
                if (progressElements.bar) progressElements.bar.style.width = `${((i + 1) / total) * 100}%`;
            }

            try {
                // Kolommen ophalen (BOM-safe, case-insensitive, aliassen)
                const getCol = (...names) => {
                    if (!row) return null;
                    for (const name of names) {
                        const key = Object.keys(row).find(k => {
                            const cleanKey = k.replace(/^\uFEFF/, '').trim().toLowerCase();
                            return cleanKey === name.toLowerCase();
                        });
                        if (key && row[key] !== undefined && row[key] !== null) {
                            const val = String(row[key]).trim();
                            if (val.length > 0) return val;
                        }
                    }
                    return null;
                };

                const getName = () => {
                    const nameVal = getCol('naam', 'name', 'volledige_naam', 'student_naam', 'stagiair', 'leerling', 'student', 'stagiair_naam', 'leerling_naam', 'full_name', 'fullname', 'leerlingnaam');
                    if (nameVal) return nameVal;

                    const voornaam = getCol('voornaam', 'first_name', 'firstname', 'roepnaam', 'voornamen');
                    const achternaam = getCol('achternaam', 'last_name', 'lastname', 'achternaam_tussenvoegsel');
                    if (voornaam || achternaam) {
                        const tussenvoegsel = getCol('tussenvoegsel', 'infix', 'prefix', 'tussenvoegsels') || '';
                        return [voornaam, tussenvoegsel, achternaam].filter(Boolean).join(' ').trim();
                    }
                    return 'Onbekend';
                };

                let email = getCol('email', 'emailadres', 'e-mail', 'e-mailadres', 'bedrijf_email', 'bedrijfs_email', 'company_email', 'contact_email', 'email_adres', 'mail', 'leerling_email', 'student_email', 'stagiair_email', 'leerlingemail', 'studentemail', 'school_email', 'schoolemail');
                let wachtwoord = getCol(
                    'wachtwoord', 'password', 'passwd', 'code', 'pin', 'pincode',
                    'wachtwoord_6_cijfers', 'inlogcode', 'pass', 'pw', 'toegangscode',
                    'wachtwoord_leerling', 'wachtwoord_stagiair', 'wachtwoord_stagiaire',
                    'ww', 'wachtwoord stagiair', 'wachtwoord stagiaire', 'wachtwoord leerling',
                    'stagiair_wachtwoord', 'leerling_wachtwoord', 'inlog_code', 'inlog_wachtwoord',
                    'passcode', 'wachtwoord (6 cijfers)', 'wachtwoord (leerling)', 'wachtwoord (stagiair)',
                    'wachtwoord/code', 'inlogcode/wachtwoord', 'wachtwoord/pin'
                );

                if (!email) {
                    throw new Error("Geen e-mailadres opgegeven in deze rij van het CSV bestand.");
                }

                const isUuid = (val) => val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

                let bedrijfId = null;
                let supervisorId = null;

                if (type === 'student') {
                    bedrijfId = getCol('bedrijf_id', 'bedrijfs_id', 'company_id');
                    if (bedrijfId && !isUuid(bedrijfId)) {
                        const matchedCompany = allCompanies.find(c =>
                            c.email?.toLowerCase().trim() === bedrijfId.toLowerCase().trim() ||
                            c.company_name?.toLowerCase().trim() === bedrijfId.toLowerCase().trim()
                        );
                        bedrijfId = matchedCompany ? matchedCompany.id : null;
                    } else if (!bedrijfId) {
                        const companySearch = getCol('stagebedrijf', 'bedrijf', 'company', 'stagebedrijf_naam', 'company_name', 'bedrijfsnaam', 'organisatie', 'bedrijf_naam', 'stage_bedrijf', 'leerbedrijf');
                        const companyEmail = getCol('stagebedrijf_email', 'bedrijf_email', 'company_email', 'bedrijfs_email', 'stagebedrijfemail', 'bedrijfemail');

                        if (companyEmail) {
                            const matchedCompany = allCompanies.find(c => c.email?.toLowerCase().trim() === companyEmail.toLowerCase().trim());
                            if (matchedCompany) bedrijfId = matchedCompany.id;
                        }
                        if (!bedrijfId && companySearch) {
                            const matchedCompany = allCompanies.find(c => c.company_name?.toLowerCase().trim() === companySearch.toLowerCase().trim());
                            if (matchedCompany) bedrijfId = matchedCompany.id;
                        }

                        // Automatisch stagebedrijf aanmaken als er een e-mailadres is opgegeven
                        if (!bedrijfId && companySearch) {
                            if (!companyEmail) {
                                if (resultsElement) resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">ℹ️ Stagebedrijf "${companySearch}" bestaat niet in het systeem (geen e-mailadres in CSV, niet aangemaakt).</div>`;
                            } else {
                                try {
                                    let newCompanyId = null;
                                    let emailToUse = companyEmail.trim().toLowerCase();

                                    if (sendEmailCheckbox && sendEmailCheckbox.checked) {
                                        try {
                                            const authResult = await callCreateAuthAccount({
                                                email: emailToUse,
                                                password: '',
                                                role: 'employer',
                                                sendEmail: true,
                                                name: companySearch,
                                                loginUrl: `${window.location.origin}/reset-password.html`,
                                                metadata: { company_name: companySearch }
                                            });
                                            if (authResult && authResult.success) newCompanyId = authResult.user_id;
                                        } catch (authErr) {
                                            console.warn('Edge function overgeslagen bij auto-aanmaken bedrijf:', authErr);
                                        }
                                    }

                                    const insertData = { company_name: companySearch, email: emailToUse };
                                    if (newCompanyId) insertData.id = newCompanyId;

                                    const { data: newCompResult, error: insertError } = await supabase.from('Bedrijven').insert([insertData]).select();
                                    if (insertError) throw insertError;

                                    if (newCompResult && newCompResult[0]) {
                                        bedrijfId = newCompResult[0].id;
                                        allCompanies.push({ id: bedrijfId, company_name: companySearch, email: emailToUse });
                                        if (resultsElement) resultsElement.innerHTML += `<div class="text-blue-600 border-b border-gray-100 py-1">🏢 Nieuw stagebedrijf aangemaakt: ${companySearch}</div>`;
                                    }
                                } catch (compErr) {
                                    console.error('Error auto-creating company:', compErr);
                                    if (resultsElement) resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">⚠️ Kon stagebedrijf "${companySearch}" niet automatisch aanmaken: ${compErr.message}</div>`;
                                }
                            }
                        }
                    }

                    supervisorId = getCol('supervisor_id', 'begeleider_id');
                    if (supervisorId && !isUuid(supervisorId)) {
                        const matchedSupervisor = allSupervisors.find(s =>
                            s.email?.toLowerCase().trim() === supervisorId.toLowerCase().trim() ||
                            s.name?.toLowerCase().trim() === supervisorId.toLowerCase().trim()
                        );
                        supervisorId = matchedSupervisor ? matchedSupervisor.id : null;
                    } else if (!supervisorId) {
                        const supervisorSearch = getCol('begeleider', 'stagebegeleider', 'supervisor', 'begeleider_naam', 'docent', 'mentor', 'docent_naam', 'mentor_naam', 'stagebegeleider_naam', 'docent/begeleider');
                        const supervisorEmail = getCol('begeleider_email', 'stagebegeleider_email', 'supervisor_email', 'docent_email', 'mentor_email', 'begeleideremail');

                        if (supervisorEmail) {
                            const matchedSupervisor = allSupervisors.find(s => s.email?.toLowerCase().trim() === supervisorEmail.toLowerCase().trim());
                            if (matchedSupervisor) supervisorId = matchedSupervisor.id;
                        }
                        if (!supervisorId && supervisorSearch) {
                            const matchedSupervisor = allSupervisors.find(s => s.name?.toLowerCase().trim() === supervisorSearch.toLowerCase().trim());
                            if (matchedSupervisor) supervisorId = matchedSupervisor.id;
                        }

                        if (!supervisorId && supervisorSearch) {
                            if (!supervisorEmail) {
                                if (resultsElement) resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">ℹ️ Stagebegeleider "${supervisorSearch}" bestaat niet in het systeem (geen e-mailadres in CSV, niet aangemaakt).</div>`;
                            } else {
                                try {
                                    let newSupervisorId = null;
                                    let emailToUse = supervisorEmail.trim().toLowerCase();

                                    if (sendEmailCheckbox && sendEmailCheckbox.checked) {
                                        try {
                                            const authResult = await callCreateAuthAccount({
                                                email: emailToUse,
                                                password: '',
                                                role: 'supervisor',
                                                sendEmail: true,
                                                name: supervisorSearch,
                                                loginUrl: `${window.location.origin}/supervisor-portal.html`
                                            });
                                            if (authResult && authResult.success) newSupervisorId = authResult.user_id;
                                        } catch (authErr) {
                                            console.warn('Edge function overgeslagen bij auto-aanmaken begeleider:', authErr);
                                        }
                                    }

                                    const insertData = { name: supervisorSearch, email: emailToUse };
                                    if (newSupervisorId) insertData.id = newSupervisorId;

                                    const { data: newSupResult, error: insertError } = await supabase.from('stagebegeleiders').insert([insertData]).select();
                                    if (insertError) throw insertError;

                                    if (newSupResult && newSupResult[0]) {
                                        supervisorId = newSupResult[0].id;
                                        allSupervisors.push({ id: supervisorId, name: supervisorSearch, email: emailToUse });
                                        if (resultsElement) resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">🏫 Nieuwe stagebegeleider aangemaakt: ${supervisorSearch}</div>`;
                                    }
                                } catch (supErr) {
                                    console.error('Error auto-creating supervisor:', supErr);
                                    if (resultsElement) resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">⚠️ Kon stagebegeleider "${supervisorSearch}" niet automatisch aanmaken: ${supErr.message}</div>`;
                                }
                            }
                        }
                    }
                }

                // Datums parsen
                const formatDateISO = (dateStr) => {
                    if (!dateStr) return null;
                    dateStr = dateStr.trim();
                    const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
                    const match = dateStr.match(dmyRegex);
                    if (match) {
                        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
                    const parsed = new Date(dateStr);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;
                };

                const startDate = formatDateISO(getCol('stage_start_date', 'startdatum_stage', 'startdatum', 'stage_start', 'start_date', 'begindatum', 'start', 'start_datum', 'datum_start'));
                const endDate = formatDateISO(getCol('stage_end_date', 'einddatum_stage', 'einddatum', 'stage_end', 'end_date', 'eind_datum', 'eind', 'datum_eind'));

                const parseScheduledDays = (val) => {
                    if (!val) return null;
                    const map = {
                        'ma': 'Ma', 'maandag': 'Ma', 'mon': 'Ma', 'monday': 'Ma',
                        'di': 'Di', 'dinsdag': 'Di', 'tue': 'Di', 'tuesday': 'Di',
                        'wo': 'Wo', 'woensdag': 'Wo', 'wed': 'Wo', 'wednesday': 'Wo',
                        'do': 'Do', 'donderdag': 'Do', 'thu': 'Do', 'thursday': 'Do',
                        'vr': 'Vr', 'vrijdag': 'Vr', 'fri': 'Vr', 'friday': 'Vr',
                        'za': 'Za', 'zaterdag': 'Za', 'sat': 'Za', 'saturday': 'Za',
                        'zo': 'Zo', 'zondag': 'Zo', 'sun': 'Zo', 'sunday': 'Zo'
                    };
                    const parts = String(val).split(/[,;/|\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
                    const days = parts.map(p => map[p] || (p.charAt(0).toUpperCase() + p.slice(1))).filter(Boolean);
                    return days.length > 0 ? Array.from(new Set(days)) : null;
                };

                const rawDays = getCol('stagedagen', 'stage_dagen', 'scheduled_days', 'dagen', 'stagedag', 'stage_dag', 'lesdagen', 'werkdagen');
                const scheduledDays = parseScheduledDays(rawDays);

                // Controleer of record al bestaat in database
                let user_id = null;
                let exists = false;
                const cleanEmail = email.trim().toLowerCase();

                if (type === 'student') {
                    const { data: existingStudent, error: checkError } = await supabase
                        .from('Students')
                        .select('id')
                        .eq('email', cleanEmail)
                        .maybeSingle();
                    if (checkError) throw checkError;
                    if (existingStudent) {
                        user_id = existingStudent.id;
                        exists = true;
                    }
                } else if (type === 'company') {
                    const { data: existingCompany, error: checkError } = await supabase
                        .from('Bedrijven')
                        .select('id')
                        .eq('email', cleanEmail)
                        .maybeSingle();
                    if (checkError) throw checkError;
                    if (existingCompany) {
                        user_id = existingCompany.id;
                        exists = true;
                    }
                } else if (type === 'supervisor') {
                    const { data: existingSupervisor, error: checkError } = await supabase
                        .from('stagebegeleiders')
                        .select('id')
                        .eq('email', cleanEmail)
                        .maybeSingle();
                    if (checkError) throw checkError;
                    if (existingSupervisor) {
                        user_id = existingSupervisor.id;
                        exists = true;
                    }
                }

                let role = type === 'student' ? 'student' : (type === 'company' ? 'employer' : 'supervisor');
                let name = type === 'student' ? getName() : (type === 'company' ? (getCol('contactpersoon') || getCol('bedrijfsnaam')) : getName());
                let loginUrl = type === 'student'
                    ? `${window.location.origin}/student-portal.html`
                    : (type === 'company' ? `${window.location.origin}/reset-password.html` : `${window.location.origin}/supervisor-portal.html`);

                let authWarning = null;

                // Wachtwoord bepalen: als opgegeven in CSV, exact overnemen (min 6 tekens voor Supabase Auth)
                let passToSet = wachtwoord ? (wachtwoord.length < 6 ? wachtwoord.padStart(6, '0') : wachtwoord) : '';
                
                // GEEN standaard wachtwoorden: Als een NIEUWE leerling geen wachtwoord in de CSV heeft, meld een fout
                if (!passToSet && !exists && type === 'student') {
                    throw new Error(`Geen wachtwoord opgegeven in de CSV voor ${cleanEmail}. Nieuwe stagiair-accounts vereisen een wachtwoord in het CSV-bestand (er worden geen standaard wachtwoorden aangemaakt).`);
                }

                // Auth account aanmaken/updaten in Supabase Auth (Stille import = geen mail versturen)
                const isSendEmailChecked = sendEmailCheckbox ? sendEmailCheckbox.checked : false;
                if (passToSet || isSendEmailChecked || (!exists && type === 'student')) {
                    try {
                        const authData = await callCreateAuthAccount({
                            email: cleanEmail,
                            password: passToSet,
                            role: role,
                            metadata: { source: 'csv_import' },
                            sendEmail: isSendEmailChecked,
                            name: name || '',
                            loginUrl: loginUrl
                        });
                        if (authData && authData.user_id) {
                            user_id = authData.user_id;
                        }
                    } catch (authErr) {
                        console.warn('Auth account/wachtwoord update via Edge Function overgeslagen:', authErr);
                        if (isSendEmailChecked) {
                            authWarning = `welkomstmail niet verzonden (${authErr.message})`;
                        }
                    }
                }

                // Opslaan/bijwerken van gegevens in de database via Admin Edge Function (omzeilt RLS-fouten)
                const supabaseUrl = window.SUPABASE_URL || window.ENV_SUPABASE_URL || localStorage.getItem('supabaseUrl');
                const supabaseKey = window.SUPABASE_KEY || window.ENV_SUPABASE_KEY || localStorage.getItem('supabaseKey');

                if (type === 'student') {
                    const studentPayload = {
                        name: getName(),
                        email: cleanEmail,
                        class: getCol('klas', 'class', 'groep', 'stamklas', 'leerjaar', 'cohort', 'klas_naam', 'klascode', 'groep_naam') || null,
                        school_year: normalizeSchoolYear(getCol('schooljaar', 'school_year', 'periode', 'jaar', 'cursusjaar', 'collegejaar', 'studiejaar', 'school_jaar')) || '2026-2027',
                        company_id: bedrijfId || null,
                        supervisor_id: supervisorId || null
                    };
                    if (user_id) studentPayload.id = user_id;
                    if (scheduledDays) studentPayload.scheduled_days = scheduledDays;

                    const edgeRes = await fetchWithTimeout(`${supabaseUrl}/functions/v1/create-auth-account`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({
                            action: 'upsert-student',
                            metadata: { student: studentPayload }
                        })
                    }, 15000);

                    const edgeData = await edgeRes.json();
                    if (!edgeRes.ok || !edgeData.success) {
                        throw new Error(edgeData.error || 'Opslaan van stagiair in database mislukt');
                    }
                } else if (type === 'company') {
                    const companyName = getCol('bedrijfsnaam', 'company_name', 'bedrijf', 'naam', 'company', 'stagebedrijf', 'organisatie', 'bedrijfs_naam') || 'Onbekend';
                    const contactPerson = getCol('contactpersoon', 'contact_person', 'contact', 'contact_naam', 'contactpersoon_naam');
                    const phone = getCol('telefoonnummer', 'telefoon', 'phone', 'phone_number', 'tel', 'mobiel');
                    const street = getCol('adres', 'address', 'straat', 'street') || '';
                    const postcode = getCol('postcode', 'zipcode', 'zip_code', 'zip') || '';
                    const city = getCol('plaats', 'city', 'woonplaats') || '';
                    let fullAddress = street;
                    if (postcode || city) fullAddress += (fullAddress ? ', ' : '') + [postcode, city].filter(Boolean).join(' ');

                    const companyPayload = {
                        company_name: companyName,
                        email: cleanEmail,
                        contact_person: contactPerson || null,
                        phone: phone || null,
                        address: fullAddress || null
                    };
                    if (user_id) companyPayload.id = user_id;

                    const edgeRes = await fetchWithTimeout(`${supabaseUrl}/functions/v1/create-auth-account`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({
                            action: 'upsert-company',
                            metadata: { company: companyPayload }
                        })
                    }, 15000);

                    const edgeData = await edgeRes.json();
                    if (!edgeRes.ok || !edgeData.success) {
                        throw new Error(edgeData.error || 'Opslaan van stagebedrijf in database mislukt');
                    }
                } else if (type === 'supervisor') {
                    const supervisorPayload = {
                        name: getName(),
                        email: cleanEmail,
                        phone: getCol('telefoonnummer') || null,
                        whatsapp_enabled: getCol('whatsapp') === 'true' || getCol('whatsapp') === 'ja' || getCol('whatsapp_enabled') === 'true' || false
                    };
                    if (user_id) supervisorPayload.id = user_id;

                    const edgeRes = await fetchWithTimeout(`${supabaseUrl}/functions/v1/create-auth-account`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({
                            action: 'upsert-supervisor',
                            metadata: { supervisor: supervisorPayload }
                        })
                    }, 15000);

                    const edgeData = await edgeRes.json();
                    if (!edgeRes.ok || !edgeData.success) {
                        throw new Error(edgeData.error || 'Opslaan van stagebegeleider in database mislukt');
                    }
                }

                successCount++;
                const statusVerb = exists ? 'bijgewerkt' : 'toegevoegd';
                if (authWarning) {
                    if (resultsElement) resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">⚠️ ${cleanEmail}: Succesvol ${statusVerb} (let op: ${authWarning})</div>`;
                } else {
                    const passStatus = wachtwoord ? ' (met wachtwoord uit CSV)' : '';
                    if (resultsElement) resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">✅ ${cleanEmail}: Succesvol ${statusVerb}${passStatus}</div>`;
                }
            } catch (error) {
                failCount++;
                let emailDisplay = `Rij ${i + 1}`;
                let errMsg = error.message || 'Onbekende fout';
                if (errMsg.includes('row-level security policy')) {
                    errMsg = 'Supabase beveiliging (RLS) op de database blokkeert het toevoegen. Voer het SQL-script uit in de Supabase SQL Editor om dit vrij te geven.';
                }
                if (resultsElement) resultsElement.innerHTML += `<div class="text-red-600 border-b border-gray-100 py-1">❌ ${emailDisplay}: ${errMsg}</div>`;
            }

            // Update Progress UI
            if (progressElements) {
                if (progressElements.text) progressElements.text.textContent = `${i + 1} / ${total} verwerkt`;
                if (progressElements.bar) progressElements.bar.style.width = `${((i + 1) / total) * 100}%`;
            }
            if (resultsElement) resultsElement.scrollTop = resultsElement.scrollHeight;

            if (i < total - 1) {
                await new Promise(r => setTimeout(r, 40));
            }
        }

        if (resultsElement) {
            resultsElement.innerHTML = `<div class="font-bold py-2 mb-2 bg-gray-50 border-b text-gray-800">🎉 Import afgerond! Succes: ${successCount}, Gefaald: ${failCount}</div>` + resultsElement.innerHTML;
        }
        if (fileInput) fileInput.value = '';

    } catch (globalErr) {
        console.error("Fout tijdens importproces:", globalErr);
        if (resultsElement) resultsElement.innerHTML = `<div class="text-red-600 font-bold py-2">❌ Kritieke importfout: ${globalErr.message}</div>` + resultsElement.innerHTML;
    } finally {
        if (button) {
            button.disabled = false;
            button.classList.remove('opacity-50');
        }
    }
}

// Bulk Uitnodigingen afhandelen
async function handleBulkInvite(type, progressElement, button) {
    const supabase = getImportSupabaseClient();
    const supabaseUrl = window.SUPABASE_URL || window.ENV_SUPABASE_URL || localStorage.getItem('supabaseUrl');
    const supabaseKey = window.SUPABASE_KEY || window.ENV_SUPABASE_KEY || localStorage.getItem('supabaseKey');

    if (!supabase) {
        alert("Supabase is niet geinitialiseerd.");
        return;
    }

    button.disabled = true;
    button.classList.add('opacity-50');
    progressElement.classList.remove('hidden');
    progressElement.className = "mt-3 text-xs text-blue-600 block";
    progressElement.textContent = "🔍 Ophalen van gebruikers...";

    try {
        const table = type === 'company' ? 'Bedrijven' : (type === 'student' ? 'Students' : 'stagebegeleiders');
        const role = type === 'company' ? 'employer' : (type === 'student' ? 'student' : 'supervisor');
        const loginUrl = type === 'company' 
            ? `${window.location.origin}/reset-password.html` 
            : (type === 'student' ? `${window.location.origin}/student-portal.html` : `${window.location.origin}/supervisor-portal.html`);

        const { data: list, error: fetchError } = await supabase
            .from(table)
            .select('*')
            .is('terms_accepted_at', null);

        if (fetchError) throw fetchError;

        if (!list || list.length === 0) {
            progressElement.className = "mt-3 text-xs text-amber-600 block";
            progressElement.textContent = "Geen gebruikers gevonden die nog uitgenodigd moeten worden.";
            button.disabled = false;
            button.classList.remove('opacity-50');
            return;
        }

        const total = list.length;
        progressElement.textContent = `✉️ Bezig met verzenden: 0 / ${total} verwerkt...`;

        let success = 0;
        let failed = 0;
        let failedItems = [];

        for (let i = 0; i < total; i++) {
            const item = list[i];
            const name = type === 'company' ? (item.contact_person || item.company_name) : item.name;
            if (!item.email) {
                failed++;
                failedItems.push({ name: name || 'Onbekend', email: 'Geen e-mailadres', reason: 'Geen e-mailadres ingevuld in database' });
                continue;
            }

            try {
                const authRes = await fetchWithTimeout(`${supabaseUrl}/functions/v1/create-auth-account`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`
                    },
                    body: JSON.stringify({
                        email: item.email.trim().toLowerCase(),
                        password: '',
                        role: role,
                        sendEmail: true,
                        name: name || '',
                        loginUrl: loginUrl,
                        metadata: type === 'company' 
                            ? { company_name: item.company_name, company_id: item.id } 
                            : (type === 'student' ? { class: item.class || '', student_id: item.id } : { supervisor_name: item.name, supervisor_id: item.id })
                    })
                }, 15000);

                const authData = await authRes.json();
                if (!authRes.ok || !authData.success) {
                    throw new Error(authData.error || 'Verzenden uitnodiging mislukt');
                }
                success++;
            } catch (err) {
                console.error(`Failed to invite ${item.email}:`, err);
                failed++;
                failedItems.push({ name: name || item.email, email: item.email, reason: err.message });
            }

            progressElement.textContent = `✉️ Bezig met verzenden: ${i + 1} / ${total} verwerkt...`;
        }

        let resultHtml = `<div>🎉 Voltooid! Welkomstmails verzonden: ${success}, Mislukt: ${failed}.</div>`;
        if (failedItems.length > 0) {
            resultHtml += `<div class="mt-2 text-red-600 font-normal border-t border-red-200 pt-2 space-y-1"><strong>⚠️ Mislukte uitnodigingen (${failedItems.length}):</strong><br>`;
            failedItems.forEach(fi => {
                resultHtml += `• <strong>${fi.name}</strong> (${fi.email}): ${fi.reason}<br>`;
            });
            resultHtml += `</div>`;
        }

        progressElement.className = "mt-3 text-xs text-gray-800 font-semibold block bg-gray-50 p-3 rounded-lg border border-gray-200";
        progressElement.innerHTML = resultHtml;

    } catch (err) {
        console.error('Error in bulk invite:', err);
        progressElement.className = "mt-3 text-xs text-red-600 block";
        progressElement.textContent = "Fout bij het ophalen/verzenden: " + err.message;
    } finally {
        button.disabled = false;
        button.classList.remove('opacity-50');
    }
}

// ----------------------------------------------------
// TOP-LEVEL GLOBAL TRIGGER FUNCTIONS
// Altijd direct beschikbaar voor inline onclick handlers!
// ----------------------------------------------------
window.triggerStudentImport = function() {
    console.log("🚀 triggerStudentImport gestart");
    const fileInput = document.getElementById('students-csv');
    const sendWelcome = document.getElementById('send-welcome-students');
    const container = document.getElementById('students-progress');
    const bar = document.getElementById('students-progress-bar');
    const text = document.getElementById('students-progress-text');
    const results = document.getElementById('students-results');
    const button = document.getElementById('btn-import-students');

    executeImportProcess(
        fileInput,
        'student',
        sendWelcome,
        { container, bar, text },
        results,
        button
    );
};

window.triggerCompanyImport = function() {
    console.log("🚀 triggerCompanyImport gestart");
    const fileInput = document.getElementById('companies-csv');
    const sendWelcome = document.getElementById('send-welcome-companies');
    const container = document.getElementById('companies-progress');
    const bar = document.getElementById('companies-progress-bar');
    const text = document.getElementById('companies-progress-text');
    const results = document.getElementById('companies-results');
    const button = document.getElementById('btn-import-companies');

    executeImportProcess(
        fileInput,
        'company',
        sendWelcome,
        { container, bar, text },
        results,
        button
    );
};

window.triggerSupervisorImport = function() {
    console.log("🚀 triggerSupervisorImport gestart");
    const fileInput = document.getElementById('supervisors-csv');
    const sendWelcome = document.getElementById('send-welcome-supervisors');
    const container = document.getElementById('supervisors-progress');
    const bar = document.getElementById('supervisors-progress-bar');
    const text = document.getElementById('supervisors-progress-text');
    const results = document.getElementById('supervisors-results');
    const button = document.getElementById('btn-import-supervisors');

    executeImportProcess(
        fileInput,
        'supervisor',
        sendWelcome,
        { container, bar, text },
        results,
        button
    );
};

// ----------------------------------------------------
// EVENT LISTENERS INIT WITH NULL GUARDS
// ----------------------------------------------------
function initAdminImport() {
    const btnImportStudents = document.getElementById('btn-import-students');
    const btnImportCompanies = document.getElementById('btn-import-companies');
    const btnImportSupervisors = document.getElementById('btn-import-supervisors');

    if (btnImportStudents) {
        btnImportStudents.addEventListener('click', (e) => {
            e.preventDefault();
            window.triggerStudentImport();
        });
    }

    if (btnImportCompanies) {
        btnImportCompanies.addEventListener('click', (e) => {
            e.preventDefault();
            window.triggerCompanyImport();
        });
    }

    if (btnImportSupervisors) {
        btnImportSupervisors.addEventListener('click', (e) => {
            e.preventDefault();
            window.triggerSupervisorImport();
        });
    }

    const btnInviteStudents = document.getElementById('btn-invite-students');
    const inviteStudentsProgress = document.getElementById('invite-students-progress');
    const btnInviteCompanies = document.getElementById('btn-invite-companies');
    const inviteCompaniesProgress = document.getElementById('invite-companies-progress');
    const btnInviteSupervisors = document.getElementById('btn-invite-supervisors');
    const inviteSupervisorsProgress = document.getElementById('invite-supervisors-progress');

    if (btnInviteStudents) {
        btnInviteStudents.addEventListener('click', () => {
            handleBulkInvite('student', inviteStudentsProgress, btnInviteStudents);
        });
    }

    if (btnInviteCompanies) {
        btnInviteCompanies.addEventListener('click', () => {
            handleBulkInvite('company', inviteCompaniesProgress, btnInviteCompanies);
        });
    }

    if (btnInviteSupervisors) {
        btnInviteSupervisors.addEventListener('click', () => {
            handleBulkInvite('supervisor', inviteSupervisorsProgress, btnInviteSupervisors);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminImport);
} else {
    initAdminImport();
}

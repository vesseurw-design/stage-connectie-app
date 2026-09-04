document.addEventListener('DOMContentLoaded', () => {
    const btnImportStudents = document.getElementById('btn-import-students');
    const fileInputStudents = document.getElementById('students-csv');
    const sendWelcomeStudents = document.getElementById('send-welcome-students');
    const studentsProgress = document.getElementById('students-progress');
    const studentsProgressBar = document.getElementById('students-progress-bar');
    const studentsProgressText = document.getElementById('students-progress-text');
    const studentsResults = document.getElementById('students-results');

    const btnImportCompanies = document.getElementById('btn-import-companies');
    const fileInputCompanies = document.getElementById('companies-csv');
    const sendWelcomeCompanies = document.getElementById('send-welcome-companies');
    const companiesProgress = document.getElementById('companies-progress');
    const companiesProgressBar = document.getElementById('companies-progress-bar');
    const companiesProgressText = document.getElementById('companies-progress-text');
    const companiesResults = document.getElementById('companies-results');

    const btnImportSupervisors = document.getElementById('btn-import-supervisors');
    const fileInputSupervisors = document.getElementById('supervisors-csv');
    const sendWelcomeSupervisors = document.getElementById('send-welcome-supervisors');
    const supervisorsProgress = document.getElementById('supervisors-progress');
    const supervisorsProgressBar = document.getElementById('supervisors-progress-bar');
    const supervisorsProgressText = document.getElementById('supervisors-progress-text');
    const supervisorsResults = document.getElementById('supervisors-results');

    // Initialiseer Supabase client (hergebruik geauthenticeerde window.supabaseClient indien beschikbaar)
    const supabaseUrl = window.SUPABASE_URL || window.ENV_SUPABASE_URL || localStorage.getItem('supabaseUrl');
    const supabaseKey = window.SUPABASE_KEY || window.ENV_SUPABASE_KEY || localStorage.getItem('supabaseKey');
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase configuratie ontbreekt.");
    }
    
    const supabase = window.supabaseClient || window.supabase.createClient(supabaseUrl, supabaseKey);

    // Algemene import functie
    async function handleImport(fileInput, type, sendEmailCheckbox, progressElements, resultsElement, button) {
        const file = fileInput.files[0];
        if (!file) {
            alert('Selecteer eerst een CSV bestand.');
            return;
        }

        // UI Reset
        button.disabled = true;
        button.classList.add('opacity-50');
        progressElements.container.classList.remove('hidden');
        resultsElement.classList.remove('hidden');
        resultsElement.innerHTML = '';
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                const data = results.data;
                const total = data.length;
                let successCount = 0;
                let failCount = 0;

                // Pre-load all companies and supervisors to match names/emails to IDs
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

                progressElements.text.textContent = `0 / ${total} verwerkt`;
                progressElements.bar.style.width = '0%';

                for (let i = 0; i < total; i++) {
                    const row = data[i];
                    try {
                        // Dynamisch en flexibel kolommen ophalen (hoofdletterongevoelig, UTF-8 BOM-safe, meerdere aliassen)
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
                            const nameVal = getCol('naam', 'name', 'volledige_naam', 'student_naam', 'stagiair');
                            if (nameVal) return nameVal;
                            
                            const voornaam = getCol('voornaam', 'first_name', 'firstname');
                            const achternaam = getCol('achternaam', 'last_name', 'lastname');
                            if (voornaam || achternaam) {
                                return `${voornaam || ''} ${achternaam || ''}`.trim();
                            }
                            return 'Onbekend';
                        };

                        let email = getCol('email', 'emailadres', 'e-mail', 'e-mailadres', 'bedrijf_email', 'bedrijfs_email', 'company_email', 'contact_email', 'email_adres', 'mail');
                        let wachtwoord = getCol('wachtwoord', 'password', 'passwd');
                        
                        if (!email) {
                            throw new Error("Geen e-mailadres opgegeven in CSV. Niet toegevoegd.");
                        }

                        // Helper for matching UUID
                        const isUuid = (val) => val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

                        // Find company ID
                        let bedrijfId = getCol('bedrijf_id', 'bedrijfs_id', 'company_id');
                        if (bedrijfId && !isUuid(bedrijfId)) {
                            const matchedCompany = allCompanies.find(c => 
                                c.email?.toLowerCase().trim() === bedrijfId.toLowerCase().trim() ||
                                c.company_name?.toLowerCase().trim() === bedrijfId.toLowerCase().trim()
                            );
                            bedrijfId = matchedCompany ? matchedCompany.id : null;
                        } else if (!bedrijfId) {
                            const companySearch = getCol('stagebedrijf', 'bedrijf', 'company', 'stagebedrijf_naam', 'company_name', 'bedrijfsnaam', 'organisatie');
                            const companyEmail = getCol('stagebedrijf_email', 'bedrijf_email', 'company_email', 'bedrijfs_email');
                            
                            if (companyEmail) {
                                const matchedCompany = allCompanies.find(c => c.email?.toLowerCase().trim() === companyEmail.toLowerCase().trim());
                                if (matchedCompany) bedrijfId = matchedCompany.id;
                            }
                            if (!bedrijfId && companySearch) {
                                const matchedCompany = allCompanies.find(c => c.company_name?.toLowerCase().trim() === companySearch.toLowerCase().trim());
                                if (matchedCompany) bedrijfId = matchedCompany.id;
                            }

                            // Auto-create company ONLY IF companyEmail is provided in CSV
                            if (!bedrijfId && companySearch) {
                                if (!companyEmail) {
                                    resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">ℹ️ Stagebedrijf "${companySearch}" bestaat nog niet in het systeem en heeft geen e-mailadres in de CSV (niet automatisch aangemaakt).</div>`;
                                } else {
                                    try {
                                        let newCompanyId = null;
                                        let emailToUse = companyEmail.trim().toLowerCase();

                                        // 1. Create auth account if email is provided
                                        const functionUrl = `${supabaseUrl}/functions/v1/create-auth-account`;
                                        const authRes = await fetch(functionUrl, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${supabaseKey}`
                                            },
                                            body: JSON.stringify({
                                                email: emailToUse,
                                                password: '', // Leeg laten om uitnodigingslink te sturen
                                                role: 'employer',
                                                sendEmail: sendEmailCheckbox.checked,
                                                name: companySearch,
                                                loginUrl: 'https://ghpc.stageconnectie.nl/employer-portal.html',
                                                metadata: { company_name: companySearch }
                                            })
                                        });

                                        const authResult = await authRes.json();
                                        if (authRes.ok && authResult.success) {
                                            newCompanyId = authResult.user_id;
                                        } else {
                                            console.warn('Could not create auth account for auto-provisioned company:', authResult?.error);
                                        }

                                        // 2. Insert company into the 'Bedrijven' table
                                        const insertData = {
                                            company_name: companySearch,
                                            email: emailToUse
                                        };
                                        if (newCompanyId) {
                                            insertData.id = newCompanyId;
                                        }

                                        const { data: newCompResult, error: insertError } = await supabase
                                            .from('Bedrijven')
                                            .insert([insertData])
                                            .select();

                                        if (insertError) {
                                            throw insertError;
                                        }

                                        if (newCompResult && newCompResult[0]) {
                                            bedrijfId = newCompResult[0].id;
                                            // Cache in-memory
                                            allCompanies.push({
                                                id: bedrijfId,
                                                company_name: companySearch,
                                                email: emailToUse
                                            });
                                            resultsElement.innerHTML += `<div class="text-blue-600 border-b border-gray-100 py-1">🏢 Nieuw stagebedrijf aangemaakt: ${companySearch}</div>`;
                                        }
                                    } catch (compErr) {
                                        console.error('Error auto-creating company:', compErr);
                                        resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">⚠️ Kon stagebedrijf "${companySearch}" niet automatisch aanmaken: ${compErr.message}</div>`;
                                    }
                                }
                            }
                        }

                        // Find supervisor ID
                        let supervisorId = getCol('supervisor_id', 'begeleider_id');
                        if (supervisorId && !isUuid(supervisorId)) {
                            const matchedSupervisor = allSupervisors.find(s => 
                                s.email?.toLowerCase().trim() === supervisorId.toLowerCase().trim() ||
                                s.name?.toLowerCase().trim() === supervisorId.toLowerCase().trim()
                            );
                            supervisorId = matchedSupervisor ? matchedSupervisor.id : null;
                        } else if (!supervisorId) {
                            const supervisorSearch = getCol('begeleider', 'stagebegeleider', 'supervisor', 'begeleider_naam');
                            const supervisorEmail = getCol('begeleider_email', 'stagebegeleider_email', 'supervisor_email');
                            
                            if (supervisorEmail) {
                                const matchedSupervisor = allSupervisors.find(s => s.email?.toLowerCase().trim() === supervisorEmail.toLowerCase().trim());
                                if (matchedSupervisor) supervisorId = matchedSupervisor.id;
                            }
                            if (!supervisorId && supervisorSearch) {
                                const matchedSupervisor = allSupervisors.find(s => s.name?.toLowerCase().trim() === supervisorSearch.toLowerCase().trim());
                                if (matchedSupervisor) supervisorId = matchedSupervisor.id;
                            }

                            // Auto-create supervisor ONLY IF supervisorEmail is provided in CSV
                            if (!supervisorId && supervisorSearch) {
                                if (!supervisorEmail) {
                                    resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">ℹ️ Stagebegeleider "${supervisorSearch}" bestaat nog niet in het systeem en heeft geen e-mailadres in de CSV (niet automatisch aangemaakt).</div>`;
                                } else {
                                    try {
                                        let newSupervisorId = null;
                                        let emailToUse = supervisorEmail.trim().toLowerCase();

                                        // 1. Create auth account if email is provided
                                        const functionUrl = `${supabaseUrl}/functions/v1/create-auth-account`;
                                        const authRes = await fetch(functionUrl, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${supabaseKey}`
                                            },
                                            body: JSON.stringify({
                                                email: emailToUse,
                                                password: '', // Leeg laten om uitnodigingslink te sturen
                                                role: 'supervisor',
                                                sendEmail: sendEmailCheckbox.checked,
                                                name: supervisorSearch,
                                                loginUrl: 'https://ghpc.stageconnectie.nl/supervisor-portal.html'
                                            })
                                        });

                                        const authResult = await authRes.json();
                                        if (authRes.ok && authResult.success) {
                                            newSupervisorId = authResult.user_id;
                                        } else {
                                            console.warn('Could not create auth account for auto-provisioned supervisor:', authResult?.error);
                                        }

                                        // 2. Insert supervisor into 'stagebegeleiders' table
                                        const insertData = {
                                            name: supervisorSearch,
                                            email: emailToUse
                                        };
                                        if (newSupervisorId) {
                                            insertData.id = newSupervisorId;
                                        }

                                        const { data: newSupResult, error: insertError } = await supabase
                                            .from('stagebegeleiders')
                                            .insert([insertData])
                                            .select();

                                        if (insertError) {
                                            throw insertError;
                                        }

                                        if (newSupResult && newSupResult[0]) {
                                            supervisorId = newSupResult[0].id;
                                            // Cache in-memory
                                            allSupervisors.push({
                                                id: supervisorId,
                                                name: supervisorSearch,
                                                email: emailToUse
                                            });
                                            resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">🏫 Nieuwe stagebegeleider aangemaakt: ${supervisorSearch}</div>`;
                                        }
                                    } catch (supErr) {
                                        console.error('Error auto-creating supervisor:', supErr);
                                        resultsElement.innerHTML += `<div class="text-amber-600 border-b border-gray-100 py-1">⚠️ Kon stagebegeleider "${supervisorSearch}" niet automatisch aanmaken: ${supErr.message}</div>`;
                                    }
                                }
                            }
                        }

                        // Parse start and end dates
                        const formatDateISO = (dateStr) => {
                            if (!dateStr) return null;
                            dateStr = dateStr.trim();
                            const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
                            const match = dateStr.match(dmyRegex);
                            if (match) {
                                const day = match[1].padStart(2, '0');
                                const month = match[2].padStart(2, '0');
                                const year = match[3];
                                return `${year}-${month}-${day}`;
                            }
                            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                                return dateStr;
                            }
                            const parsed = new Date(dateStr);
                            if (!isNaN(parsed.getTime())) {
                                return parsed.toISOString().split('T')[0];
                            }
                            return null;
                        };

                        const startDate = formatDateISO(getCol('stage_start_date') || getCol('startdatum_stage') || getCol('startdatum') || getCol('stage_start') || getCol('start_date'));
                        const endDate = formatDateISO(getCol('stage_end_date') || getCol('einddatum_stage') || getCol('einddatum') || getCol('stage_end') || getCol('end_date'));

                        // Check of record al bestaat in database
                        let user_id = null;
                        let exists = false;

                        if (type === 'student') {
                            const { data: existingStudent, error: checkError } = await supabase
                                .from('Students')
                                .select('id')
                                .eq('email', email.trim().toLowerCase())
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
                                .eq('email', email.trim().toLowerCase())
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
                                .eq('email', email.trim().toLowerCase())
                                .maybeSingle();
                            
                            if (checkError) throw checkError;
                            if (existingSupervisor) {
                                user_id = existingSupervisor.id;
                                exists = true;
                            }
                        }

                        if (exists) {
                            // Bestaande gebruiker: update gegevens
                            if (type === 'student') {
                                const { error: dbError } = await supabase
                                    .from('Students')
                                    .update({
                                        name: getName(),
                                        class: getCol('klas') || null,
                                        school_year: getCol('schooljaar') || getCol('school_year') || null,
                                        company_id: bedrijfId || null,
                                        supervisor_id: supervisorId || null,
                                        stage_start_date: startDate || null,
                                        stage_end_date: endDate || null
                                    })
                                    .eq('id', user_id);
                                if (dbError) throw dbError;
                            } else if (type === 'company') {
                                const companyName = getCol('bedrijfsnaam', 'company_name', 'bedrijf', 'naam', 'company', 'stagebedrijf', 'organisatie', 'bedrijfs_naam') || 'Onbekend';
                                const contactPerson = getCol('contactpersoon', 'contact_person', 'contact', 'contact_naam', 'contactpersoon_naam');
                                const phone = getCol('telefoonnummer', 'telefoon', 'phone', 'phone_number', 'tel', 'mobiel');
                                const street = getCol('adres', 'address', 'straat', 'street') || '';
                                const postcode = getCol('postcode', 'zipcode', 'zip_code', 'zip') || '';
                                const city = getCol('plaats', 'city', 'woonplaats') || '';
                                let fullAddress = street;
                                if (postcode || city) {
                                    fullAddress += (fullAddress ? ', ' : '') + [postcode, city].filter(Boolean).join(' ');
                                }

                                const { error: dbError } = await supabase
                                    .from('Bedrijven')
                                    .update({
                                        company_name: companyName,
                                        contact_person: contactPerson || null,
                                        phone: phone || null,
                                        address: fullAddress || null
                                    })
                                    .eq('id', user_id);
                                if (dbError) throw dbError;
                            } else if (type === 'supervisor') {
                                const { error: dbError } = await supabase
                                    .from('stagebegeleiders')
                                    .update({
                                        name: getName(),
                                        phone: getCol('telefoonnummer') || null,
                                        whatsapp_enabled: getCol('whatsapp') === 'true' || getCol('whatsapp') === 'ja' || getCol('whatsapp_enabled') === 'true' || false
                                    })
                                    .eq('id', user_id);
                                if (dbError) throw dbError;
                            }
                            successCount++;
                            resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">🔄 ${email}: Succesvol bijgewerkt</div>`;
                        } else {
                            // Nieuwe gebruiker: vereist wachtwoord voor studenten
                            if (!wachtwoord && type === 'student') {
                                throw new Error("Nieuwe stagiair mist 'wachtwoord' kolom.");
                            }

                            const functionUrl = `${supabaseUrl}/functions/v1/create-auth-account`;
                            let role = type === 'student' ? 'student' : (type === 'company' ? 'employer' : 'supervisor');
                            let name = type === 'student' ? getName() : (type === 'company' ? (getCol('contactpersoon') || getCol('bedrijfsnaam')) : getName());
                            let loginUrl = type === 'student' 
                                ? 'https://ghpc.stageconnectie.nl/student-portal.html' 
                                : (type === 'company' ? 'https://ghpc.stageconnectie.nl/employer-portal.html' : 'https://ghpc.stageconnectie.nl/supervisor-portal.html');
                            
                            const authRes = await fetch(functionUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${supabaseKey}`
                                },
                                body: JSON.stringify({
                                    email: email.trim().toLowerCase(),
                                    password: wachtwoord || '',
                                    role: role,
                                    metadata: { source: 'csv_import' },
                                    sendEmail: sendEmailCheckbox.checked,
                                    name: name || '',
                                    loginUrl: loginUrl
                                })
                            });

                            const authData = await authRes.json();
                            if (!authRes.ok || !authData.success) {
                                throw new Error(authData.error || 'Aanmaken account/uitnodiging mislukt');
                            }

                            user_id = authData.user_id;

                            // 2. Voeg toe aan database tabel
                            if (type === 'student') {
                                const { error: dbError } = await supabase.from('Students').insert([{
                                    id: user_id,
                                    name: getName(),
                                    email: email.trim().toLowerCase(),
                                    class: getCol('klas') || null,
                                    school_year: getCol('schooljaar') || getCol('school_year') || null,
                                    company_id: bedrijfId || null,
                                    supervisor_id: supervisorId || null,
                                    stage_start_date: startDate || null,
                                    stage_end_date: endDate || null
                                }]);
                                if (dbError) throw dbError;

                            } else if (type === 'company') {
                                const companyName = getCol('bedrijfsnaam', 'company_name', 'bedrijf', 'naam', 'company', 'stagebedrijf', 'organisatie', 'bedrijfs_naam') || 'Onbekend';
                                const contactPerson = getCol('contactpersoon', 'contact_person', 'contact', 'contact_naam', 'contactpersoon_naam');
                                const phone = getCol('telefoonnummer', 'telefoon', 'phone', 'phone_number', 'tel', 'mobiel');
                                const street = getCol('adres', 'address', 'straat', 'street') || '';
                                const postcode = getCol('postcode', 'zipcode', 'zip_code', 'zip') || '';
                                const city = getCol('plaats', 'city', 'woonplaats') || '';
                                let fullAddress = street;
                                if (postcode || city) {
                                    fullAddress += (fullAddress ? ', ' : '') + [postcode, city].filter(Boolean).join(' ');
                                }

                                const { error: dbError } = await supabase.from('Bedrijven').insert([{
                                    id: user_id,
                                    company_name: companyName,
                                    email: email.trim().toLowerCase(),
                                    contact_person: contactPerson || null,
                                    phone: phone || null,
                                    address: fullAddress || null
                                }]);
                                if (dbError) throw dbError;
                            } else if (type === 'supervisor') {
                                const { error: dbError } = await supabase.from('stagebegeleiders').insert([{
                                    id: user_id,
                                    name: getName(),
                                    email: email.trim().toLowerCase(),
                                    phone: getCol('telefoonnummer') || null,
                                    whatsapp_enabled: getCol('whatsapp') === 'true' || getCol('whatsapp') === 'ja' || getCol('whatsapp_enabled') === 'true' || false
                                }]);
                                if (dbError) throw dbError;
                            }

                            successCount++;
                            resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">✅ ${email}: Succesvol toegevoegd</div>`;
                        }
                    } catch (error) {
                        failCount++;
                        let emailDisplay = email || getCol('bedrijfsnaam', 'company_name', 'bedrijf', 'naam', 'company') || getName() || row.email || row.Email || `Rij ${i + 1}`;
                        resultsElement.innerHTML += `<div class="text-red-600 border-b border-gray-100 py-1">❌ ${emailDisplay}: ${error.message}</div>`;
                    }

                    // Update UI Progress
                    progressElements.text.textContent = `${i + 1} / ${total} verwerkt`;
                    progressElements.bar.style.width = `${((i + 1) / total) * 100}%`;
                    resultsElement.scrollTop = resultsElement.scrollHeight; // Auto-scroll
                }

                // Afronding
                resultsElement.innerHTML = `<div class="font-bold py-2 mb-2 bg-gray-50 border-b">🎉 Import afgerond! Succes: ${successCount}, Gefaald: ${failCount}</div>` + resultsElement.innerHTML;
                fileInput.value = '';
                button.disabled = false;
                button.classList.remove('opacity-50');
            }
        });
    }

    btnImportStudents.addEventListener('click', () => {
        handleImport(
            fileInputStudents, 
            'student', 
            sendWelcomeStudents, 
            { container: studentsProgress, bar: studentsProgressBar, text: studentsProgressText },
            studentsResults,
            btnImportStudents
        );
    });

    btnImportCompanies.addEventListener('click', () => {
        handleImport(
            fileInputCompanies, 
            'company', 
            sendWelcomeCompanies, 
            { container: companiesProgress, bar: companiesProgressBar, text: companiesProgressText },
            companiesResults,
            btnImportCompanies
        );
    });

    btnImportSupervisors.addEventListener('click', () => {
        handleImport(
            fileInputSupervisors, 
            'supervisor', 
            sendWelcomeSupervisors, 
            { container: supervisorsProgress, bar: supervisorsProgressBar, text: supervisorsProgressText },
            supervisorsResults,
            btnImportSupervisors
        );
    });

    // Bulk invitation handler
    async function handleBulkInvite(type, progressElement, button) {
        button.disabled = true;
        button.classList.add('opacity-50');
        progressElement.classList.remove('hidden');
        progressElement.className = "mt-3 text-xs text-blue-600 block";
        progressElement.textContent = "🔍 Ophalen van gebruikers...";

        try {
            const table = type === 'company' ? 'Bedrijven' : (type === 'student' ? 'Students' : 'stagebegeleiders');
            const role = type === 'company' ? 'employer' : (type === 'student' ? 'student' : 'supervisor');
            const loginUrl = type === 'company' 
                ? 'https://ghpc.stageconnectie.nl/employer-portal.html' 
                : (type === 'student' ? 'https://ghpc.stageconnectie.nl/student-portal.html' : 'https://ghpc.stageconnectie.nl/supervisor-portal.html');

            // Query users who have NOT accepted terms yet (meaning they haven't logged in)
            const { data: list, error: fetchError } = await supabase
                .from(table)
                .select('*')
                .is('terms_accepted_at', null);

            if (fetchError) throw fetchError;

            if (!list || list.length === 0) {
                progressElement.className = "mt-3 text-xs text-amber-600 block";
                progressElement.textContent = "Geen gebruikers gevonden die nog uitgenodigd moeten worden (iedereen heeft al ingelogd of er zijn geen records).";
                button.disabled = false;
                button.classList.remove('opacity-50');
                return;
            }

            const total = list.length;
            progressElement.textContent = `✉️ Bezig met verzenden: 0 / ${total} verwerkt...`;

            let success = 0;
            let failed = 0;

            for (let i = 0; i < total; i++) {
                const item = list[i];
                if (!item.email) {
                    failed++;
                    continue;
                }

                try {
                    const name = type === 'company' ? (item.contact_person || item.company_name) : item.name;
                    const functionUrl = `${supabaseUrl}/functions/v1/create-auth-account`;
                    
                    const authRes = await fetch(functionUrl, {
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
                    });

                    const authData = await authRes.json();
                    if (!authRes.ok || !authData.success) {
                        throw new Error(authData.error || 'Failed invitation');
                    }
                    success++;
                } catch (err) {
                    console.error(`Failed to invite ${item.email}:`, err);
                    failed++;
                }

                progressElement.textContent = `✉️ Bezig met verzenden: ${i + 1} / ${total} verwerkt...`;
            }

            progressElement.className = "mt-3 text-xs text-green-600 font-semibold block";
            progressElement.textContent = `🎉 Voltooid! Welkomstmails verzonden: ${success}, Mislukt: ${failed}.`;

        } catch (err) {
            console.error('Error in bulk invite:', err);
            progressElement.className = "mt-3 text-xs text-red-600 block";
            progressElement.textContent = "Fout bij het ophalen/verzenden: " + err.message;
        } finally {
            button.disabled = false;
            button.classList.remove('opacity-50');
        }
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
});

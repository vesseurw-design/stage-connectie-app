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

    // Initialiseer Supabase client (gebruikt window.supabase uit auth scripts)
    const supabaseUrl = window.SUPABASE_URL || window.ENV_SUPABASE_URL || localStorage.getItem('supabaseUrl');
    const supabaseKey = window.SUPABASE_KEY || window.ENV_SUPABASE_KEY || localStorage.getItem('supabaseKey');
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase configuratie ontbreekt in localStorage.");
    }
    
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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
                        // Dynamisch kolommen ophalen (hoofdletterongevoelig)
                        const getCol = (name) => {
                            const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
                            return key ? row[key] : null;
                        };

                        const getName = () => {
                            const nameVal = getCol('naam') || getCol('name');
                            if (nameVal) return nameVal;
                            
                            const voornaam = getCol('voornaam') || getCol('first_name') || getCol('firstname');
                            const achternaam = getCol('achternaam') || getCol('last_name') || getCol('lastname');
                            if (voornaam || achternaam) {
                                return `${voornaam || ''} ${achternaam || ''}`.trim();
                            }
                            return 'Onbekend';
                        };

                        let email = getCol('email');
                        let wachtwoord = getCol('wachtwoord');
                        
                        if (!email) {
                            throw new Error("Rij mist 'email' kolom.");
                        }

                        // Helper for matching UUID
                        const isUuid = (val) => val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

                        // Find company ID
                        let bedrijfId = getCol('bedrijf_id') || getCol('bedrijfs_id') || getCol('company_id');
                        if (bedrijfId && !isUuid(bedrijfId)) {
                            const matchedCompany = allCompanies.find(c => 
                                c.email?.toLowerCase().trim() === bedrijfId.toLowerCase().trim() ||
                                c.company_name?.toLowerCase().trim() === bedrijfId.toLowerCase().trim()
                            );
                            bedrijfId = matchedCompany ? matchedCompany.id : null;
                        } else if (!bedrijfId) {
                            const companySearch = getCol('stagebedrijf') || getCol('bedrijf') || getCol('company') || getCol('stagebedrijf_naam') || getCol('company_name');
                            const companyEmail = getCol('stagebedrijf_email') || getCol('bedrijf_email') || getCol('company_email');
                            
                            if (companyEmail) {
                                const matchedCompany = allCompanies.find(c => c.email?.toLowerCase().trim() === companyEmail.toLowerCase().trim());
                                if (matchedCompany) bedrijfId = matchedCompany.id;
                            }
                            if (!bedrijfId && companySearch) {
                                const matchedCompany = allCompanies.find(c => c.company_name?.toLowerCase().trim() === companySearch.toLowerCase().trim());
                                if (matchedCompany) bedrijfId = matchedCompany.id;
                            }

                            // Auto-create company if name is provided but not found
                            if (!bedrijfId && companySearch) {
                                try {
                                    let newCompanyId = null;
                                    let emailToUse = companyEmail ? companyEmail.trim().toLowerCase() : null;

                                    // 1. Create auth account if email is provided
                                    if (emailToUse) {
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
                                                sendEmail: true,
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

                        // Find supervisor ID
                        let supervisorId = getCol('supervisor_id') || getCol('begeleider_id');
                        if (supervisorId && !isUuid(supervisorId)) {
                            const matchedSupervisor = allSupervisors.find(s => 
                                s.email?.toLowerCase().trim() === supervisorId.toLowerCase().trim() ||
                                s.name?.toLowerCase().trim() === supervisorId.toLowerCase().trim()
                            );
                            supervisorId = matchedSupervisor ? matchedSupervisor.id : null;
                        } else if (!supervisorId) {
                            const supervisorSearch = getCol('begeleider') || getCol('stagebegeleider') || getCol('supervisor') || getCol('begeleider_naam');
                            const supervisorEmail = getCol('begeleider_email') || getCol('stagebegeleider_email') || getCol('supervisor_email');
                            
                            if (supervisorEmail) {
                                const matchedSupervisor = allSupervisors.find(s => s.email?.toLowerCase().trim() === supervisorEmail.toLowerCase().trim());
                                if (matchedSupervisor) supervisorId = matchedSupervisor.id;
                            }
                            if (!supervisorId && supervisorSearch) {
                                const matchedSupervisor = allSupervisors.find(s => s.name?.toLowerCase().trim() === supervisorSearch.toLowerCase().trim());
                                if (matchedSupervisor) supervisorId = matchedSupervisor.id;
                            }

                            // Auto-create supervisor if not found
                            if (!supervisorId && supervisorSearch) {
                                try {
                                    let newSupervisorId = null;
                                    let emailToUse = supervisorEmail ? supervisorEmail.trim().toLowerCase() : null;

                                    // 1. Create auth account if email is provided
                                    if (emailToUse) {
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
                                                sendEmail: true,
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
                                const { error: dbError } = await supabase
                                    .from('Bedrijven')
                                    .update({
                                        company_name: getCol('bedrijfsnaam') || 'Onbekend',
                                        contact_person: getCol('contactpersoon') || null,
                                        phone: getCol('telefoonnummer') || null,
                                        address: getCol('adres') || null,
                                        postal_code: getCol('postcode') || null,
                                        city: getCol('plaats') || null
                                    })
                                    .eq('id', user_id);
                                if (dbError) throw dbError;
                            } else if (type === 'supervisor') {
                                const { error: dbError } = await supabase
                                    .from('stagebegeleiders')
                                    .update({
                                        name: getName(),
                                        phone: getCol('telefoonnummer') || null
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
                                    sendEmail: (type === 'company' || type === 'supervisor') ? true : sendEmailCheckbox.checked,
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
                                const { error: dbError } = await supabase.from('Bedrijven').insert([{
                                    id: user_id,
                                    company_name: getCol('bedrijfsnaam') || 'Onbekend',
                                    email: email.trim().toLowerCase(),
                                    contact_person: getCol('contactpersoon') || null,
                                    phone: getCol('telefoonnummer') || null,
                                    address: getCol('adres') || null,
                                    postal_code: getCol('postcode') || null,
                                    city: getCol('plaats') || null
                                }]);
                                if (dbError) throw dbError;
                            } else if (type === 'supervisor') {
                                const { error: dbError } = await supabase.from('stagebegeleiders').insert([{
                                    id: user_id,
                                    name: getName(),
                                    email: email.trim().toLowerCase(),
                                    phone: getCol('telefoonnummer') || null
                                }]);
                                if (dbError) throw dbError;
                            }

                            successCount++;
                            resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">✅ ${email}: Succesvol toegevoegd</div>`;
                        }
                    } catch (error) {
                        failCount++;
                        let emailDisplay = row.email || row.Email || 'Onbekend';
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
});

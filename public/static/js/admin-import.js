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

                        let email = getCol('email');
                        let wachtwoord = getCol('wachtwoord');
                        
                        if (!email || !wachtwoord) {
                            throw new Error("Rij mist 'email' of 'wachtwoord' kolom.");
                        }

                        // 1. Maak Auth Account aan via Edge Function
                        const functionUrl = `${supabaseUrl}/functions/v1/create-auth-account`;
                        
                        let role = type === 'student' ? 'student' : 'employer';
                        let name = type === 'student' ? getCol('naam') : getCol('bedrijfsnaam');
                        let loginUrl = type === 'student' ? 'https://stageconnectie.nl/student-login.html' : 'https://stageconnectie.nl/employer-login.html';
                        
                        const authRes = await fetch(functionUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${supabaseKey}`
                            },
                            body: JSON.stringify({
                                email: email.trim().toLowerCase(),
                                password: wachtwoord,
                                role: role,
                                metadata: { source: 'csv_import' },
                                sendEmail: sendEmailCheckbox.checked,
                                name: name || '',
                                loginUrl: loginUrl
                            })
                        });

                        const authData = await authRes.json();
                        if (!authRes.ok || !authData.success) {
                            throw new Error(authData.error || 'Aanmaken account mislukt');
                        }

                        const user_id = authData.user_id;

                        // 2. Voeg toe aan database tabel
                        if (type === 'student') {
                            const bedrijfId = getCol('bedrijf_id') || getCol('bedrijfs_id');
                            const { error: dbError } = await supabase.from('Students').insert([{
                                id: user_id,
                                name: getCol('naam') || 'Onbekend',
                                email: email.trim().toLowerCase(),
                                class: getCol('klas') || null,
                                company_id: bedrijfId ? bedrijfId : null
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
                        }

                        successCount++;
                        resultsElement.innerHTML += `<div class="text-green-600 border-b border-gray-100 py-1">✅ ${email}: Succesvol toegevoegd</div>`;
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
});

/**
 * StageConnectie Dynamic Environment Configuration
 * Dit bestand matcht het subdomein met het bijbehorende Supabase-project.
 */

const DB_CONFIGS = {
    // Groene Hart Pro College
    'ghpc.stageconnectie.nl': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 250,
        schoolName: 'Groene Hart Pro College',
        logo: 'logo-ghpc-v2.png',
        canManageDemos: true,
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl',
        },
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid door te geven.",
            "💬 Ik heb een appje gestuurd naar mijn coach/stagebegeleider.",
            "🏫 Mijn ouders hebben naar school gebeld voor ziekmelding."
        ]
    },
    // Huidige hoofddomeinen
    'stageconnectie.nl': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 500,
        schoolName: 'StageConnectie',
        logo: 'logo-stageconnectie.png',
        canManageDemos: true,
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl',
        },
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid door te geven.",
            "💬 Ik heb een appje gestuurd naar mijn coach/stagebegeleider.",
            "🏫 Mijn ouders hebben naar school gebeld voor ziekmelding."
        ]
    },
    'www.stageconnectie.nl': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 500,
        schoolName: 'StageConnectie',
        logo: 'logo-stageconnectie.png',
        canManageDemos: true,
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl',
        },
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid door te geven.",
            "💬 Ik heb een appje gestuurd naar mijn coach/stagebegeleider.",
            "🏫 Mijn ouders hebben naar school gebeld voor ziekmelding."
        ]
    },
    // De Poort praktijkonderwijs (Nieuwe school per 1 januari)
    'depoort.stageconnectie.nl': {
        url: 'https://vvfvakpnotvehjcndrxh.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZnZha3Bub3R2ZWhqY25kcnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDMzMTgsImV4cCI6MjEwNzcxOTMxOH0.TpgkP6EvWxrCf0NN0g0qySvikd3NdWOH7lVef5E_Oeg',
        maxStudents: 100,
        schoolName: 'De Poort praktijkonderwijs',
        logo: 'logo-depoort.png',
        canManageDemos: false,
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid te melden.",
            "💬 Ik heb mijn stagebegeleider een bericht gestuurd via WhatsApp/Teams.",
            "🏫 Mijn ouders/verzorgers hebben de school gebeld voor ziekmelding."
        ]
    },
    // ProZoetermeer (Toekomstige school)
    'prozoetermeer.stageconnectie.nl': {
        url: 'https://your-prozoetermeer-project.supabase.co', // TODO: Vervangen door daadwerkelijke Supabase URL
        key: 'hier-komt-de-anon-key-van-de-nieuwe-school',
        maxStudents: 150,
        schoolName: 'Pro Zoetermeer',
        logo: 'logo-prozoetermeer.png',
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid te melden.",
            "💬 Ik heb mijn stagebegeleider een bericht gestuurd via Teams/WhatsApp.",
            "🏫 Ik heb me afgemeld via de school-app (Magister/SOM)."
        ]
    },
    // Lokale ontwikkelomgeving fallback
    'localhost': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 250,
        schoolName: 'Groene Hart Pro College',
        logo: 'logo-ghpc-v2.png',
        canManageDemos: true,
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl',
        },
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid door te geven.",
            "💬 Ik heb een appje gestuurd naar mijn coach/stagebegeleider.",
            "🏫 Mijn ouders hebben naar school gebeld voor ziekmelding."
        ]
    }
};

(function() {
    const hostname = window.location.hostname.toLowerCase();
    
    // Selecteer de juiste configuratie
    let config = DB_CONFIGS[hostname];
    
    // Als er geen exacte match is, controleer op subdomeinen of lokaal/file protocol
    if (!config) {
        if (hostname.includes('depoort')) {
            config = DB_CONFIGS['depoort.stageconnectie.nl'];
        } else if (hostname.includes('ghpc') || hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1') {
            config = DB_CONFIGS['ghpc.stageconnectie.nl'];
        } else if (hostname.includes('prozoetermeer')) {
            config = DB_CONFIGS['prozoetermeer.stageconnectie.nl'];
        } else {
            // Fallback naar GHPC
            config = DB_CONFIGS['ghpc.stageconnectie.nl'];
        }
    }

    // Ondersteun ?school=depoort voor veilig testen zonder dat het subdomein live hoeft te staan
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let schoolParam = (urlParams.get('school') || '').toLowerCase();
        
        if (schoolParam) {
            sessionStorage.setItem('sc_school_override', schoolParam);
        } else {
            schoolParam = (sessionStorage.getItem('sc_school_override') || '').toLowerCase();
        }

        if (schoolParam === 'depoort') {
            config = DB_CONFIGS['depoort.stageconnectie.nl'];
        } else if (schoolParam === 'ghpc') {
            config = DB_CONFIGS['ghpc.stageconnectie.nl'];
        }
    } catch (e) {}
    
    // Zet de configuratie op het window-object
    window.SUPABASE_URL = config.url;
    window.SUPABASE_KEY = config.key;
    window.MAX_STUDENTS = config.maxStudents || null;
    window.SCHOOL_NAME = config.schoolName || 'StageConnectie';
    window.SCHOOL_LOGO = config.logo || 'logo.png';
    window.DEMO_CREDENTIALS = config.demoCredentials || null;
    window.ABSENCE_STEPS = config.absenceSteps || [];
    window.CAN_MANAGE_DEMOS = !!config.canManageDemos;
    
    // Optionele vaste fallback demo-codes met verloopdatum (YYYY-MM-DD)
    window.DEMO_TEMPORARY_CODES = [];

    /**
     * Valideert of een ingevoerde demo-code geldig en niet verlopen is.
     * Controleert rechtstreeks in de Supabase DemoCodes tabel van het hoofdplatform.
     */
    window.validateDemoCode = async function(input) {
        if (!input) return false;
        const code = input.trim().toUpperCase();

        // 1. Controleer in Supabase DemoCodes tabel (hoofdplatform)
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const checkUrl = `https://vdeipnqyesduiohxvuvu.supabase.co/rest/v1/DemoCodes?code=eq.${encodeURIComponent(code)}&is_active=eq.true&expires_at=gte.${todayStr}&select=id,code,expires_at`;
            const res = await fetch(checkUrl, {
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU'
                }
            });
            if (res.ok) {
                const rows = await res.json();
                if (Array.isArray(rows) && rows.length > 0) {
                    return true;
                }
            }
        } catch (err) {
            console.warn('Demo code verificatie via database mislukt:', err);
        }

        // 2. Veilige fallback uit window.DEMO_TEMPORARY_CODES (indien ingesteld)
        if (window.DEMO_TEMPORARY_CODES && Array.isArray(window.DEMO_TEMPORARY_CODES)) {
            const now = new Date();
            const found = window.DEMO_TEMPORARY_CODES.find(item => item.code.toUpperCase() === code);
            if (found && found.expires) {
                const expDate = new Date(found.expires + 'T23:59:59');
                if (now <= expDate) return true;
            }
        }

        return false;
    };

    console.log(`🔌 StageConnectie geconfigureerd voor tenant: ${hostname} (Database: ${config.url}, School: ${window.SCHOOL_NAME})`);
})();

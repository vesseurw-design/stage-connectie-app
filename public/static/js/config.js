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
        schoolName: 'Groene Hart Praktijkschool',
        logo: 'logo-ghpc-v2.png',
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl'
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
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl'
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
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl'
        },
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid door te geven.",
            "💬 Ik heb een appje gestuurd naar mijn coach/stagebegeleider.",
            "🏫 Mijn ouders hebben naar school gebeld voor ziekmelding."
        ]
    },
    // ProZoetermeer (Nieuwe school)
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
        schoolName: 'Groene Hart Praktijkschool (Localhost)',
        logo: 'logo-ghpc-v2.png',
        demoCredentials: {
            student: 'fake@leerling.nl',
            supervisor: 'stage@begeleider.nl',
            employer: 'test@testbedrijf.nl'
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
        if (hostname.includes('ghpc') || hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1') {
            config = DB_CONFIGS['ghpc.stageconnectie.nl'];
        } else if (hostname.includes('prozoetermeer')) {
            config = DB_CONFIGS['prozoetermeer.stageconnectie.nl'];
        } else {
            // Fallback naar GHPC
            config = DB_CONFIGS['ghpc.stageconnectie.nl'];
        }
    }
    
    // Zet de configuratie op het window-object
    window.SUPABASE_URL = config.url;
    window.SUPABASE_KEY = config.key;
    window.MAX_STUDENTS = config.maxStudents || null;
    window.SCHOOL_NAME = config.schoolName || 'StageConnectie';
    window.SCHOOL_LOGO = config.logo || 'logo.png';
    window.DEMO_CREDENTIALS = config.demoCredentials || null;
    window.ABSENCE_STEPS = config.absenceSteps || [];
    
    // Tijdelijke demo-codes met verloopdatum (YYYY-MM-DD)
    window.DEMO_TEMPORARY_CODES = [
        { code: 'PRESENTATIE', expires: '2026-10-09' }, // 1 week geldig
        { code: 'DEMO-WEEK', expires: '2026-10-09' }     // 1 week geldig
    ];

    /**
     * Valideert of een ingevoerde demo-code geldig en niet verlopen is
     */
    window.validateDemoCode = function(input) {
        if (!input) return false;
        const code = input.trim().toUpperCase();

        // 1. Vaste standaardcodes
        const staticCodes = ['DEMO2026', 'PRESENTATIE', 'STAGE2026', 'STAGE2025', 'DEMO'];
        if (staticCodes.includes(code)) return true;

        // 2. Datum-gebaseerde tijdelijke codes (bijv. DEMO-0910, DEMO-1710, DEMO-0917 -> flexibele verloopdatum)
        const matchDigits = code.match(/^(?:DEMO|STAGE|CODE|PRO|PRES)-(\d{2})(\d{2})$/);
        if (matchDigits) {
            let num1 = parseInt(matchDigits[1], 10);
            let num2 = parseInt(matchDigits[2], 10);
            let day, month;

            if (num1 > 12 && num1 <= 31) {
                // bijv. DEMO-1710 -> Dag 17, Maand 10 (17 oktober)
                day = num1;
                month = num2 - 1;
            } else if (num2 > 12 && num2 <= 31) {
                // bijv. DEMO-0917 of DEMO-1017 -> Dag 17, Maand 10/9
                day = num2;
                month = num1 - 1;
            } else {
                // bijv. DEMO-0910 -> Dag 9, Maand 10 (9 oktober)
                day = num1;
                month = num2 - 1;
            }

            const now = new Date();
            if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                const expDate = new Date(now.getFullYear(), month, day, 23, 59, 59);
                if (now <= expDate) {
                    return true;
                }
            }
        }

        // 3. Volledige datum codes (bijv. DEMO-20261009 -> geldig t/m 9 okt 2026)
        const matchFullDate = code.match(/^(?:DEMO|STAGE|CODE|PRO)-(\d{4})(\d{2})(\d{2})$/);
        if (matchFullDate) {
            const year = parseInt(matchFullDate[1], 10);
            const month = parseInt(matchFullDate[2], 10) - 1;
            const day = parseInt(matchFullDate[3], 10);
            const now = new Date();
            const expDate = new Date(year, month, day, 23, 59, 59);
            if (now <= expDate) {
                return true;
            }
        }

        // 4. Custom tijdelijke codes uit window.DEMO_TEMPORARY_CODES
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

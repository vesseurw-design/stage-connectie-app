/**
 * StageConnectie Dynamic Environment Configuration
 * Dit bestand matcht het subdomein met het bijbehorende Supabase-project.
 */

const DB_CONFIGS = {
    // Groene Hart Pro College
    'ghpc.stageconnectie.nl': {
        url: 'https://ukqogebsengneaqrlhrr.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW9nZWJzZW5nbmVhcXJsaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzMzMzksImV4cCI6MjA5ODY0OTMzOX0.KJ_B8cinUY7b6OtUkF1EPmySw9GqGhQ1XvWj7SPh30s',
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
        absenceSteps: [
            "📞 Ik heb mijn stagebedrijf gebeld om mijn afwezigheid door te geven.",
            "💬 Ik heb een appje gestuurd naar mijn coach/stagebegeleider.",
            "🏫 Mijn ouders hebben naar school gebeld voor ziekmelding."
        ]
    },
    'www.stageconnectie.nl': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA8MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 500,
        schoolName: 'StageConnectie',
        logo: 'logo-stageconnectie.png',
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
        url: 'https://ukqogebsengneaqrlhrr.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW9nZWJzZW5nbmVhcXJsaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzMzMzksImV4cCI6MjA5ODY0OTMzOX0.KJ_B8cinUY7b6OtUkF1EPmySw9GqGhQ1XvWj7SPh30s',
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
    
    console.log(`🔌 StageConnectie geconfigureerd voor tenant: ${hostname} (Database: ${config.url}, School: ${window.SCHOOL_NAME})`);
})();

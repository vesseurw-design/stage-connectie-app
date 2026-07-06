/**
 * StageConnectie Dynamic Environment Configuration
 * Dit bestand matcht het subdomein met het bijbehorende Supabase-project.
 */

const DB_CONFIGS = {
    // Groene Hart Pro College
    'ghpc.stageconnectie.nl': {
        url: 'https://ukqogebsengneaqrlhrr.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcW9nZWJzZW5nbmVhcXJsaHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzMzMzksImV4cCI6MjA5ODY0OTMzOX0.KJ_B8cinUY7b6OtUkF1EPmySw9GqGhQ1XvWj7SPh30s',
        maxStudents: 250
    },
    // Huidige hoofddomeinen
    'stageconnectie.nl': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 500
    },
    'www.stageconnectie.nl': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 500
    },
    // ProZoetermeer (Nieuwe school)
    'prozoetermeer.stageconnectie.nl': {
        url: 'https://your-prozoetermeer-project.supabase.co', // TODO: Vervangen door daadwerkelijke Supabase URL
        key: 'hier-komt-de-anon-key-van-de-nieuwe-school',
        maxStudents: 150
    },
    // Lokale ontwikkelomgeving fallback
    'localhost': {
        url: 'https://vdeipnqyesduiohxvuvu.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU',
        maxStudents: 20
    }
};

(function() {
    const hostname = window.location.hostname.toLowerCase();
    
    // Selecteer de juiste configuratie
    let config = DB_CONFIGS[hostname];
    
    // Als er geen exacte match is, controleer op subdomeinen
    if (!config) {
        if (hostname.includes('ghpc')) {
            config = DB_CONFIGS['ghpc.stageconnectie.nl'];
        } else if (hostname.includes('prozoetermeer')) {
            config = DB_CONFIGS['prozoetermeer.stageconnectie.nl'];
        } else {
            // Fallback
            config = DB_CONFIGS['localhost'];
        }
    }
    
    // Zet de configuratie op het window-object
    window.SUPABASE_URL = config.url;
    window.SUPABASE_KEY = config.key;
    window.MAX_STUDENTS = config.maxStudents || null;
    
    console.log(`🔌 StageConnectie geconfigureerd voor tenant: ${hostname} (Database: ${config.url}, Max leerlingen: ${config.maxStudents || 'onbeperkt'})`);
})();

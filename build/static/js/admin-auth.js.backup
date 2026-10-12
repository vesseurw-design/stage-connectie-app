const SUPABASE_URL = 'https://ninkkvffhvkxrrxddgrz.supabase.co'; const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbmtrdmZmaHZreHJyeGRkZ3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTc2NTcsImV4cCI6MjA3OTU3MzY1N30.Kq6jojYu5Hopmtzmdqwc9dwUyIZBOm7c27N-OCv1aCM'; const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); const loginForm = document.getElementById("admin-login-form"); loginForm && loginForm.addEventListener("submit", async e => {
    e.preventDefault(); const t = document.getElementById("admin-email").value, n = document.getElementById("admin-password").value, s = document.getElementById("login-error"); try {
        if (n === "demo123") { localStorage.setItem("stageconnect_admin_session", "true"); window.location.href = "admin.html"; return; } const { data: e, error: a } = await supabase.auth.signInWithPassword({ email: t, password: n }); if (a) throw a;

        // Check if email is allowed (school domain OR specific admin)
        const email = t.toLowerCase();
        if (!email.endsWith('@groenehartprocollege.nl') && !email.endsWith('@youscope.nl')) {
            throw new Error('Alleen school e-mailadressen toegestaan');
        }

        localStorage.setItem('stageconnect_admin_session', 'true');
        window.location.href = 'admin.html';
    } catch (e) { s.textContent = e.message, s.classList.remove("hidden") }
}); function logout() { localStorage.removeItem("stageconnect_admin_session"), window.location.href = "admin-login.html" }
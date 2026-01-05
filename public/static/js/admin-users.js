// Admin Users Management
// Handles creating and managing employers, supervisors, and admins

const SUPABASE_URL = 'https://vdeipnqyesduiohxvuvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWlwbnF5ZXNkdWlvaHh2dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjY5NTEsImV4cCI6MjA4MzEwMjk1MX0.IknEZ-GQvspcppJxLR00ayBDq1DbL0HiUKy9RDb59DU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tab Management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(el => {
        el.classList.remove('border-blue-500', 'text-blue-600');
        el.classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected tab
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).classList.remove('border-transparent', 'text-gray-500');
    document.getElementById(`tab-${tabName}`).classList.add('border-blue-500', 'text-blue-600');

    // Load data for the tab
    if (tabName === 'bedrijven') loadBedrijven();
    if (tabName === 'supervisors') loadSupervisors();
    if (tabName === 'admins') loadAdmins();
}

// Bedrijf Functions
document.getElementById('form-bedrijf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        // Call Edge Function to create user
        const { data: result, error } = await supabase.functions.invoke('create-user', {
            body: {
                userType: 'employer',
                data: {
                    company_name: data.company_name,
                    email: data.email,
                    phone: data.phone || null,
                    address: data.address || null,
                    branche: data.branche || null
                }
            }
        });

        if (error) throw error;
        if (!result.success) throw new Error(result.error);

        showResult('bedrijf', `✅ ${result.message}!<br>📧 Email: ${result.email}<br>🔑 Wachtwoord: <strong>${result.password}</strong><br><small class="text-gray-600">Geef dit wachtwoord door aan het bedrijf.</small>`, 'success');
        e.target.reset();
        loadBedrijven();

    } catch (error) {
        console.error('Error adding bedrijf:', error);
        showResult('bedrijf', `❌ Fout: ${error.message}`, 'error');
    }
});

async function loadBedrijven() {
    try {
        const { data, error } = await supabase
            .from('Bedrijven')
            .select('*')
            .order('company_name');

        if (error) throw error;

        const list = document.getElementById('bedrijven-list');
        if (data.length === 0) {
            list.innerHTML = '<p class="text-gray-500">Geen bedrijven gevonden.</p>';
            return;
        }

        list.innerHTML = data.map(b => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                    <p class="font-medium">${b.company_name}</p>
                    <p class="text-sm text-gray-600">${b.email}</p>
                </div>
                <button onclick="deleteBedrijf('${b.id}', '${b.email}')" class="text-red-600 hover:text-red-700 text-sm">
                    Verwijderen
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading bedrijven:', error);
    }
}

async function deleteBedrijf(id, email) {
    if (!confirm(`Weet je zeker dat je dit bedrijf wilt verwijderen?\n\nDit verwijdert ook het login account.`)) return;

    try {
        // Delete auth user
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        if (user) {
            await supabase.auth.admin.deleteUser(user.id);
        }

        // Delete bedrijf
        const { error } = await supabase.from('Bedrijven').delete().eq('id', id);
        if (error) throw error;

        loadBedrijven();
        alert('✅ Bedrijf verwijderd!');

    } catch (error) {
        console.error('Error deleting bedrijf:', error);
        alert(`❌ Fout: ${error.message}`);
    }
}

// Supervisor Functions
document.getElementById('form-supervisor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        // Call Edge Function
        const { data: result, error } = await supabase.functions.invoke('create-user', {
            body: {
                userType: 'supervisor',
                data: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone || null,
                    whatsapp_enabled: data.whatsapp_enabled === 'on'
                }
            }
        });

        if (error) throw error;
        if (!result.success) throw new Error(result.error);

        showResult('supervisor', `✅ ${result.message}!<br>📧 Email: ${result.email}<br>🔑 Wachtwoord: <strong>${result.password}</strong><br><small class="text-gray-600">Geef dit wachtwoord door aan de stagebegeleider.</small>`, 'success');
        e.target.reset();
        loadSupervisors();

    } catch (error) {
        console.error('Error adding supervisor:', error);
        showResult('supervisor', `❌ Fout: ${error.message}`, 'error');
    }
});

async function loadSupervisors() {
    try {
        const { data, error } = await supabase
            .from('stagebegeleiders')
            .select('*')
            .order('name');

        if (error) throw error;

        const list = document.getElementById('supervisors-list');
        if (data.length === 0) {
            list.innerHTML = '<p class="text-gray-500">Geen stagebegeleiders gevonden.</p>';
            return;
        }

        list.innerHTML = data.map(s => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                    <p class="font-medium">${s.name}</p>
                    <p class="text-sm text-gray-600">${s.email}</p>
                </div>
                <button onclick="deleteSupervisor('${s.id}', '${s.email}')" class="text-red-600 hover:text-red-700 text-sm">
                    Verwijderen
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading supervisors:', error);
    }
}

async function deleteSupervisor(id, email) {
    if (!confirm(`Weet je zeker dat je deze stagebegeleider wilt verwijderen?\n\nDit verwijdert ook het login account.`)) return;

    try {
        // Delete auth user
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        if (user) {
            await supabase.auth.admin.deleteUser(user.id);
        }

        // Delete supervisor
        const { error } = await supabase.from('stagebegeleiders').delete().eq('id', id);
        if (error) throw error;

        loadSupervisors();
        alert('✅ Stagebegeleider verwijderd!');

    } catch (error) {
        console.error('Error deleting supervisor:', error);
        alert(`❌ Fout: ${error.message}`);
    }
}

// Admin Functions
document.getElementById('form-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        // Call Edge Function
        const { data: result, error } = await supabase.functions.invoke('create-user', {
            body: {
                userType: 'admin',
                data: {
                    email: data.email,
                    name: data.name || 'Admin'
                }
            }
        });

        if (error) throw error;
        if (!result.success) throw new Error(result.error);

        showResult('admin', `✅ ${result.message}!<br>📧 Email: ${result.email}<br>🔑 Wachtwoord: <strong>${result.password}</strong><br><small class="text-gray-600">Geef dit wachtwoord door aan de admin.</small>`, 'success');
        e.target.reset();
        loadAdmins();

    } catch (error) {
        console.error('Error adding admin:', error);
        showResult('admin', `❌ Fout: ${error.message}`, 'error');
    }
});

async function loadAdmins() {
    try {
        const { data: users } = await supabase.auth.admin.listUsers();
        const admins = users.users.filter(u => u.user_metadata?.role === 'admin');

        const list = document.getElementById('admins-list');
        if (admins.length === 0) {
            list.innerHTML = '<p class="text-gray-500">Geen admins gevonden.</p>';
            return;
        }

        list.innerHTML = admins.map(a => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                    <p class="font-medium">${a.user_metadata?.name || 'Admin'}</p>
                    <p class="text-sm text-gray-600">${a.email}</p>
                </div>
                <button onclick="deleteAdmin('${a.id}')" class="text-red-600 hover:text-red-700 text-sm">
                    Verwijderen
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading admins:', error);
    }
}

async function deleteAdmin(userId) {
    if (!confirm(`Weet je zeker dat je deze admin wilt verwijderen?`)) return;

    try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;

        loadAdmins();
        alert('✅ Admin verwijderd!');

    } catch (error) {
        console.error('Error deleting admin:', error);
        alert(`❌ Fout: ${error.message}`);
    }
}

// Helper Functions
function showResult(type, message, status) {
    const resultDiv = document.getElementById(`${type}-result`);
    resultDiv.className = `mt-4 p-4 rounded-md ${status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`;
    resultDiv.innerHTML = message;
    resultDiv.classList.remove('hidden');

    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 10000);
}

function logout() {
    localStorage.clear();
    window.location.href = 'admin-login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check admin session
    if (!localStorage.getItem('stageconnect_admin_session')) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Load first tab
    showTab('bedrijven');
});

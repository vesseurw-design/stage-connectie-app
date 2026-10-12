/**
 * Web Push Notifications Manager for StageConnectie
 * Volledig gratis (VAPID protocol), zonder mobiele nummers of sms.
 */

const VAPID_PUBLIC_KEY = 'BDY-DajSxRxC2rO1x-dc6umHYGJE0kYjrPS87UumkI9bBNo8CYfnlQc0Xh3cQa8alAY0SSiDNduuV5ng9-WChjE';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function isPushNotificationSupported() {
    return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('✅ Service Worker geregistreerd met scope:', reg.scope);
        return reg;
    } catch (err) {
        console.warn('⚠️ Service Worker registratie mislukt:', err);
        return null;
    }
}

async function requestPushPermissionAndSubscribe(studentId) {
    if (!isPushNotificationSupported()) {
        console.log('ℹ️ Pushberichten worden niet ondersteund op deze browser/dit apparaat.');
        return null;
    }

    try {
        // Vraag toestemming via de officiële browser pop-up van de telefoon
        const permission = await Notification.requestPermission();
        console.log('🔔 Toestemming voor meldingen:', permission);

        if (permission !== 'granted') {
            console.log('ℹ️ Gebruiker heeft pushmeldingen niet toegestaan.');
            return null;
        }

        // Zorg dat Service Worker gereed is
        let reg = await navigator.serviceWorker.ready;
        if (!reg) {
            reg = await registerServiceWorker();
            reg = await navigator.serviceWorker.ready;
        }

        // Haal bestaand abonnement op of maak nieuw abonnement aan
        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
            console.log('✅ Nieuw Web Push abonnement aangemaakt via VAPID');
        }

        const subJson = subscription.toJSON();

        // Sla push_subscription op bij het student-record in Supabase
        if (studentId && window.supabaseClient) {
            try {
                const { error: updateErr } = await window.supabaseClient
                    .from('Students')
                    .update({ push_subscription: subJson })
                    .eq('id', studentId);

                if (updateErr) {
                    console.warn('⚠️ Kon push_subscription niet opslaan in Students tabel:', updateErr.message);
                } else {
                    console.log('💾 Push subscription succesvol gekoppeld aan stagiair in database');
                }
            } catch (dbErr) {
                console.warn('⚠️ Fout bij opslaan push_subscription:', dbErr);
            }

            // Probeer ook in multi-device tabel push_subscriptions op te slaan
            try {
                await window.supabaseClient
                    .from('push_subscriptions')
                    .insert({
                        student_id: studentId,
                        subscription: subJson,
                        user_agent: navigator.userAgent
                    });
            } catch (e) {
                // Optionele extra tabel, stil negeren
            }
        }

        updateNotificationUI('granted');
        return subJson;

    } catch (err) {
        console.error('❌ Fout bij registreren push notificaties:', err);
        return null;
    }
}

async function initPushNotifications(studentId) {
    if (!isPushNotificationSupported()) return;

    await registerServiceWorker();

    if (Notification.permission === 'granted') {
        // Indien al toegestaan, sync abonnement stil op de achtergrond
        requestPushPermissionAndSubscribe(studentId);
    } else if (Notification.permission === 'default') {
        // Toon discrete inschakelknop voor studenten die eerder akkoord waren gegaan
        renderNotificationPrompt(studentId);
    }
}

function updateNotificationUI(permission) {
    const banner = document.getElementById('sc-push-banner-prompt');
    if (banner) banner.remove();
}

function renderNotificationPrompt(studentId) {
    if (sessionStorage.getItem('dismissed_push_prompt')) return;
    if (document.getElementById('sc-push-banner-prompt')) return;

    const container = document.getElementById('content') || document.querySelector('main');
    if (!container) return;

    const banner = document.createElement('div');
    banner.id = 'sc-push-banner-prompt';
    banner.className = 'bg-blue-50 border border-blue-200 p-3.5 rounded-2xl shadow-sm mb-4 flex items-center justify-between transition-all duration-300';
    banner.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="bg-blue-100 text-blue-700 p-2 rounded-xl flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
            </div>
            <div>
                <div class="text-sm font-bold text-gray-800">17:00 Uur herinnering op je telefoon?</div>
                <div class="text-xs text-gray-600">Schakel meldingen in om een seintje te krijgen als je uren om 17:00 nog niet zijn ingevuld.</div>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button id="sc-enable-push-btn" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition">
                Inschakelen
            </button>
            <button onclick="sessionStorage.setItem('dismissed_push_prompt', '1'); document.getElementById('sc-push-banner-prompt').remove();" class="text-xs text-gray-400 hover:text-gray-600 p-1.5 rounded-lg">
                ✕
            </button>
        </div>
    `;

    container.insertBefore(banner, container.firstChild);

    document.getElementById('sc-enable-push-btn')?.addEventListener('click', async () => {
        await requestPushPermissionAndSubscribe(studentId);
    });
}

window.isPushNotificationSupported = isPushNotificationSupported;
window.requestPushPermissionAndSubscribe = requestPushPermissionAndSubscribe;
window.initPushNotifications = initPushNotifications;

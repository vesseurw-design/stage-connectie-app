# Project Status: StageConnectie App
**Datum:** 14 Januari 2026
**Status:** Productie-klaar (Stable)

Dit document dient als overdracht en status-update voor het geval de chat-geschiedenis niet direct toegankelijk is.

## 1. Recente Voltooide Werkzaamheden
In de periode Dec 2025 - Jan 2026 is de applicatie van prototype naar productie gebracht.

### ✅ Real-time Synchronisatie & Notificaties
- **Werkgever Portaal:** Aanwezigheid wordt nu real-time gesynchroniseerd tussen apparaten. Conflicten bij gelijktijdig bewerken zijn opgelost (UPSERT logica).
- **Begeleider Portaal (v2):** Voorzien van real-time 'listeners'. Als een bedrijf aanwezigheid invult, krijgt de begeleider direct een **blauwe notificatie banner** in beeld.

### ✅ Beveiliging (Critical Security Update)
- **Database Policies (RLS):** Alle policies zijn geüpdatet om te kijken naar `app_metadata` in plaats van het onveilige `user_metadata`.
- **Edge Functions:** De functie `create-auth-account` is herschreven en beveiligd. Nieuwe gebruikers krijgen hun rol (admin/bedrijf/begeleider) nu op een veilige manier toegewezen die niet door gebruikers zelf aan te passen is.
- **Views:** Onveilige `SECURITY DEFINER` views zijn gecorrigeerd.

### ✅ Admin Functionaliteit
- **Verwijderen:** Admins kunnen nu stagebegeleiders en bedrijven verwijderen, waarbij automatisch ook het bijbehorende inlog-account (Auth) wordt verwijderd.
- **Bewerken:** Telefoonnummers en andere gegevens van begeleiders kunnen succesvol worden opgeslagen.

## 2. Technische Architectuur
- **Frontend:** Gehost op Vercel.
- **Backend:** Supabase (EU regio).
- **Huidig Project ID:** `vdeipnqyesduiohxvuvu` (Het oude project `ninkkvffhvkxrrxddgrz` wordt gepauzeerd en wordt niet meer gebruikt).

## 3. Laatste Acties
- De database views en RLS policies zijn opgeschoond.
- De lokale broncode is gesynchroniseerd met de deployed Edge Functions.

## 4. Openstaande Punten
- Geen kritieke bugs bekend.
- De applicatie draait stabiel.

---
*Dit document is gegenereerd door Antigravity om de voortgang te borgen.*

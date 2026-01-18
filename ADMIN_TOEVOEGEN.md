# Handleiding: Extra Admin Toevoegen

Om de veiligheid te waarborgen, worden admins niet via de app zelf toegevoegd, maar rechtstreeks in de beveiligde omgeving van Supabase. Volg deze stappen om een collega admin-rechten te geven.

---

### Stap 1: Nieuwe gebruiker aanmaken
1.  Log in op je [Supabase Dashboard](https://supabase.com/dashboard).
2.  Open je project (eindigend op `vdeipnqyesduiohxvuvu`).
3.  Ga in het linkermenu naar **Authentication** (het poppetje-icoon).
4.  Klik op de blauwe knop **Add User** rechtsboven en kies voor **Create new user**.
5.  Vul het **E-mailadres** en een **Wachtwoord** in.
6.  Vink **"Auto Confirm User"** aan (zodat ze geen mail hoeven te bevestigen).
7.  Klik op **Create user**.

---

### Stap 2: Admin-rol toewijzen
Zonder deze stap is de gebruiker wel aangemaakt, maar kan hij nog niet inloggen op het Admin-gedeelte.

#### Methode A: Via de interface (als beschikbaar)
1.  Klik op de e-mail van de nieuwe gebruiker in de lijst.
2.  Zoek naar het blok **User Metadata**.
3.  Klik op **Edit metadata**.
4.  Zorg dat de tekst er zo uitziet:
    ```json
    {
      "email_verified": true,
      "role": "admin"
    }
    ```
5.  Klik op **Save changes**.

#### Methode B: Via SQL Editor (Meest betrouwbaar)
Als de bovenstaande knoppen lastig te vinden zijn, gebruik dan deze methode:
1.  Ga naar de **SQL Editor** in het linkermenu (`>_`).
2.  Klik op **New query**.
3.  Voer de volgende code uit (vervang het e-mailadres):
    ```sql
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
    WHERE email = 'collega@voorbeeld.nl';
    ```
4.  Klik op **Run**.

---

### Stap 3: Inloggen
De nieuwe admin kan nu direct inloggen via:
**`https://stageconnectie.nl/admin-login.html`**

---

### ⚠️ Belangrijk om te weten
*   **Wachtwoord vergeten?** Je kunt als admin in dit zelfde scherm het wachtwoord van je collega resetten via de knop "Send Password Reset".
*   **Verwijderen:** Als een collega uit dienst gaat, kun je hem in dit scherm ook direct verwijderen via de knop **Delete user**. Hij kan dan op geen enkele manier meer bij de data.

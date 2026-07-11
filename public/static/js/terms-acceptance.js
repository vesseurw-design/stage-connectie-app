/**
 * Terms Acceptance Flow for StageConnectie
 * Regelt het eenmalig tonen van de Gebruikersvoorwaarden (click-wrap)
 * en slaat het akkoord op in de database.
 */

async function checkTermsAcceptance(table, userId, termsAcceptedAt, continueCallback) {
    if (termsAcceptedAt) {
        // Al akkoord, ga gewoon door!
        continueCallback();
        return;
    }

    // Blokkeer het scherm met een modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'terms-acceptance-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(10px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        font-family: 'Inter', sans-serif;
    `;

    overlay.innerHTML = `
        <div style="background: white; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; animation: modalEnter 0.3s ease-out;">
            <!-- Header -->
            <div style="padding: 24px; border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.2px;">Gebruikersovereenkomst & Privacyclausule</h2>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">Je dient eenmalig akkoord te gaan om toegang te krijgen tot StageConnectie.</p>
            </div>
            
            <!-- Content (scrollable) -->
            <div style="padding: 24px; overflow-y: auto; flex: 1; font-size: 13.5px; line-height: 1.6; color: #334155;">
                <div style="margin-bottom: 18px; padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; color: #1e40af; font-weight: 600; font-size: 13px;">
                    ⚠️ StageConnectie verwerkt persoonsgegevens van leerlingen (minderjarigen) en stagebedrijven conform de AVG. Lees de onderstaande voorwaarden zorgvuldig door.
                </div>
                
                <div id="terms-text-container" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; max-height: 250px; overflow-y: auto; font-family: system-ui, sans-serif;">
                    <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">GEBRUIKERSVOORWAARDEN STAGECONNECTIE</h3>
                    
                    <strong style="color: #1e293b; display: block; margin-top: 12px;">1. Exclusiviteit en Geheimhouding</strong>
                    De gebruiker erkent dat deze applicatie persoonsgegevens en stage-informatie bevat. Alle gegevens zijn strikt vertrouwelijk. Het is ten strengste verboden om inloggegevens te delen of gegevens uit de applicatie te exporteren, printen of te delen met derden buiten de noodzakelijke stagebegeleiding om.
                    
                    <strong style="color: #1e293b; display: block; margin-top: 12px;">2. Eerlijkheid en Verantwoordelijkheid</strong>
                    Gebruikers zijn zelf volledig verantwoordelijk voor de juistheid van de ingevoerde gegevens (zoals stagedagen, uren en aanwezigheid). Het opzettelijk invoeren van onjuiste uren of valse aanwezigheidsgegevens is fraude en kan leiden tot onmiddellijke schorsing van het account en melding aan de school/opleiding.
                    
                    <strong style="color: #1e293b; display: block; margin-top: 12px;">3. Beveiliging</strong>
                    De gebruiker draagt zorg voor een veilig gebruik van de apparatuur waarmee wordt ingelogd (bijvoorbeeld het vergrendelen van het scherm bij weglopen) en houdt wachtwoorden strikt geheim.
                    
                    <strong style="color: #1e293b; display: block; margin-top: 12px;">4. Privacy & AVG-rechten</strong>
                    StageConnectie verwerkt persoonsgegevens in opdracht van de school (de Verwerkingsverantwoordelijke). Verzoeken omtrent AVG-rechten (zoals inzien, corrigeren of wissen van leerlingdata) dienen rechtstreeks bij de school te worden ingediend.
                </div>
            </div>
            
            <!-- Actions -->
            <div style="padding: 20px 24px; border-top: 1px solid #f1f5f9; background: #fafafa; display: flex; flex-direction: column; gap: 12px;">
                <label style="display: flex; gap: 10px; align-items: flex-start; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="terms-checkbox" style="width: 18px; height: 18px; border-radius: 4px; border: 1px solid #cbd5e1; margin-top: 2px; cursor: pointer;">
                    <span style="font-size: 13px; color: #475569; line-height: 1.45;">
                        Ik verklaar dat ik de gebruikersovereenkomst heb gelezen en ga hiermee akkoord.
                    </span>
                </label>
                
                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button id="terms-btn-decline" style="flex: 1; padding: 11px 16px; border: 1px solid #cbd5e1; background: white; border-radius: 12px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s;">
                        Weigeren (Uitloggen)
                    </button>
                    <button id="terms-btn-accept" disabled style="flex: 1; padding: 11px 16px; border: none; background: #cbd5e1; color: #94a3b8; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: not-allowed; transition: all 0.2s;">
                        Akkoord & Doorgaan
                    </button>
                </div>
            </div>
        </div>
    `;

    // Voeg CSS-keyframes toe voor fade-in animatie
    if (!document.getElementById('terms-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'terms-animation-styles';
        style.textContent = `
            @keyframes modalEnter {
                from { transform: scale(0.96); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    const checkbox = document.getElementById('terms-checkbox');
    const acceptBtn = document.getElementById('terms-btn-accept');
    const declineBtn = document.getElementById('terms-btn-decline');

    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            acceptBtn.disabled = false;
            acceptBtn.style.background = '#2563eb';
            acceptBtn.style.color = 'white';
            acceptBtn.style.cursor = 'pointer';
        } else {
            acceptBtn.disabled = true;
            acceptBtn.style.background = '#cbd5e1';
            acceptBtn.style.color = '#94a3b8';
            acceptBtn.style.cursor = 'not-allowed';
        }
    });

    declineBtn.addEventListener('click', () => {
        alert('Je moet akkoord gaan met de gebruikersovereenkomst om de applicatie te kunnen gebruiken.');
        // Uitloggen en localStorage wissen
        localStorage.clear();
        window.location.reload();
    });

    acceptBtn.addEventListener('click', async () => {
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Verwerken...';
        
        const now = new Date().toISOString();
        
        try {
            const { error } = await supabaseClient
                .from(table)
                .update({ terms_accepted_at: now })
                .eq('id', userId);
                
            if (error) throw error;
            
            // Succes! Verwijder overlay en vervolg de initiële flow
            overlay.remove();
            continueCallback(now);
        } catch (err) {
            console.error('Error saving terms acceptance:', err);
            alert('Er ging iets fout bij het opslaan van je akkoord. Probeer het opnieuw.');
            acceptBtn.disabled = false;
            acceptBtn.textContent = 'Akkoord & Doorgaan';
        }
    });
}

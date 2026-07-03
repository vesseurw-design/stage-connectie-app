// api/contact.js
module.exports = async (req, res) => {
    // Schakel CORS in (voor testen en cross-origin verzoeken)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Behandel OPTIONS preflight verzoek
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { naam, school, email, bericht } = req.body;

        // Validatie
        if (!naam || !school || !email) {
            return res.status(400).json({ error: 'Naam, school en e-mailadres zijn verplicht.' });
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is niet geconfigureerd op Vercel.');
            return res.status(500).json({ error: 'Serverconfiguratie fout: E-mail service niet beschikbaar.' });
        }

        // Genereer een professionele HTML e-mail layout
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
                <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px;">
                    <h2 style="color: #8fb584; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Nieuwe Aanvraag Kennismaking</h2>
                    <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Ingevuld via het contactformulier op stageconnectie.nl</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #0f172a; font-size: 16px; margin-top: 0; border-left: 4px solid #8fb584; padding-left: 10px;">Contactgegevens</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 140px;">Naam:</td>
                            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${naam}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 500;">School / Organisatie:</td>
                            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${school}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 500;">E-mailadres:</td>
                            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;"><a href="mailto:${email}" style="color: #8fb584; text-decoration: none;">${email}</a></td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                    <h3 style="color: #0f172a; font-size: 16px; margin-top: 0; border-left: 4px solid #8fb584; padding-left: 10px;">Bericht</h3>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${bericht ? bericht.trim() : '<i>Geen bericht achtergelaten.</i>'}</div>
                </div>

                <div style="margin-top: 35px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    Dit is een automatisch gegenereerd bericht vanuit StageConnectie.
                </div>
            </div>
        `;

        // Verstuur de e-mail met de Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'StageConnectie Contact <no-reply@stageconnectie.nl>',
                to: 'info@stageconnectie.nl',
                subject: `Aanvraag kennismaking: ${school}`,
                html: emailHtml,
                reply_to: email // Zorgt ervoor dat beantwoorden direct naar de afzender gaat!
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Foutmelding van Resend:', data);
            return res.status(500).json({ error: 'Fout bij het versturen van de e-mail via Resend.' });
        }

        return res.status(200).json({ success: true, id: data.id });
    } catch (err) {
        console.error('Uitzondering in contact API:', err);
        return res.status(500).json({ error: 'Interne serverfout.' });
    }
};

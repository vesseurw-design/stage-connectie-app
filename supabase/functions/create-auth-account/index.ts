import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, role, metadata, sendEmail, name, loginUrl } = await req.json()

        // Create Supabase client with Admin rights
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        let authUser;
        let actionLink = '';
        const isInvite = !password || password.trim() === '';

        if (isInvite) {
            // Genereer een uitnodigingslink (of recovery link als user al bestaat in auth.users)
            let inviteData, inviteError;
            const res = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    redirectTo: loginUrl,
                    data: {
                        role: role,
                        ...metadata
                    }
                }
            });

            inviteData = res.data;
            inviteError = res.error;

            if (inviteError && (inviteError.message?.includes('already been registered') || inviteError.message?.includes('already exists'))) {
                const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: email,
                    options: {
                        redirectTo: loginUrl
                    }
                });
                inviteData = recoveryRes.data;
                inviteError = recoveryRes.error;
            }

            if (inviteError) throw inviteError;
            authUser = inviteData;
            actionLink = inviteData.properties?.action_link || '';
        } else {
            // Maak de user aan met het meegegeven wachtwoord
            const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: role,
                    ...metadata
                },
                app_metadata: {
                    role: role,
                    ...metadata
                }
            })

            if (createError) throw createError
            authUser = createData
        }

        const userId = authUser.user?.id

        // Send email if requested
        if (sendEmail) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
                let htmlContent = '';
                let subjectLine = '';

                if (isInvite) {
                    if (role === 'employer') {
                        subjectLine = 'Uitnodiging digitale aanwezigheidsregistratie - Groene Hart Praktijkschool';
                        htmlContent = `
                            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                                <h2 style="color: #1e293b; margin-top: 0;">Beste ${name || 'stagebegeleider / werkgever'},</h2>
                                <p style="color: #334155; line-height: 1.6;">Wij nodigen u van harte uit voor de digitale aanwezigheidsregistratie van de <strong>Groene Hart Praktijkschool</strong> via StageConnectie.</p>
                                <p style="color: #334155; line-height: 1.6;">Met behulp van deze website (geschikt voor laptop, tablet en smartphone) kunt u met 2 à 3 klikken snel doorgeven of een stagiair wel of niet aanwezig is op een stagedag.</p>
                                
                                <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Klik op de onderstaande knop om uw account te activeren en uw eigen wachtwoord in te stellen:</p>
                                
                                <div style="text-align: center; margin: 25px 0;">
                                    <a href="${actionLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Account Activeren & Wachtwoord Instellen</a>
                                </div>

                                <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                        💡 <strong>Hulp of uitleg nodig?</strong><br>
                                        Voor een korte uitleg over de registratie verwijzen wij u graag naar de <strong>Info-knop (📖)</strong> rechts bovenaan de pagina in het portaal. U kunt daarin eenvoudig zoeken op <em>StageConnectie</em>.
                                    </p>
                                </div>

                                <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
                                    Uw portaal is bereikbaar via:<br>
                                    <a href="${loginUrl || 'https://ghpc.stageconnectie.nl/employer-portal.html'}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${loginUrl || 'https://ghpc.stageconnectie.nl/employer-portal.html'}</a><br><br>
                                    <em>Let op: Deze activatielink is beperkt geldig.</em>
                                </p>

                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
                                    Met vriendelijke groet,<br>
                                    <strong>Het stage team van Groene Hart Praktijkschool</strong>
                                </p>
                            </div>
                        `;
                    } else {
                        subjectLine = 'Uitnodiging voor StageConnectie - Activeer je account';
                        htmlContent = `
                            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <h2 style="color: #1e293b;">Beste ${name || 'gebruiker'},</h2>
                                <p>Welkom bij StageConnectie! Er is een account voor je klaargezet in ons systeem.</p>
                                <p>Klik op de onderstaande knop om je account te activeren en je eigen wachtwoord in te stellen:</p>
                                <a href="${actionLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">Account Activeren & Wachtwoord Instellen</a>
                                <p style="font-size: 13px; color: #64748b; margin-top: 15px;">
                                    Na het instellen van je wachtwoord kun je inloggen op je vernieuwde portaal:<br>
                                    <a href="${loginUrl || 'https://ghpc.stageconnectie.nl/supervisor-portal.html'}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${loginUrl || 'https://ghpc.stageconnectie.nl/supervisor-portal.html'}</a><br><br>
                                    <em>Let op: Deze activatielink is beperkt geldig.</em>
                                </p>
                                <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                                    Met vriendelijke groet,<br>Het stage team van Groene Hart Praktijkschool
                                </p>
                            </div>
                        `;
                    }
                } else {
                    subjectLine = 'Welkom bij StageConnectie - Jouw Inloggegevens';
                    htmlContent = `
                        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #1e293b;">Beste ${name || 'gebruiker'},</h2>
                            <p>Welkom bij StageConnectie! Er is een account voor je aangemaakt in ons systeem.</p>
                            <p>Hieronder vind je jouw inloggegevens:</p>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
                                <strong>E-mailadres:</strong> ${email}<br>
                                <strong>Wachtwoord:</strong> ${password}
                            </div>
                            <p>Je kunt inloggen via de volgende link:</p>
                            <a href="${loginUrl || 'https://stageconnectie.nl'}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Naar het Portaal</a>
                            <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                                We raden je aan om je wachtwoord te wijzigen nadat je voor de eerste keer bent ingelogd.<br><br>
                                Met vriendelijke groet,<br>Het stage team van Groene Hart Praktijkschool
                            </p>
                        </div>
                    `;
                }

                const mailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${RESEND_API_KEY}` 
                    },
                    body: JSON.stringify({
                        from: 'StageConnectie <no-reply@stageconnectie.nl>',
                        to: email,
                        subject: subjectLine,
                        html: htmlContent
                    })
                });
                
                const resData = await mailResponse.json();
                console.log('Mail send response:', resData);
            } else {
                console.warn('RESEND_API_KEY niet geconfigureerd, mail niet verzonden.');
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Auth account created' + (sendEmail ? ' and email sent' : ''),
                user_id: authUser.user?.id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Unknown error'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})

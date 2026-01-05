// Supabase Edge Function: create-user
// Creates auth users for employers, supervisors, and admins

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get Supabase client with SERVICE ROLE (can create users)
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

        // Get request body
        const { userType, data } = await req.json()

        // Validate user type
        if (!['employer', 'supervisor', 'admin'].includes(userType)) {
            throw new Error('Invalid user type')
        }

        let result = {}

        // CREATE EMPLOYER
        if (userType === 'employer') {
            // Step 1: Add to Bedrijven table
            const { data: bedrijf, error: bedrijfError } = await supabaseAdmin
                .from('Bedrijven')
                .insert([{
                    company_name: data.company_name,
                    email: data.email,
                    phone: data.phone || null,
                    address: data.address || null,
                    branche: data.branche || null
                }])
                .select()
                .single()

            if (bedrijfError) throw bedrijfError

            // Step 2: Create auth user
            const cleanName = data.company_name.replace(/[^a-zA-Z0-9]/g, '')
            const password = `Welkom${cleanName}`

            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'employer'
                }
            })

            if (authError) {
                // Rollback
                await supabaseAdmin.from('Bedrijven').delete().eq('id', bedrijf.id)
                throw authError
            }

            result = {
                success: true,
                message: 'Bedrijf toegevoegd',
                email: data.email,
                password: password,
                bedrijf: bedrijf
            }
        }

        // CREATE SUPERVISOR
        else if (userType === 'supervisor') {
            // Step 1: Add to stagebegeleiders table
            const { data: supervisor, error: supervisorError } = await supabaseAdmin
                .from('stagebegeleiders')
                .insert([{
                    name: data.name,
                    email: data.email,
                    phone: data.phone || null,
                    whatsapp_enabled: data.whatsapp_enabled || false
                }])
                .select()
                .single()

            if (supervisorError) throw supervisorError

            // Step 2: Create auth user
            const password = 'WelkomStagebegeleider'

            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'supervisor',
                    supervisor_id: supervisor.id
                }
            })

            if (authError) {
                // Rollback
                await supabaseAdmin.from('stagebegeleiders').delete().eq('id', supervisor.id)
                throw authError
            }

            result = {
                success: true,
                message: 'Stagebegeleider toegevoegd',
                email: data.email,
                password: password,
                supervisor: supervisor
            }
        }

        // CREATE ADMIN
        else if (userType === 'admin') {
            const password = 'WelkomAdmin'

            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: 'admin',
                    name: data.name || 'Admin'
                }
            })

            if (authError) throw authError

            result = {
                success: true,
                message: 'Admin toegevoegd',
                email: data.email,
                password: password
            }
        }

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})

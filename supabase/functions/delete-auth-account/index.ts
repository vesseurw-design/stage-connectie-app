// Edge Function to delete auth account when deleting a company or supervisor
// This ensures complete cleanup when removing users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get Supabase Admin client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Get request data
        const { email } = await req.json()

        // Validate
        if (!email) {
            throw new Error('Email is required')
        }

        // Find the user by email
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) throw listError

        const user = users.users.find(u => u.email === email)

        if (!user) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'User not found'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404
                }
            )
        }

        // Delete the auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (deleteError) throw deleteError

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Auth account deleted successfully'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        console.error('Error deleting auth account:', error)

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

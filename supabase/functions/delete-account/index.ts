import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const storageBuckets = ['avatars', 'banners', 'blog-covers', 'dailys', 'posts', 'recipe-images'];
    for (const bucket of storageBuckets) {
      try {
        const { data: files } = await supabaseAdmin.storage
          .from(bucket)
          .list(user.id);

        if (files && files.length > 0) {
          const filePaths = files.map(file => `${user.id}/${file.name}`);
          await supabaseAdmin.storage.from(bucket).remove(filePaths);
        }
      } catch (storageError) {
        console.error(`Error deleting files from ${bucket}:`, storageError);
      }
    }

    const { error: deleteError } = await supabaseAdmin.rpc('delete_user_account_data', {
      target_user_id: user.id
    });

    if (deleteError) {
      console.error('Delete account data error:', deleteError);
      throw new Error(deleteError.message || 'Failed to delete account data');
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      console.error('Delete auth user error:', authDeleteError);
      throw new Error(authDeleteError.message || 'Failed to delete auth user');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
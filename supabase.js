const SUPABASE_URL = "https://qfkxnmefqjtsckmkrfld.supabase.co";



const SUPABASE_KEY = "sb_publishable_80DMdaZyjRQg9s_dH12W9w_g-q7x3hR";



if (!window.supabase) {
    console.error("Supabase library was not loaded.");
} else {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    console.log("Supabase client initialized successfully.");
}
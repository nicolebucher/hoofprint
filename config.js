// Hufspur configuration.
// Leave both values empty to run in local mode: everything is stored in the visitor's own browser.
// Fill them in (Supabase → Project Settings → API) to share routes, photos and reviews with everyone.
// The anon key is meant to be public; the database rules in supabase/schema.sql protect the data.
window.HUFSPUR_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};

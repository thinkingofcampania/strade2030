/* Collegamento al database Supabase.
   In Supabase apri Project Settings > API Keys (oppure il pulsante "Connect" in alto)
   e copia:
   - il Project URL (https://xxxx.supabase.co)
   - la chiave pubblica: "Publishable key" (inizia con sb_publishable_)
     oppure, nei progetti più vecchi, la chiave "anon public".
   Questa chiave è pubblica per natura: la sicurezza è garantita dalle regole del
   database (file supabase/schema.sql). NON usare mai la chiave "secret" o "service_role". */
window.CONFIG = {
  supabaseUrl: "https://rscgzkaonarcqsbjfmdw.supabase.co",
  supabaseAnonKey: "sb_publishable_Z1V31oyz48wHZi1qAv6jIA_XLFDiprP"
};

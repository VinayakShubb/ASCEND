from supabase import create_client, Client

import config

# Used only for real auth actions: sign up, sign in, oauth, refresh, token
# verification. Must use the anon key -- the service role key skips password
# checks entirely and would make "login" always succeed.
auth_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)

# Used for every table read/write (profiles, habits, habit_logs). This uses
# the service role key, which bypasses Postgres row-level security. That's
# safe here because the backend is now the trust boundary: every route below
# calls get_current_user() first and manually filters by that user's id
# before touching their rows.
db_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)

"""
Centralised Supabase client for OmniVault API Core.

Import `supabase` from this module for DB operations (service role):
    from api_core.db import supabase

Import `supabase_auth` from this module for Auth operations (anon key):
    from api_core.db import supabase_auth
"""
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "") or os.getenv("SUPABASE_KEY", "")

if not SUPABASE_ANON_KEY:
    SUPABASE_ANON_KEY = SUPABASE_SERVICE_KEY
    print("WARNING: SUPABASE_ANON_KEY not set, falling back to service key for auth")

print(f"DB.PY INIT: URL={SUPABASE_URL[:20]}..., SERVICE_KEY={'set' if SUPABASE_SERVICE_KEY else 'missing'}, ANON_KEY={'set' if SUPABASE_ANON_KEY else 'missing'}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

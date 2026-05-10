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
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

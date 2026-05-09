"""
Centralised Supabase client for OmniVault API Core.

Import `supabase` from this module wherever you need a DB connection:
    from api_core.db import supabase
"""
import os
from supabase import create_client, Client

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")
supabase: Client = create_client(url, key)

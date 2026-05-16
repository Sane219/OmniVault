"""Shared pytest configuration for api-core tests."""
import os

# Ensure env vars are set before any test imports
os.environ.setdefault("ENCRYPTION_KEY", "QGQLFwZJhYSeyDG8sED8Wl80_RyIZpZ1nYmAE1M07Og=")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-for-unit-tests")

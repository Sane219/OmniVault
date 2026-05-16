"""Tests for api_core.auth_utils — JWT decode_token."""
import os
import time
import pytest
import jwt

from api_core.auth_utils import decode_token

SECRET = os.environ.get("SUPABASE_JWT_SECRET", "test-secret-for-unit-tests")


class FakeRequest:
    """Minimal mock for Robyn Request."""
    def __init__(self, headers: dict):
        self.headers = headers


def make_token(sub: str = "user-123", exp_offset: int = 3600) -> str:
    """Create a signed JWT for testing."""
    payload = {
        "sub": sub,
        "iat": int(time.time()),
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


class TestDecodeToken:
    def test_valid_token(self):
        token = make_token()
        req = FakeRequest({"Authorization": f"Bearer {token}"})
        assert decode_token(req) == "user-123"

    def test_missing_header(self):
        req = FakeRequest({})
        assert decode_token(req) is None

    def test_empty_bearer(self):
        req = FakeRequest({"Authorization": "Bearer "})
        assert decode_token(req) is None

    def test_no_bearer_prefix(self):
        req = FakeRequest({"Authorization": "Token abc123"})
        assert decode_token(req) is None

    def test_wrong_secret(self):
        bad_token = jwt.encode({"sub": "user-1", "exp": int(time.time()) + 3600}, "wrong-secret", algorithm="HS256")
        req = FakeRequest({"Authorization": f"Bearer {bad_token}"})
        assert decode_token(req) is None

    def test_expired_token(self):
        token = make_token(exp_offset=-10)
        req = FakeRequest({"Authorization": f"Bearer {token}"})
        assert decode_token(req) is None

    def test_custom_sub(self):
        token = make_token(sub="custom-user-id-456")
        req = FakeRequest({"Authorization": f"Bearer {token}"})
        assert decode_token(req) == "custom-user-id-456"

    def test_lowercase_authorization_header(self):
        token = make_token()
        req = FakeRequest({"authorization": f"Bearer {token}"})
        assert decode_token(req) == "user-123"

    def test_malformed_token(self):
        req = FakeRequest({"Authorization": "Bearer not.a.jwt"})
        assert decode_token(req) is None

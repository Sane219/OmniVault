"""Tests for worker_ai.crypto_utils — encrypt/decrypt/is_encrypted."""
import os
import sys
import pytest

# Remove any cached mock
if "worker_ai.crypto_utils" in sys.modules:
    del sys.modules["worker_ai.crypto_utils"]

from worker_ai.crypto_utils import encrypt_value, decrypt_value, is_encrypted


class TestEncryptDecrypt:
    def test_round_trip(self):
        plaintext = "gemini-key-AIzaSy-example"
        assert decrypt_value(encrypt_value(plaintext)) == plaintext

    def test_different_inputs_differ(self):
        assert encrypt_value("a") != encrypt_value("b")

    def test_empty_string(self):
        assert decrypt_value(encrypt_value("")) == ""


class TestIsEncrypted:
    def test_encrypted_detected(self):
        assert is_encrypted(encrypt_value("x")) is True

    def test_plaintext_not_detected(self):
        assert is_encrypted("plain-key") is False

    def test_empty(self):
        assert is_encrypted("") is False

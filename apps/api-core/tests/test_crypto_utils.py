"""Tests for api_core.crypto_utils — encrypt/decrypt/is_encrypted."""
import importlib
import os
import sys
import pytest

# test_chat_prune.py may have injected a mock for api_core.crypto_utils.
# Remove it so we get the real module.
if "api_core.crypto_utils" in sys.modules:
    del sys.modules["api_core.crypto_utils"]

from api_core.crypto_utils import encrypt_value, decrypt_value, is_encrypted


class TestEncryptDecrypt:
    def test_round_trip(self):
        plaintext = "my-super-secret-api-key-12345"
        encrypted = encrypt_value(plaintext)
        assert encrypted != plaintext
        assert decrypt_value(encrypted) == plaintext

    def test_different_inputs_produce_different_ciphertext(self):
        a = encrypt_value("key-a")
        b = encrypt_value("key-b")
        assert a != b

    def test_encrypt_empty_string(self):
        encrypted = encrypt_value("")
        assert decrypt_value(encrypted) == ""

    def test_encrypt_unicode(self):
        plaintext = "API密钥🔐"
        encrypted = encrypt_value(plaintext)
        assert decrypt_value(encrypted) == plaintext

    def test_decrypt_with_wrong_key_fails(self):
        encrypted = encrypt_value("test")
        tampered = encrypted[:-4] + "XXXX"
        with pytest.raises(Exception):
            decrypt_value(tampered)


class TestIsEncrypted:
    def test_encrypted_value_detected(self):
        encrypted = encrypt_value("test-key")
        assert is_encrypted(encrypted) is True

    def test_plaintext_not_detected(self):
        assert is_encrypted("plain-api-key") is False

    def test_empty_string(self):
        assert is_encrypted("") is False

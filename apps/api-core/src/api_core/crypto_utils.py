"""
Encryption utilities for sensitive data at rest.
"""
import os
import sys
from cryptography.fernet import Fernet

ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        if not ENCRYPTION_KEY:
            sys.stderr.write("WARNING: ENCRYPTION_KEY not set, using fallback (insecure)\n")
            # Fallback for development only - NOT for production
            _fernet = Fernet(Fernet.generate_key())
        else:
            _fernet = Fernet(ENCRYPTION_KEY.encode())
    return _fernet


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns base64-encoded ciphertext."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext. Returns plaintext string."""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def is_encrypted(value: str) -> bool:
    """Check if a value appears to be Fernet-encrypted (starts with gAAAAA)."""
    return value.startswith("gAAAAA") if value else False


import time
import secrets
import string
import hashlib
import getpass

print("=" * 40)
print("       VITHU DEV")
print("    USER ACCOUNT SYSTEM")
print("=" * 40)

# Create username
username = input("Enter Username: ")

# Generate temporary password
password = ''.join(
    secrets.choice(string.ascii_letters + string.digits)
    for _ in range(12)
)

# Store password as hash
password_hash = hashlib.sha256(
    password.encode()
).hexdigest()

print("\nACCOUNT CREATED!")
print("Username:", username)
print("Temporary Password:", password)

# 10 second countdown
print("\nGenerating verification code...")

for i in range(10, 0, -1):
    print(f"Please wait: {i} seconds")
    time.sleep(1)

# Generate verification code
verification_code = str(secrets.randbelow(900000) + 100000)

print("\nVerification code:", verification_code)

# Verify code
user_code = input("Enter verification code: ")

if secrets.compare_digest(user_code, verification_code):
    print("\nVerification successful!")
    print("Welcome to Vithu Dev,", username)
else:
    print("\nInvalid verification code!")

print("\nVITHU DEV SYSTEM CLOSED")

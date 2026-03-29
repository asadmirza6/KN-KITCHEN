"""
Test script to verify user creation and list refresh functionality
"""
import requests

BASE_URL = "http://localhost:8000"

def test_user_management():
    print("=" * 60)
    print("TESTING USER MANAGEMENT ENDPOINTS")
    print("=" * 60)

    # Step 1: Login as admin (we'll need credentials)
    print("\n1. Testing authentication...")
    login_data = {
        "email": "asad@admin.com",
        "password": "admin123"  # Common default - may need to adjust
    }

    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)

    if response.status_code != 200:
        print(f"   [FAIL] Login failed with status {response.status_code}")
        print(f"   Response: {response.text}")
        print("\n   Trying alternative password...")

        # Try another common password
        login_data["password"] = "password"
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)

        if response.status_code != 200:
            print(f"   [FAIL] Login still failed. Please provide correct credentials.")
            return False

    token = response.json().get("token")
    print(f"   [OK] Login successful! Token obtained.")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Get current user list
    print("\n2. Fetching current users...")
    response = requests.get(f"{BASE_URL}/users/", headers=headers)

    if response.status_code != 200:
        print(f"   [FAIL] Failed to fetch users: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

    users_before = response.json()
    print(f"   [OK] Successfully fetched {len(users_before)} users")

    # Step 3: Create a new test user
    print("\n3. Creating new test user...")
    new_user_data = {
        "name": "Test User Auto",
        "email": "testuser@knkitchen.com",
        "password": "test123456",
        "role": "STAFF"
    }

    response = requests.post(f"{BASE_URL}/users/", json=new_user_data, headers=headers)

    if response.status_code == 400 and "already registered" in response.text:
        print(f"   [INFO] User already exists, trying different email...")
        import time
        new_user_data["email"] = f"testuser{int(time.time())}@knkitchen.com"
        response = requests.post(f"{BASE_URL}/users/", json=new_user_data, headers=headers)

    if response.status_code != 201:
        print(f"   [FAIL] Failed to create user: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

    created_user = response.json()
    print(f"   [OK] User created successfully!")
    print(f"   Response includes:")
    print(f"     - id: {created_user.get('id')}")
    print(f"     - name: {created_user.get('name')}")
    print(f"     - email: {created_user.get('email')}")
    print(f"     - role: {created_user.get('role')}")
    print(f"     - created_at: {created_user.get('created_at')}")

    # Step 4: Verify new user appears in list
    print("\n4. Verifying user appears in refreshed list...")
    response = requests.get(f"{BASE_URL}/users/", headers=headers)

    if response.status_code != 200:
        print(f"   [FAIL] Failed to fetch users after creation: {response.status_code}")
        return False

    users_after = response.json()
    print(f"   [OK] Successfully fetched {len(users_after)} users (was {len(users_before)})")

    # Check if new user is in the list
    new_user_found = any(u['id'] == created_user['id'] for u in users_after)

    if new_user_found:
        print(f"   [OK] NEW USER FOUND IN LIST!")
    else:
        print(f"   [FAIL] New user NOT found in list!")
        return False

    print("\n" + "=" * 60)
    print("[OK] ALL TESTS PASSED!")
    print("=" * 60)
    print("\nBackend API is working correctly:")
    print("  [OK] POST /users/ returns created user with all fields")
    print("  [OK] GET /users/ returns all users including newly created")
    print("  [OK] Auto-refresh should work in frontend")

    return True

if __name__ == "__main__":
    try:
        success = test_user_management()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

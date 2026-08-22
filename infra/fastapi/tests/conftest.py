import os
import time
import pytest
import requests

BASE_URL = os.getenv("FASTAPI_TEST_BASE_URL")


@pytest.fixture(scope="session")
def base_url():
    if not BASE_URL:
        pytest.skip("FASTAPI_TEST_BASE_URL is required for external integration tests")
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client, base_url):
    identifier = os.getenv("NABDAH_TEST_ADMIN_IDENTIFIER")
    password = os.getenv("NABDAH_TEST_ADMIN_PASSWORD")
    if not identifier or not password:
        pytest.skip("sandbox admin credentials are required for external integration tests")
    r = api_client.post(
        f"{base_url}/api/auth/login",
        json={"identifier": identifier, "password": password},
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def patient_creds():
    ts = int(time.time())
    return {
        "full_name": "TEST_Patient_User",
        "phone": f"+9665{ts % 1_000_000_000:09d}",
        "password": "Test@1234",
        "email": f"test_patient_{ts}@example.com",
        "role": "patient",
    }


@pytest.fixture(scope="session")
def patient_token(api_client, patient_creds):
    r = api_client.post(f"{BASE_URL}/api/auth/register", json=patient_creds)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def patient_headers(patient_token):
    return {"Authorization": f"Bearer {patient_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def guest_token(api_client):
    ts = int(time.time())
    r = api_client.post(
        f"{BASE_URL}/api/auth/guest",
        json={"phone": f"guest-{ts}", "city": "الرياض"},
    )
    assert r.status_code == 200, f"Guest failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def guest_headers(guest_token):
    return {"Authorization": f"Bearer {guest_token}", "Content-Type": "application/json"}

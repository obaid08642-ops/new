import os
import time
import pytest
import requests

BASE_URL = "https://flutter-pharmacy.preview.emergentagent.com"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": "+966500000000", "password": "Admin@123"},
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

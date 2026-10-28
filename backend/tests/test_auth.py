import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import admin, auth
from app.models.schemas import UserLogin, UserRegister, UserRole
from app.services.auth_service import AuthService, create_access_token, get_password_hash, verify_password

# Build an isolated test app containing the authentication and admin governance routers
test_app = FastAPI()
test_app.include_router(auth.router, prefix="/api")
test_app.include_router(admin.router, prefix="/api")

@test_app.get("/health")
def health():
    return {"status": "ok", "service": "CRIMENET API"}


@pytest.fixture(scope="module", autouse=True)
def setup_default_accounts():
    import asyncio
    asyncio.run(AuthService.seed_default_users())


client = TestClient(test_app)


# Scenario 1: Health Check
def test_scenario_1_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


# Scenario 2: Direct API Login — Valid Credentials
def test_scenario_2_valid_login():
    payload = {
        "email": "investigator@intelligence.gov",
        "password": "Investigator@123"
    }
    res = client.post("/api/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "investigator@intelligence.gov"
    assert data["user"]["role"] == "investigator"


# Scenario 3: Direct API Login — Invalid Credentials
def test_scenario_3_invalid_login():
    # Wrong password
    res1 = client.post("/api/auth/login", json={
        "email": "investigator@intelligence.gov",
        "password": "WrongPassword@999"
    })
    assert res1.status_code == 401
    assert "detail" in res1.json()

    # Non-existent user
    res2 = client.post("/api/auth/login", json={
        "email": "ghost.agent@intelligence.gov",
        "password": "AnyPassword@123"
    })
    assert res2.status_code == 401


# Scenario 4: Direct API Login — Missing Fields
def test_scenario_4_missing_fields_login():
    # Missing password
    res1 = client.post("/api/auth/login", json={"email": "test@test.com"})
    assert res1.status_code == 422

    # Empty payload
    res2 = client.post("/api/auth/login", json={})
    assert res2.status_code == 422


# Scenario 5: Valid Registration
def test_scenario_5_valid_registration():
    reg_payload = {
        "full_name": "Field Agent Marcus Cole",
        "email": "marcus.cole@intelligence.gov",
        "badge_number": "INTEL-501",
        "password": "TacticalPassword@2026"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "marcus.cole@intelligence.gov"
    assert data["user"]["full_name"] == "Field Agent Marcus Cole"
    assert data["user"]["badge_number"] == "INTEL-501"
    # Least privileged role enforced:
    assert data["user"]["role"] == "investigator"


# Scenario 6: Duplicate Registration
def test_scenario_6_duplicate_registration():
    dup_payload = {
        "full_name": "Imposter Marcus",
        "email": "marcus.cole@intelligence.gov",  # Already registered
        "password": "AnotherPassword@2026"
    }
    res = client.post("/api/auth/register", json=dup_payload)
    assert res.status_code == 400
    assert "already exists" in res.json().get("detail", "").lower()


# Scenario 7: Weak / Invalid Password on Registration
def test_scenario_7_weak_password():
    # Less than 8 characters
    res1 = client.post("/api/auth/register", json={
        "full_name": "Short Pass User",
        "email": "short@intelligence.gov",
        "password": "Pass1"
    })
    assert res1.status_code == 400
    assert "at least 8 characters" in res1.json().get("detail", "")

    # Only letters, no digits
    res2 = client.post("/api/auth/register", json={
        "full_name": "No Number User",
        "email": "nonumber@intelligence.gov",
        "password": "PasswordOnlyLetters"
    })
    assert res2.status_code == 400
    assert "contain both letters and at least one number" in res2.json().get("detail", "")


# Scenario 8: Authenticated Route Check (/api/auth/me)
def test_scenario_8_auth_me():
    # Login to get token
    login_res = client.post("/api/auth/login", json={
        "email": "investigator@intelligence.gov",
        "password": "Investigator@123"
    })
    token = login_res.json()["access_token"]

    # Valid token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "investigator@intelligence.gov"

    # Missing token
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401

    # Invalid token
    bad_token_res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert bad_token_res.status_code == 401


# Scenario 9: Role Verification (Investigator vs Admin endpoints)
def test_scenario_9_role_verification():
    # Investigator Token
    inv_login = client.post("/api/auth/login", json={
        "email": "investigator@intelligence.gov",
        "password": "Investigator@123"
    })
    inv_token = inv_login.json()["access_token"]

    # Admin Token
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@intelligence.gov",
        "password": "Admin@123"
    })
    admin_token = admin_login.json()["access_token"]

    # Investigator trying to access Admin-only /api/admin/users
    inv_admin_access = client.get("/api/admin/users", headers={"Authorization": f"Bearer {inv_token}"})
    assert inv_admin_access.status_code == 403
    assert "Administrator role required" in inv_admin_access.json().get("detail", "")

    # Admin accessing /api/admin/users
    admin_access = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_access.status_code == 200
    assert isinstance(admin_access.json(), list)


# Scenario 10: Logout Endpoint
def test_scenario_10_logout():
    inv_login = client.post("/api/auth/login", json={
        "email": "investigator@intelligence.gov",
        "password": "Investigator@123"
    })
    inv_token = inv_login.json()["access_token"]

    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {inv_token}"})
    assert logout_res.status_code == 200
    assert "logged out" in logout_res.json().get("message", "").lower()

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app

client = TestClient(app)
ORIGINAL_ACTIVITIES = deepcopy(activities)


@pytest.fixture(autouse=True)
def reset_activities() -> None:
    activities.clear()
    activities.update(deepcopy(ORIGINAL_ACTIVITIES))


def test_get_activities_returns_dict() -> None:
    response = client.get("/activities")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_adds_participant() -> None:
    email = "newstudent@mergington.edu"

    signup_response = client.post(f"/activities/Chess Club/signup?email={email}")
    assert signup_response.status_code == 200

    activities_response = client.get("/activities")
    participants = activities_response.json()["Chess Club"]["participants"]
    assert email in participants


def test_signup_duplicate_returns_conflict() -> None:
    email = "michael@mergington.edu"

    response = client.post(f"/activities/Chess Club/signup?email={email}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Student already signed up"


def test_signup_unknown_activity_returns_not_found() -> None:
    response = client.post("/activities/Unknown Club/signup?email=student@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_signup_when_activity_full_returns_conflict() -> None:
    activities["Chess Club"]["max_participants"] = len(activities["Chess Club"]["participants"])

    response = client.post("/activities/Chess Club/signup?email=another@mergington.edu")

    assert response.status_code == 409
    assert response.json()["detail"] == "Activity is full"


def test_signup_invalid_email_returns_unprocessable_entity() -> None:
    response = client.post("/activities/Chess Club/signup?email=not-an-email")

    assert response.status_code == 422


def test_remove_participant_success() -> None:
    email = "michael@mergington.edu"

    response = client.delete(f"/activities/Chess Club/participants?email={email}")

    assert response.status_code == 200
    assert response.json()["message"] == f"Removed {email} from Chess Club"
    assert email not in activities["Chess Club"]["participants"]


def test_remove_participant_not_found_returns_404() -> None:
    response = client.delete("/activities/Chess Club/participants?email=missing@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found in activity"


def test_remove_participant_unknown_activity_returns_404() -> None:
    response = client.delete("/activities/Unknown Club/participants?email=student@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"

from datetime import datetime, timedelta

import pytest
from django.urls import reverse
from rest_framework import status

from . import constants
from teamflow.models import Membership, Team, TeamRole, Task, StatusTask


pytestmark = pytest.mark.django_db


class TestUserPositive:
    """Набор положительных тестов по работе с пользователями."""

    def test_user_registration(self, api_client):
        """Тест c регистрации."""
        url = reverse("user-list")
        data = {
            "email": "newuser@mail.ru",
            "username": "newuser",
            "password": "testpass123",
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "newuser@mail.ru"

    def test_login(self, api_client, user_another_team):
        """Тест входа."""
        url = reverse("login")
        data = {
            "email": user_another_team.email,
            "password": 'passworduseranother',
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        token = response.data["auth_token"]
        assert token


class TestUserNegative:
    """Набор негативных тестов по работе с пользователями."""
    @pytest.mark.parametrize(
        'email,username,password',
        [
            ('newusermail.ru', 'newuser', 'testpass123'),
            ('', 'newuser', 'testpass123'),
            ('newuser@mail.ru', 'newuser', 'test'),
            ('newuser@mail.ru', 'newuser', ''),
            ('newuser@mail.ru', '', 'testpass123'),
        ]
    )
    def test_user_registration_invalid_data(self, api_client, email, username, password):
        """Тест регистрации с невалидными данными."""
        url = reverse("user-list")
        data = {
            "email": email,
            "username": username,
            "password": password,
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize(
        'email,password',
        [
            ('newusermail.ru', 'testpass123'),
            ('', 'testpass123'),
        ]
    )
    def test_login_invalid_data(self, api_client, email, password):
        """Тест входа с невалидными данными."""
        url = reverse("login")
        data = {
            "email": email,
            "password": password,
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTeamPositive:
    """Набор положительных тестов по работе с командами."""

    def test_admin_create_team(self, auth_client_admin_team):
        """Тест на создание команды."""
        url = reverse("teams-list")
        data = {
            "title": constants.TITLE_TEAM,
        }
        response = auth_client_admin_team.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == constants.TITLE_TEAM
        team = Team.objects.first()
        participants = list(team.participants.all()) if team else []
        assert len(participants) == constants.ONE_OBJECT

    def test_admin_change_role(
        self,
        auth_client_admin_team,
        team_with_participants,
        user_team
    ):
        """Тест на изменение роли участника."""
        url = reverse(
            "teams-change-role",
            args=[team_with_participants.id]
        )
        data = {
            'user_id': user_team.id,
            'role': TeamRole.MANAGER
        }
        response = auth_client_admin_team.put(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert (f"{user_team.username} изменена на {TeamRole.MANAGER}"
                in response.data["message"])
        assert data['role'] == Membership.objects.get(user=user_team.id).role

    def test_admin_add_participants(
        self,
        auth_client_admin_team,
        team_without_participants,
        manager_team
    ):
        """Тест на добавление участника в команду."""
        url = reverse(
            "teams-add-participant",
            args=[team_without_participants.id]
        )
        data = {
            "user_id": manager_team.id,
            "role": TeamRole.MANAGER
        }
        response = auth_client_admin_team.put(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert (f"{manager_team.username} добавлен в команду"
                in response.data["status"])
        assert manager_team in team_without_participants.participants.all()

    def test_admin_remove_participants(
        self,
        auth_client_admin_team,
        team_with_participants,
        manager_team
    ):
        """Тест на удаления участника из команды."""
        url = reverse(
            "teams-remove-participant",
            args=[team_with_participants.id]
        )
        data = {
            "user_id": manager_team.id,
        }
        response = auth_client_admin_team.delete(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert (f"{manager_team.username} удален из команды"
                in response.data["status"])
        assert manager_team not in team_with_participants.participants.all()

    def test_admin_get_team(
        self,
        auth_client_admin_team,
        team_with_participants
    ):
        """Тест на получения команды."""
        url = reverse("teams-list")
        response = auth_client_admin_team.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["count"] == constants.ONE_OBJECT
        team_data = data["results"][0]
        assert team_data["title"] == team_with_participants.title
        api_participants = [
            (user["user"]["email"], user["role"])
            for user in team_data["participants"]
        ]
        db_participants = [
            (m.user.email, m.role)
            for m in team_with_participants.memberships.all()
        ]
        assert sorted(api_participants) == sorted(db_participants)

    def test_admin_get_role(
        self,
        auth_client_admin_team,
        team_with_participants,
        admin_team
    ):
        """Тест на получение роли пользователя."""
        url = reverse(
            "teams-my-role",
            args=[team_with_participants.id]
        )
        response = auth_client_admin_team.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == Membership.objects.get(
            user=admin_team.id
        ).role


class TestTeamNegative:
    """Набор негативных тестов по работе с командами."""

    def test_create_team_invalid_data(self, auth_client_admin_team):
        """Тест на создание команды с невалидными данными."""
        url = reverse("teams-list")
        data = {
            "title": None,
        }
        response = auth_client_admin_team.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize(
        "user_fixture_name,role",
        [
            ("user_team", "god"),
            ("user_another_team", TeamRole.MANAGER),
        ]
    )
    def test_admin_change_role_invalid_data(
        self,
        auth_client_admin_team,
        team_with_participants,
        user_fixture_name,
        role,
        request
    ):
        """Тест на изменение роли участника с невалидными данными."""
        user = request.getfixturevalue(user_fixture_name)
        url = reverse("teams-change-role", args=[team_with_participants.id])
        data = {
            "user_id": user.id,
            "role": role
        }
        response = auth_client_admin_team.put(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize(
        'user,role',
        [
            (5, TeamRole.MANAGER),
            (2, TeamRole.MANAGER),
            (4, 'god')
        ]
    )
    def test_admin_add_participants_invalid_data(
        self,
        auth_client_admin_team,
        team_without_participants,
        user,
        role
    ):
        """Тест на добавление участника в команду c невалидными данными."""
        url = reverse(
            "teams-add-participant",
            args=[team_without_participants.id]
        )
        data = {
            "user_id": user,
            "role": role
        }
        response = auth_client_admin_team.put(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize(
        "user_fixture_name",
        [
            ("admin_another_team"),
            ("user_another_team"),
        ]
    )
    def test_admin_remove_participant_invalid_data(
        self,
        auth_client_admin_team,
        team_with_participants,
        user_fixture_name,
        request,
    ):
        """Тест на удаления участника из команды с невалидными данными."""
        user = request.getfixturevalue(user_fixture_name)
        url = reverse(
            "teams-remove-participant",
            args=[team_with_participants.id]
        )
        data = {
            "user_id": user.id,
        }
        response = auth_client_admin_team.delete(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_get_team_another_team(
        self,
        auth_client_admin_team,
        team_with_participants,
        another_team_with_participants
    ):
        """Тест на получения другой команды."""
        url = reverse(
            "teams-detail",
            args=[another_team_with_participants.id]
        )
        response = auth_client_admin_team.get(url)
        print(response.data)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestTaskPositive:
    """Набор положительных тестов по работе с задачами."""

    def test_user_get_task(
        self,
        task_for_user,
        auth_client_user_team,
    ):
        """Тест на получение задач."""
        url = reverse("tasks-list")
        response = auth_client_user_team.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert len(data) == constants.ONE_OBJECT
        task_data = data[0]
        assert task_data["title"] == task_for_user.title
        assert task_data[
            "executor"
        ]['username'] == task_for_user.executor.username
        assert task_data[
            "author"
        ]['username'] == task_for_user.author.username

    def test_manager_create_task(
        self,
        auth_client_manager_team,
        team_with_participants,
        user_team,
    ):
        """Тест на создание задачи."""
        url = reverse('tasks-list')
        data = {
            "title": "Название задачи",
            "description": "Описание задачи",
            "deadline": (datetime.now() + timedelta(days=1)).date(),
            "executor_id": user_team.id,
            "team_id": team_with_participants.id,
            "status": StatusTask.OPEN
        }
        response = auth_client_manager_team.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == constants.TITLE_TASK
        tasks = Task.objects.all()
        assert len(tasks) == constants.ONE_OBJECT

    def test_update_status_task(
        self,
        auth_client_user_team,
        task_for_user,
    ):
        """Тест на обновление статуса задачи."""
        url = reverse("tasks-update-status", args=[task_for_user.id])
        data = {
            "status": StatusTask.PROGRESS
        }
        response = auth_client_user_team.put(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == StatusTask.PROGRESS

    def test_evaluate_task(
        self,
        auth_client_manager_team,
        completed_task_user,
    ):
        """Тест на оценивание задачи."""
        url = reverse(
            "tasks-evaluate-task",
            args=[completed_task_user.id]
        )
        data = {
            "rating": 4,
        }
        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["rating"] == 4


class TestTaskNegative:
    """Набор негативных тестов по работе с задачами."""

    def test_user_get_task(
        self,
        task_another_team,
        auth_client_user_team,
    ):
        """Тест на получение задачи другой команды."""
        url = reverse("tasks-detail", args=[task_another_team.id])
        response = auth_client_user_team.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize(
        'executer_fixture,team_fixture,status_task',
        [
            (
                'user_another_team',
                'another_team_with_participants',
                StatusTask.OPEN
            ),
            (
                'user_team',
                'another_team_with_participants',
                StatusTask.OPEN
            ),
            (
                'user_team',
                'team_with_participants',
                'closed'
            ),
        ]
    )
    def test_manager_create_task(
        self,
        auth_client_manager_team,
        executer_fixture,
        team_fixture,
        status_task,
        request
    ):
        """Тест на создание задачи c невалидными данными."""
        executor = request.getfixturevalue(executer_fixture)
        team = request.getfixturevalue(team_fixture)
        url = reverse('tasks-list')
        data = {
            "title": "Название задачи",
            "description": "Описание задачи",
            "deadline": (datetime.now() + timedelta(days=1)).date(),
            "executor_id": executor.id,
            "team_id": team.id,
            "status": status_task
        }
        response = auth_client_manager_team.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize(
        'task_fixture,status_task,expected_status',
        [
            ('task_for_user', None, status.HTTP_400_BAD_REQUEST),
            ('task_another_team', StatusTask.COMPLETED, status.HTTP_404_NOT_FOUND)
        ]
    )
    def test_update_status_task_invalide_data(
        self,
        auth_client_user_team,
        task_fixture,
        status_task,
        expected_status,
        request
    ):
        """Тест на обновление статуса задачи c невалидными данными."""
        task = request.getfixturevalue(task_fixture)
        url = reverse("tasks-update-status", args=[task.id])
        data = {
            "status": status_task
        }
        response = auth_client_user_team.put(url, data, format="json")
        assert response.status_code == expected_status

    @pytest.mark.parametrize(
        'task_fixture,rating,expected_status',
        [
            ('completed_task_user', 6, status.HTTP_400_BAD_REQUEST),
            ('completed_task_user', None, status.HTTP_400_BAD_REQUEST),
            ('completed_task_user', -5, status.HTTP_400_BAD_REQUEST),
            ('completed_task_another_team', 4, status.HTTP_404_NOT_FOUND)
        ]
    )
    def test_evaluate_task_invalide_date(
        self,
        auth_client_manager_team,
        task_fixture,
        rating,
        expected_status,
        request
    ):
        """Тест на оценивание задачи c невалидными данными."""
        task = request.getfixturevalue(task_fixture)
        url = reverse(
            "tasks-evaluate-task",
            args=[task.id]
        )
        data = {
            "rating": rating,
        }
        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == expected_status


class TestCommentPositive:
    """Набор положительных тестов для комментов задач."""

    def test_get_comment(
        self,
        auth_client_manager_team,
        task_for_user,
        comment_for_task
    ):
        url = reverse(
            "task-comments",
            args=[task_for_user.id]
        )
        response = auth_client_manager_team.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["text"] == comment_for_task.text

    def test_create_comment(
        self,
        auth_client_manager_team,
        task_for_user
    ):
        url = reverse("task-comments", args=[task_for_user.id])
        data = {"text": "Первый комментарий"}
        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["text"] == "Первый комментарий"
        assert response.data["author"]["id"] == task_for_user.author.id


class TestCommentNegative:
    """Набор негативных тестов для комментов задач."""

    def test_get_comment_invalide_date(
        self,
        auth_client_admin_another,
        task_for_user,
        comment_for_task
    ):
        url = reverse(
            "task-comments",
            args=[task_for_user.id]
        )
        response = auth_client_admin_another.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize(
        'task_fixture,text,expected_status',
        [
            ('task_for_user', None, status.HTTP_400_BAD_REQUEST),
            ('task_another_team', 'Комментарий', status.HTTP_404_NOT_FOUND),
        ]
    )
    def test_create_comment_invalide_date(
        self,
        auth_client_manager_team,
        task_fixture,
        text,
        expected_status,
        request
    ):
        task = request.getfixturevalue(task_fixture)
        url = reverse("task-comments", args=[task.id])
        data = {"text": text}
        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == expected_status


class TestMeetingPositive:
    """Набор положительных тестов для встреч."""

    def test_get_meeting(
        self,
        auth_client_user_team,
        meeting_for_team,
    ):
        url = reverse("meetings-list")
        response = auth_client_user_team.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["duration"] == meeting_for_team.duration

    def test_create_meeting(
        self,
        auth_client_manager_team,
        team_with_participants,
        user_team
    ):
        url = reverse("meetings-list") + f"?team={team_with_participants.id}"
        data = {
            "date": (datetime.now() + timedelta(days=1)).date(),
            "time": (datetime.now() + timedelta(hours=1)).time(),
            "duration": 60,
            "participants": [user_team.id],
        }
        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["team"]["id"] == team_with_participants.id


class TestMeetingNegative:
    """Набор негативных тестов для встреч."""

    def test_get_meeting_another_team(
        self,
        auth_client_user_team,
        meeting_for_another_team,
    ):
        url = reverse("meetings-detail", args=[meeting_for_another_team.id])
        response = auth_client_user_team.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_meeting_without_team_param(
        self,
        auth_client_manager_team,
        user_team,
    ):
        """Если не передать ?team=<id>, должно вернуться 400."""
        url = reverse("meetings-list")
        data = {
            "date": (datetime.now() + timedelta(days=1)).date(),
            "time": (datetime.now() + timedelta(hours=1)).time(),
            "duration": 60,
            "participants": [user_team.id],
        }

        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_meeting_in_foreign_team(
        self,
        auth_client_manager_team,
        another_team_with_participants,
        user_another_team
    ):
        """Тест на создание встречи в другой команде."""
        url = reverse(
            "meetings-list"
        ) + f"?team={another_team_with_participants.id}"
        data = {
            "date": (datetime.now() + timedelta(days=1)).date(),
            "time": (datetime.now() + timedelta(hours=1)).time(),
            "duration": 30,
            "participants": [user_another_team.id],
        }

        response = auth_client_manager_team.post(url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

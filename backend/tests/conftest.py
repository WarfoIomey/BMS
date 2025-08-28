from datetime import datetime, timedelta

import pytest
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from teamflow.models import (
    Comment,
    Evaluation,
    Membership,
    Meeting,
    Team,
    TeamRole,
    Task,
    StatusTask,
)


@pytest.fixture
def api_client():
    """Неавторизованный APIClient."""
    return APIClient()


@pytest.fixture
def admin_team(django_user_model):
    """Создание пользователя админа команды."""
    return django_user_model.objects.create_user(
        email='adminteam@mail.ru',
        username='admiteam',
        password='passwordadmin',
    )


@pytest.fixture
def manager_team(django_user_model):
    """Создание пользователя менеджера команды."""
    return django_user_model.objects.create_user(
        email='managerteam@mail.ru',
        username='managerteam',
        password='passwordmanager',
    )


@pytest.fixture
def user_team(django_user_model):
    """Создание обычного пользователя команды."""
    return django_user_model.objects.create_user(
        email='userteam@mail.ru',
        username='userteam',
        password='passworduserteam',
    )


@pytest.fixture
def admin_another_team(django_user_model):
    """Создание обычного пользователя без команды."""
    return django_user_model.objects.create_user(
        email='adminanother@mail.ru',
        username='adminanother',
        password='passwordadminanother',
    )


@pytest.fixture
def user_another_team(django_user_model):
    """Создание обычного пользователя без команды."""
    return django_user_model.objects.create_user(
        email='useranother@mail.ru',
        username='useranother',
        password='passworduseranother',
    )


@pytest.fixture
def auth_client_admin_team(admin_team):
    """Авторизованный клиент (админ команды)."""
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=admin_team)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def auth_client_manager_team(manager_team):
    """Авторизованный клиент (менеджер команды)."""
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=manager_team)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def auth_client_user_team(user_team):
    """Авторизованный клиент (пользователя команды)."""
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user_team)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def auth_client_admin_another(admin_another_team):
    """Авторизованный клиент (админа другой команды)."""
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=admin_another_team)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def auth_client_user_another(user_another_team):
    """Авторизованный клиент (пользователя другой команды)."""
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user_another_team)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def team_without_participants(admin_team):
    """Создание команды без участников."""
    team = Team.objects.create(
        title='Команда 1',
    )
    Membership.objects.create(team=team, user=admin_team, role=TeamRole.ADMIN)
    return team


@pytest.fixture
def another_team_with_participants(admin_another_team, user_another_team):
    """Создание другой команды."""
    team = Team.objects.create(
        title='Другая команда',
    )
    Membership.objects.create(
        team=team,
        user=admin_another_team,
        role=TeamRole.ADMIN
    )
    Membership.objects.create(
        team=team,
        user=user_another_team,
        role=TeamRole.PARTICIPANT
    )
    return team


@pytest.fixture
def team_with_participants(admin_team, manager_team, user_team):
    """Создание команды с участниками."""
    team = Team.objects.create(
        title='Команда 1',
    )
    Membership.objects.create(team=team, user=admin_team, role=TeamRole.ADMIN)
    Membership.objects.create(
        team=team,
        user=manager_team,
        role=TeamRole.MANAGER
    )
    Membership.objects.create(
        team=team,
        user=user_team,
        role=TeamRole.PARTICIPANT
    )
    return team


@pytest.fixture
def task_another_team(
    another_team_with_participants,
    admin_another_team,
    user_another_team
):
    """Фикстура задачи другой команды."""
    task = Task.objects.create(
        author=admin_another_team,
        title='Название задачи',
        description='Описание задачи',
        deadline=datetime.now() + timedelta(days=1),
        executor=user_another_team,
        team=another_team_with_participants
    )
    return task


@pytest.fixture
def completed_task_another_team(
    another_team_with_participants,
    admin_another_team,
    user_another_team
):
    """Фикстура задачи другой команды."""
    task = Task.objects.create(
        author=admin_another_team,
        title='Название задачи',
        description='Описание задачи',
        deadline=datetime.now() + timedelta(days=1),
        executor=user_another_team,
        team=another_team_with_participants
    )
    return task


@pytest.fixture
def task_for_user(team_with_participants, manager_team, user_team):
    """Фикстура новой задачи."""
    task = Task.objects.create(
        author=manager_team,
        title='Название задачи',
        description='Описание задачи',
        deadline=datetime.now() + timedelta(days=1),
        executor=user_team,
        team=team_with_participants,
        status=StatusTask.COMPLETED
    )
    return task


@pytest.fixture
def completed_task_user(team_with_participants, manager_team, user_team):
    """Фикстура завершенной задачи."""
    task = Task.objects.create(
        author=manager_team,
        title='Название задачи',
        description='Описание задачи',
        deadline=datetime.now() + timedelta(days=1),
        executor=user_team,
        team=team_with_participants,
        status=StatusTask.COMPLETED
    )
    return task


@pytest.fixture
def comment_for_task(task_for_user, user_team):
    """Фикстура комментария к задаче."""
    comment = Comment.objects.create(
        text='Комментарий к задаче',
        task=task_for_user,
        author=user_team,
    )
    return comment


@pytest.fixture
def meeting_for_team(
    team_with_participants,
    admin_team,
    manager_team,
    user_team
):
    meeting = Meeting.objects.create(
        team=team_with_participants,
        author=admin_team,
        date=(datetime.now() + timedelta(days=1)).date(),
        time=(datetime.now() + timedelta(hours=1)).time(),
        duration=60,
    )
    meeting.participants.set([manager_team, user_team])
    return meeting


@pytest.fixture
def meeting_for_another_team(
    another_team_with_participants,
    admin_another_team,
    user_another_team
):
    meeting = Meeting.objects.create(
        team=another_team_with_participants,
        author=admin_another_team,
        date=(datetime.now() + timedelta(days=1)).date(),
        time=(datetime.now() + timedelta(hours=1)).time(),
        duration=60,
    )
    meeting.participants.set([user_another_team])
    return meeting

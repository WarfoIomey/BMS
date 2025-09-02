from rest_framework import permissions

from teamflow.models import TeamRole
from .utils import get_membership


class IsTeamAdmin(permissions.BasePermission):
    """
    Доступ:
    - SAFE методы любой участник команды.
    - POST/PUT/DELETE  только админ команды или суперюзер.
    """

    def has_object_permission(self, request, view, obj):
        team = obj
        membership = get_membership(request.user, team)
        if request.method in permissions.SAFE_METHODS:
            return membership is not None
        if request.method == "POST":
            return True
        return (
            request.user.is_superuser
            or (membership and membership.role == TeamRole.ADMIN)
        )


class IsManagerOrAdmin(permissions.BasePermission):
    """
    POST менеджер или админ.
    PUT автор или исполнитель.
    SAFE методы любой участник.
    """

    def has_object_permission(self, request, view, obj):
        team = getattr(obj, "team", None)
        membership = get_membership(request.user, team)
        if request.method in permissions.SAFE_METHODS:
            return membership is not None
        if request.method == "POST":
            return (
                request.user.is_superuser
                or (membership and membership.role in [
                    TeamRole.ADMIN, TeamRole.MANAGER
                ])
            )
        if request.method == "PUT":
            return obj.author == request.user or obj.executor == request.user

        return False


class CanEvaluateTask(permissions.BasePermission):
    """Разрешение на оценку задачи только автором"""

    def has_object_permission(self, request, view, obj):
        return obj.author == request.user

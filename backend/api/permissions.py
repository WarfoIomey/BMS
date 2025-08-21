from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Доступ:
    - GET (и другие SAFE методы) → любой аутентифицированный пользователь.
    - POST/PUT/DELETE → только админ команды (role=admin_team или superuser).
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.is_admin


class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if request.method == 'POST':
            return user.is_authenticated and (user.is_admin or user.is_manager)
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.method == 'PUT':
            if obj.author == request.user:
                return True
            if user.is_authenticated and user.is_user:
                return obj.executor == request.user
        if request.method == 'POST':
            if obj.author == request.user:
                return True


class CanEvaluateTask(permissions.BasePermission):
    """Разрешение на оценку задачи только автором"""

    def has_object_permission(self, request, view, obj):
        return obj.author == request.user

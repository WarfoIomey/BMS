from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Разрешение для проверки прав доступа к объектам.

    Разрешает:
    - Небезопасные операции только для аутентифицированных пользователей с
    правами администратора.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.is_admin
        )


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

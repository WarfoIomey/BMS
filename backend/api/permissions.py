from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Разрешение для проверки прав доступа к объектам.

    Разрешает:
    - Небезопасные операции только для аутентифицированных пользователей с
    правами администратора.
    """

    def has_permission(self, request, view):
        ""
        return (
            request.user.is_authenticated and request.user.is_admin
        )

from django.contrib import admin
from django.contrib.auth import get_user_model


User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Настройка админки для модели User."""

    list_display = (
        'id',
        'username',
        'email',
        'first_name',
        'last_name',
        'bio',
        'role'
    )
    search_fields = ('username', 'role')
    list_filter = ('username',)
    list_editable = ('role',)
    empty_value_display = '-пусто-'

from django.contrib import admin
from django.contrib.auth import get_user_model


User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Настройка админки для модели User."""

    list_display = (
        'pk',
        'username',
        'email',
        'first_name',
        'last_name',
        'avatar'
    )
    search_fields = ('username',)
    list_filter = ('username',)
    empty_value_display = '-пусто-'

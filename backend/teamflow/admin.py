from django.contrib import admin

from .models import Team, Task, Evaluation


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    """Настройка админки для модели Team."""

    list_display = (
        'id',
        'title',
    )


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Настройка админки для модели Task."""

    list_display = (
        'id',
        'title',
        'description',
        'deadline',
        'status',
    )


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    """Настройка админки для модели Evaluation."""

    list_display = (
        'id',
        'task',
        'rating',
    )
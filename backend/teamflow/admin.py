from typing import Any
from django.contrib import admin
from django.db.models.fields.related import ManyToManyField
from django.forms.models import ModelMultipleChoiceField
from django.http import HttpRequest

from .models import Comment, Team, Task, Evaluation, Meeting


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


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Настройка админки для модели Comment."""

    list_display = (
        'id',
        'author',
        'task',
        'created_at',
        'text'
    )


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    """Настройка админки для модели Meeting."""

    list_display = (
        'id',
        'date',
        'time',
        'duration',
    )
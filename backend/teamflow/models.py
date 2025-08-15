from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

import teamflow.constants as constants


User = get_user_model()


class StatusTask(models.TextChoices):
    """Перечисление статусов задач."""

    OPEN = 'open', 'Открыта'
    PROGRESS = 'progress', 'В работе'
    COMPLETED = 'completed', 'Выполнена'


class Team(models.Model):
    title = models.CharField(
        max_length=constants.MAX_LENGTH_NAME_TEAME,
        verbose_name='Название команды',
        help_text='Введите название команды'
    )
    participants = models.ManyToManyField(
        User,
        verbose_name='Участники команды',
        related_name='teams',
        help_text='Выберите участников для команды',
    )

    class Meta:
        ordering = ['-id']
        verbose_name = 'Команда'
        verbose_name_plural = 'Команды'

    def __str__(self):
        return self.title


class Task(models.Model):
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text='Укажите автора',
        verbose_name='Автор',
        related_name='authored_tasks'
    )
    title = models.CharField(
        max_length=constants.MAX_LENGTH_NAME_TASK,
        verbose_name='Название Задачи',
        help_text='Введите название Задачи'
    )
    description = models.TextField(
        verbose_name='Описание задачи',
        help_text='Введите описание задачи',
    )
    deadline = models.DateField(
        verbose_name='Дедлайн задачи',
        help_text='Укажите дедлайн задачи',
    )
    status = models.CharField(
        max_length=20,
        verbose_name='Статус задачи',
        choices=StatusTask.choices,
        default=StatusTask.OPEN
    )
    executor = models.ForeignKey(
        User,
        help_text='Укажите исполнителя',
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        verbose_name='Исполнитель',
    )
    team = models.ForeignKey(
        Team,
        help_text='Укажите команду',
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='Команда',
    )

    class Meta:
        ordering = ['-id']
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'

    def __str__(self):
        return self.title


class Evaluation(models.Model):
    task = models.ForeignKey(
        Task,
        help_text='Укажите задачу',
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='задача',
    )
    rating = models.IntegerField(
        validators=[
            MinValueValidator(constants.MIN_RATING),
            MaxValueValidator(constants.MAX_RATING)
        ],
        help_text="Оценка от 1 до 5",
        verbose_name='Оценка',
    )

    class Meta:
        ordering = ['-id']
        verbose_name = 'Оценка'
        verbose_name_plural = 'Оценки'

    def __str__(self):
        return f'{self.task.team.title} - {self.task.title}'

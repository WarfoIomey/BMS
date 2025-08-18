from datetime import datetime, timedelta

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

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
    evaluator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text='Укажите кто оценил задачу',
        related_name='evaluations_given',
        verbose_name='Автор оценки'
    )
    rating = models.IntegerField(
        validators=[
            MinValueValidator(constants.MIN_RATING),
            MaxValueValidator(constants.MAX_RATING)
        ],
        help_text="Оценка от 1 до 5",
        verbose_name='Оценка',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['task', 'evaluator']]
        ordering = ['-id']
        verbose_name = 'Оценка'
        verbose_name_plural = 'Оценки'

    def __str__(self):
        return f'{self.task.team.title} - {self.task.title}'


class Comment(models.Model):
    text = models.TextField(
        help_text='Текст комментария',
        verbose_name='Текст'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        verbose_name='Задача',
        help_text='Комментарий задачи',
        null=True,
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='Автор комментария',
        help_text='Автор комментария',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Время создания комментария',
        verbose_name='Добавлено'
    )

    class Meta:
        verbose_name = 'Комментарий'
        verbose_name_plural = 'Комментарии'

    def __str__(self):
        return f'{self.author.username} - {self.text}'


class Meeting(models.Model):
    organizer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name='Организатор встречи ',
        related_name='organized_meetings',
        help_text='Пользователь создавший встречу',
    )
    date = models.DateField(
        help_text='Укажите дату встречи',
        verbose_name='Дата'
    )
    time = models.TimeField(
        help_text='Укажите время встречи',
        verbose_name='Время'
    )
    duration = models.IntegerField(
        help_text='Укажите длительность встречи (мин.)',
        verbose_name='Длительность',
        validators=[
            MinValueValidator(constants.MIN_DURATION),
            MaxValueValidator(constants.MAX_DURATION)
        ],
    )
    participants = models.ManyToManyField(
        User,
        verbose_name='Участники встречи',
        related_name='meetings',
        help_text='Выберите участников для встречи',
    )

    class Meta:
        verbose_name = 'Встреча'
        verbose_name_plural = 'Встречи'

    def __str__(self):
        return f'{self.date} - {self.time} - {self.duration}'

    def get_start_datetime(self):
        """Возвращает datetime начала встречи."""
        return datetime.combine(self.date, self.time)

    def get_end_datetime(self):
        """Возвращает datetime окончания встречи"""
        return self.get_start_datetime() + timedelta(minutes=self.duration)

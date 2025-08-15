from django.db import models

from .constants import MAX_LENGTH_NAME_TEAME


class Team(models.Model):
    title = models.CharField(
        max_length=MAX_LENGTH_NAME_TEAME,
        verbose_name='Название команды',
        help_text='Введите название команды'
    )

from datetime import datetime,  timedelta

from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from teamflow.constants import (
    MIN_RATING,
    MAX_RATING
)
from teamflow.models import (
    Comment,
    Evaluation,
    Team,
    Task,
    StatusTask,
    Meeting
)
from users.models import UserRole


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для пользователей."""

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'bio',
            'role'
        )
        read_only_fields = fields


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации пользователей."""

    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'password'
        )
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'username': {'required': True, 'allow_blank': False},
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email уже занят")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Сериализатор для смены пароля."""
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password]
    )

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Текущий пароль неверный")
        return value


class TeamSerializer(serializers.ModelSerializer):

    participants = UserSerializer(
        many=True,
        allow_empty=False
    )

    class Meta:
        model = Team
        fields = (
            'id',
            'title',
            'participants'
        )


class TeamCreateSerializers(serializers.ModelSerializer):

    class Meta:
        model = Team
        fields = (
            'id',
            'title',
        )


class TeamAddParticipantSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True
    )


class TeamRemoveParticipantSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True
    )


class TaskSerializers(serializers.ModelSerializer):
    """Сериализатор для задач."""

    status = serializers.ChoiceField(choices=StatusTask.choices)
    executor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='executor',
        write_only=True
    )
    author = UserSerializer(read_only=True)
    executor = UserSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    author_rating = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            'id',
            'author',
            'title',
            'description',
            'deadline',
            'executor_id',
            'status',
            'executor',
            'team',
            'author_rating'
        )

    def create(self, validated_data):
        user = self.context['request'].user
        team = user.teams.first()
        if not team:
            raise serializers.ValidationError(
                "Пользователь не состоит в команде"
            )
        executor = validated_data.get('executor')
        if executor and not team.participants.filter(id=executor.id).exists():
            raise serializers.ValidationError({
                "executor_id": "Исполнитель не состоит в вашей команде"
            })
        validated_data.update({
            'author': user,
            'team': team
        })
        return super().create(validated_data)

    def get_author_rating(self, obj):
        evaluation = obj.evaluations.filter(evaluator=obj.author).first()
        return evaluation.rating if evaluation else None


class TaskStatusUpdateSerializers(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status']


class CommentTaskCreateSerializers(serializers.ModelSerializer):
    """Сериализатор для комментариев."""
    author = UserSerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'text', 'author', 'created_at')
        read_only_fields = ('id', 'author', 'created_at')
        extra_kwargs = {
            'text': {
                'required': True,
                'allow_blank': False,
                'error_messages': {
                    'blank': 'Комментарий не может быть пустым'
                }
            }
        }

    def validate(self, attrs):
        task_id = self.context['view'].kwargs['task_pk']
        user = self.context['request'].user
        attrs['task'] = get_object_or_404(
            Task.objects.filter(
                id=task_id,
                team__participants=user
            )
        )
        return attrs


class CommentTaskReadSerializers(serializers.ModelSerializer):
    author = UserSerializer()
    task = TaskSerializers()

    class Meta:
        model = Comment
        fields = (
            'id',
            'author',
            'text',
            'task',
            'created_at',
        )
        read_only_fields = fields


class EvaluationCreateSerializers(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = ('rating',)
        extra_kwargs = {
            'rating': {
                'min_value': MIN_RATING,
                'max_value': MAX_RATING
            }
        }

    def validate(self, attrs):
        request = self.context['request']
        task = self.context['task']
        if task.author != request.user:
            raise serializers.ValidationError(
                "Только автор задачи может ее оценивать"
            )
        if task.status != StatusTask.COMPLETED:
            raise serializers.ValidationError(
                "Нельзя оценивать незавершенную задачу"
            )
        if Evaluation.objects.filter(
            task=task,
            evaluator=request.user
        ).exists():
            raise serializers.ValidationError(
                "Вы уже оценивали эту задачу"
            )
        return attrs


class EvaluationReadSerializers(serializers.ModelSerializer):
    evaluator = UserSerializer(read_only=True)
    task = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Evaluation
        fields = (
            'id',
            'evaluator',
            'task',
            'rating',
            'created_at'
        )
        read_only_fields = fields


class MeetingSerializers(serializers.ModelSerializer):

    participants = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        allow_empty=False,
        required=True
    )
    organizer = UserSerializer(read_only=True)

    class Meta:
        model = Meeting
        fields = (
            'id',
            'organizer',
            'date',
            'time',
            'duration',
            'participants'
        )
        read_only_fields = ['organizer']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['participants'].queryset = User.objects.filter(
                teams__in=request.user.teams.all()
            )

    def create(self, validated_date):
        validated_date.update({
            'organizer': self.context['request'].user,
        })
        return super().create(validated_date)

    def validate(self, attrs):
        user = self.context['request'].user
        date = attrs['date']
        time = attrs['time']
        duration = attrs['duration']
        participants = list(attrs['participants'])
        participants.append(user)
        attrs['participants'] = participants
        allowed_user = User.objects.filter(
            teams__in=user.teams.all()
        ).distinct()
        for participant in participants:
            if participant not in allowed_user:
                raise serializers.ValidationError(
                    {
                        "detail": "Пользователь не входит в команду"
                    }
                )
        start = datetime.combine(date, time)
        end = start + timedelta(minutes=duration)
        instance = getattr(self, 'instance', None)
        for participant in participants:
            overlapping_meetings = Meeting.objects.filter(
                participants=participant,
                date=date
            )
            if instance:
                overlapping_meetings = overlapping_meetings.exclude(
                    id=instance.id
                )

            for meeting in overlapping_meetings:
                other_start = meeting.get_start_datetime()
                other_end = meeting.get_end_datetime()
                if (start < other_end) and (end > other_start):
                    raise serializers.ValidationError({
                        'participant': participant.username,
                        'conflict_start': other_start.time(),
                        'conflict_end': other_end.time(),
                        'detail': 'Встреча пересекается с другой'
                    })
        return attrs


class ChangeRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    role = serializers.ChoiceField(
        choices=[UserRole.MANAGER, UserRole.USER],
        required=True
    )

    def validate_user_id(self, value):
        request = self.context['request']
        team = self.context['team']
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Пользователь не найден")
        if not team.participants.filter(id=value).exists():
            raise serializers.ValidationError(
                "Пользователь не состоит в вашей команде"
            )
        if value == request.user.id:
            raise serializers.ValidationError(
                "Вы не можете изменить свою собственную роль"
            )
        return user

    def validate(self, data):
        """
        Проверка, что у пользователя еще не установлена эта роль.
        """
        user = data['user_id']
        new_role = data['role']
        if user.role == new_role:
            raise serializers.ValidationError(
                {"role": f"У пользователя уже установлена роль {new_role}"}
            )
        return data

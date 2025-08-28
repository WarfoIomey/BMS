from datetime import datetime, timedelta

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
    Meeting,
    Membership,
    StatusTask,
    Team,
    TeamRole,
    Task,
)

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


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Membership
        fields = ('user', 'role')


class TeamSerializer(serializers.ModelSerializer):
    """Сериализатор для работы с командами."""
    participants = MembershipSerializer(
        many=True,
        source='memberships'
    )

    class Meta:
        model = Team
        fields = (
            'id',
            'title',
            'participants',
        )


class TeamCreateSerializers(serializers.ModelSerializer):
    """Сериализатор для создания с команды."""
    class Meta:
        model = Team
        fields = (
            'id',
            'title',
        )


class TeamAddParticipantSerializer(serializers.Serializer):
    """Сериализатор для добавления пользователя в команду."""
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True
    )


class TeamRemoveParticipantSerializer(serializers.Serializer):
    """Сериализатор для удаления пользователей из команды."""
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
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source='team',
        write_only=True
    )
    author = UserSerializer(read_only=True)
    executor = UserSerializer(read_only=True)
    team = TeamSerializer(read_only=True)
    author_rating = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

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
            'team_id',
            'author_rating',
            'my_role'
        )

    def get_my_role(self, obj):
        user = self.context['request'].user
        membership = obj.team.memberships.filter(user=user).first()
        return membership.role if membership else None

    def validate_team_id(self, value):
        """Проверяем, что пользователь состоит в указанной команде."""
        user = self.context['request'].user
        if not user.teams.filter(id=value.id).exists():
            raise serializers.ValidationError(
                "Пользователь не состоит в указанной команде"
            )
        return value

    def validate(self, data):
        """Проверяем, что исполнитель состоит в указанной команде."""
        team = data.get('team')
        executor = data.get('executor')
        user = self.context['request'].user
        if executor and executor == user:
            raise serializers.ValidationError({
                "executor_id": "Нельзя назначить себя исполнителем задачи"
            })
        if executor and team:
            if not team.participants.filter(id=executor.id).exists():
                raise serializers.ValidationError({
                    "executor_id": "Исполнитель не состоит в указанной команде"
                })
        return data

    def get_author_rating(self, obj):
        evaluation = obj.evaluations.filter(evaluator=obj.author).first()
        return evaluation.rating if evaluation else None


class TaskStatusUpdateSerializers(serializers.ModelSerializer):
    """Сериализатор для обновления статуса задачи."""
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
    """Сериализатор для получения комментариев."""
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
    """Сериализатор для оценки задач."""
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
    """Сериализатор для получения оценок."""
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
    """Сериализатор для работы со встречами."""

    participants = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        allow_empty=False,
        required=True
    )
    author = UserSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = Meeting
        fields = (
            'id',
            'author',
            'date',
            'time',
            'duration',
            'participants',
            'team'
        )
        read_only_fields = ['author', 'team']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['participants'].queryset = User.objects.filter(
                teams__in=request.user.teams.all()
            )

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
    """Сериализатор для изменения ролей команды."""
    user_id = serializers.IntegerField(required=True)
    role = serializers.ChoiceField(
        choices=TeamRole.choices,
        required=True
    )

    def validate_user_id(self, value):
        request = self.context['request']
        team = self.context['team']
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Пользователь не найден")
        membership = Membership.objects.filter(user=user, team=team).first()
        if not membership:
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
        team = self.context['team']
        membership = Membership.objects.get(user=user, team=team)
        new_role = data['role']
        if membership.role == new_role:
            raise serializers.ValidationError(
                {"role": f"У пользователя уже установлена роль {new_role}"}
            )
        return data

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from teamflow.models import Team, Task, StatusTask


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
        extra_kwargs = {
            'role': {'read_only': True},
        }


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
            'first_name',
            'last_name',
            'bio',
            'password'
        )
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


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
            'team'
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


class TaskStatusUpdateSerializers(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status']

    def validate_status(self, value):
        user = self.context['request'].user
        current_status = self.instance.status
        if user.is_user:
            if value != 'progress' or current_status != 'open':
                raise serializers.ValidationError(
                    "Вы можете менять статус только с open на progress"
                )
        return value

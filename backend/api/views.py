from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    PasswordChangeSerializer,
    TeamSerializer,
    TaskSerializers,
    TaskStatusUpdateSerializers,
)
from teamflow.models import Team, Task
from .permissions import IsAdmin, IsManagerOrAdmin


User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """Вьюсет для работы с пользователями."""

    queryset = User.objects.all()
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    @action(
        methods=['get'],
        detail=False,
        url_path='me',
        permission_classes=[IsAuthenticated],
    )
    def get_me(self, request):
        """Получение текущего пользователя."""
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='set_password')
    def set_password(self, request):
        """Смена пароля."""
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamViewSet(viewsets.ModelViewSet):
    """Вьюсет для работы с командами."""

    queryset = Team.objects.all()
    http_method_names = ['get', 'post', 'put', 'delete']
    serializer_class = TeamSerializer
    # permission_classes=[IsAdmin],


class TaskViewSet(viewsets.ModelViewSet):
    """Вьюсет для работы с задачами."""

    queryset = Task.objects.all()
    http_method_names = ['get', 'post', 'put', 'delete']
    permission_classes = [IsManagerOrAdmin, IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'update':
            return TaskStatusUpdateSerializers
        return TaskSerializers

    def get_queryset(self):
        '''Получение задач, только своей команды.'''
        user = self.request.user
        if user.is_superuser:
            return super().get_queryset()
        return Task.objects.filter(
            team__participants=user
        ).select_related('executor', 'team')

    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        task = self.get_object()
        serializer = self.get_serializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

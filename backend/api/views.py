from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, QuerySet
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import filters

from api.serializers import (
    CommentTaskCreateSerializers,
    CommentTaskReadSerializers,
    ChangeRoleSerializer,
    TeamCreateSerializers,
    UserSerializer,
    UserRegistrationSerializer,
    PasswordChangeSerializer,
    TeamSerializer,
    TeamAddParticipantSerializer,
    TeamRemoveParticipantSerializer,
    TaskSerializers,
    TaskStatusUpdateSerializers,
    EvaluationCreateSerializers,
    EvaluationReadSerializers,
    MeetingSerializers
)
from teamflow.models import Comment, Meeting, Team, Task, Evaluation
from .permissions import CanEvaluateTask, IsAdmin, IsManagerOrAdmin


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
    # serializer_class = TeamSerializer
    permission_classes = [IsAdmin,]

    def get_serializer_class(self):
        if self.action == 'create':
            return TeamCreateSerializers
        return TeamSerializer

    def destroy(self, request, *args, **kwargs):
        return Response(
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def update(self, request, *args, **kwargs):
        return Response(
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=True, methods=['put'], url_path='change-role')
    def change_role(self, request, pk=None):
        team = self.get_object()
        serializer = ChangeRoleSerializer(
            data=request.data,
            context={'team': team, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user_id']
        new_role = serializer.validated_data['role']
        user.role = new_role
        user.save()
        return Response(
            {
                'message': f'Роль {user.username} изменена на {new_role}',
                'user_id': user.id,
                'new_role': new_role
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['put'], url_path='add-participant')
    def add_participant(self, request, pk=None):
        team = self.get_object()
        serializer = TeamAddParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user_id']
        if team.participants.filter(id=user.id).exists():
            return Response(
                {'error': f'Пользователь {user.username} уже в команде'},
                status=status.HTTP_400_BAD_REQUEST
            )
        team.participants.add(user)
        return Response(
            {'status': f'Пользователь {user.username} добавлен в команду'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['delete'], url_path='remove-participant')
    def remove_participant(self, request, pk=None):
        team = self.get_object()
        serializer = TeamRemoveParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user_id']
        if not team.participants.filter(id=user.id).exists():
            return Response(
                {'error': f'Пользователя {user.username} нет в команде'},
                status=status.HTTP_400_BAD_REQUEST
            )
        team.participants.remove(user)
        return Response(
            {'status': f'Пользователь {user.username} удален из команды'},
            status=status.HTTP_200_OK
        )


class TaskViewSet(viewsets.ModelViewSet):
    """Вьюсет для работы с задачами."""

    queryset = Task.objects.all()
    http_method_names = ['get', 'post', 'put', 'delete']
    permission_classes = [IsManagerOrAdmin, IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_fields = ['status', 'executor', 'author']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'deadline', 'priority']
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            task = self.get_object()
            if self.request.user == task.author:
                return TaskSerializers
            return TaskStatusUpdateSerializers
        return TaskSerializers

    def get_queryset(self):
        """Получение задач, только своей команды."""
        user = self.request.user
        team_id = self.request.query_params.get('team')
        queryset = Task.objects.filter(team__participants=user)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        return queryset.select_related('executor', 'team')

    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        task = self.get_object()
        serializer = self.get_serializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        url_path='evaluate',
        permission_classes=[IsAuthenticated, CanEvaluateTask]
    )
    def evaluate_task(self, request, pk=None):
        task = self.get_object()
        serializer = EvaluationCreateSerializers(
            data=request.data,
            context={
                'request': request,
                'task': task
            }
        )
        serializer.is_valid(raise_exception=True)
        evaluation = Evaluation.objects.create(
            task=task,
            evaluator=request.user,
            rating=serializer.validated_data['rating']
        )
        return Response(
            EvaluationReadSerializers(evaluation).data,
            status=status.HTTP_201_CREATED
        )

    @action(
        detail=False,
        methods=['get'],
        url_path='executor-evaluations',
        permission_classes=[IsAuthenticated]
    )
    def executor_evaluations(self, request):
        """Получение всех оценок задач, где пользователь является исполнителем."""
        evaluations = Evaluation.objects.filter(
            task__executor=request.user
        ).select_related('task', 'evaluator', 'task__team')
        stats = evaluations.aggregate(
            average_rating=Avg('rating'),
            total_evaluations=Count('id')
        )
        serializer = EvaluationReadSerializers(evaluations, many=True)
        return Response(
            {
                'average_rating': round(stats['average_rating'], 2),
                'total_evaluations': stats['total_evaluations'],
                'evaluations': serializer.data
            }
        )


class CommentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['POST']:
            return CommentTaskCreateSerializers
        return CommentTaskReadSerializers

    def get_queryset(self) -> QuerySet[Comment]:
        task: Task = get_object_or_404(
            Task.objects.filter(
                id=self.kwargs['task_pk'],
                team__participants=self.request.user
            )
        )
        return task.comments.select_related('author').order_by('-created_at')


class MeetingViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingSerializers
    permission_classes = [IsManagerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        return Meeting.objects.filter(
            Q(participants=user) | Q(organizer=user)
        ).distinct()

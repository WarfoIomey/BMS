from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, QuerySet
from django.http import Http404
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import (
    PermissionDenied,
    NotFound,
    ValidationError
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.filters import MeetingFilter
from api.serializers import (
    CommentTaskCreateSerializers,
    CommentTaskReadSerializers,
    EvaluationCreateSerializers,
    EvaluationReadSerializers,
    ChangeRoleSerializer,
    MeetingSerializers,
    PasswordChangeSerializer,
    TeamCreateSerializers,
    TeamSerializer,
    TeamAddParticipantSerializer,
    TeamRemoveParticipantSerializer,
    TaskSerializers,
    TaskStatusUpdateSerializers,
    UserSerializer,
    UserRegistrationSerializer,
)
from teamflow.models import (
    Comment,
    Evaluation,
    Membership,
    Meeting,
    Team,
    TeamRole,
    Task,
)
from .permissions import (
    CanEvaluateTask,
    IsTeamAdmin,
    IsManagerOrAdmin
)


User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """Вьюсет для работы с пользователями."""

    queryset = User.objects.all()
    http_method_names = ['get', 'post', 'put', 'delete']
    pagination_class = None

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

    @action(detail=False, methods=['get'], url_path='team-users')
    def team_users(self, request):
        """Получение пользователей из команды текущего пользователя."""
        user = request.user
        if not user.teams.exists():
            return Response(
                {"detail": "Пользователь не состоит ни в одной команде"},
                status=status.HTTP_400_BAD_REQUEST
            )
        team = user.teams.first()
        team_users = team.participants.all()
        serializer = UserSerializer(team_users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TeamViewSet(viewsets.ModelViewSet):
    """Вьюсет для работы с командами."""

    queryset = Team.objects.all()
    http_method_names = ['get', 'post', 'put', 'delete']
    permission_classes = [IsTeamAdmin,]

    def get_queryset(self):
        """Получение команд, в которых пользовать состоит."""
        user = self.request.user
        return Team.objects.filter(participants=user)

    def retrieve(self, request, *args, **kwargs):
        """Получение конкретной команды с проверкой доступа."""
        try:
            return super().retrieve(request, *args, **kwargs)
        except Http404:
            return Response(
                {"detail": "Команда не найдена или у вас нет к ней доступа."},
                status=status.HTTP_404_NOT_FOUND
            )

    def get_serializer_class(self):
        if self.action == 'create':
            return TeamCreateSerializers
        return TeamSerializer

    def perform_create(self, serializer):
        team = serializer.save()
        Membership.objects.create(
            user=self.request.user,
            team=team,
            role=TeamRole.ADMIN
        )

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
        membership = Membership.objects.get(user=user, team=team)
        membership.role = new_role
        membership.save()
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
        Membership.objects.create(
            user=user,
            team=team,
            role=request.data['role']
        )
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
        Membership.objects.filter(user=user, team=team).delete()
        return Response(
            {'status': f'Пользователь {user.username} удален из команды'},
            status=status.HTTP_200_OK
        )

    @action(
        detail=True,
        methods=['get'],
        url_path='my-role',
        url_name='my-role'
    )
    def my_role_in_team(self, request, pk=None):
        membership = request.user.memberships.filter(team_id=pk).first()
        if membership:
            return Response({'role': membership.role})
        return Response({'role': None})


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
    filterset_fields = ['status', 'executor', 'author', 'team']
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

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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
        """Обновление статуса у задачи."""
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
        """Оценка задачи.."""
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
        """Получение всех оценок задач, где пользователь исполнитель."""
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
    """Вьюсет для работы с комментариями."""
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post']
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommentTaskCreateSerializers
        return CommentTaskReadSerializers

    def get_queryset(self) -> QuerySet[Comment]:
        task = get_object_or_404(
            Task.objects.filter(
                id=self.kwargs['task_pk'],
                team__participants=self.request.user
            )
        )
        return task.comments.select_related('author').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class MeetingViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingSerializers
    permission_classes = [IsManagerOrAdmin]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_class = MeetingFilter

    def get_queryset(self):
        """Доступные встречи для текущего пользователя."""
        user = self.request.user
        team_id = self.request.query_params.get("team")
        queryset = Meeting.objects.filter(
            Q(participants=user) | Q(author=user)
        ).distinct()
        if team_id:
            queryset = queryset.filter(
                Q(author__teams=team_id) | Q(participants__teams=team_id)
            ).distinct()
        return queryset.select_related(
            "author"
        ).prefetch_related("participants")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        team_id = self.request.query_params.get("team")
        if self.action == "create" and not team_id:
            raise ValidationError({
                "detail": "Нужно передать параметр ?team=<id> в запросе"
            })
        if team_id:
            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                raise NotFound("Команда не найдена")
            if not team.participants.filter(id=self.request.user.id).exists():
                raise PermissionDenied("Вы не состоите в этой команде")
            context["team"] = team
        return context

    def perform_create(self, serializer):
        """При создании автоматически подставляем организатора и команду."""
        serializer.save(
            author=self.request.user,
            team=self.get_serializer_context()["team"]
        )

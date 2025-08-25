from django.urls import include, path
from rest_framework import routers

from api.views import (
    CommentViewSet,
    UserViewSet,
    TeamViewSet,
    TaskViewSet,
    MeetingViewSet
)


router = routers.DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'teams', TeamViewSet, basename='teams')
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'meetings', MeetingViewSet, basename='meetings')
comment_urls = [
    path(
        'tasks/<int:task_pk>/comments/',
        CommentViewSet.as_view({
            'get': 'list', 
            'post': 'create'
        }),
        name='task-comments'
    ),
    path(
        'tasks/<int:task_pk>/comments/<int:pk>/',
        CommentViewSet.as_view({
            'get': 'retrieve', 
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='task-comment-detail'
    ),
]

urlpatterns = [
    path('', include(router.urls)),
    path('', include('djoser.urls')),
    path('auth/', include('djoser.urls.authtoken')),
    path('', include(comment_urls)),
]
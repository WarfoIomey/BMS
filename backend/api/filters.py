import django_filters
from teamflow.models import Meeting

class MeetingFilter(django_filters.FilterSet):
    team = django_filters.NumberFilter(field_name='team__id')
    
    class Meta:
        model = Meeting
        fields = ['team', 'date']
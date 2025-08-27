from teamflow.models import Membership


def get_membership(user, team):
    """Возвращает membership пользователя в команде (или None)."""
    if not user.is_authenticated:
        return None
    return Membership.objects.filter(user=user, team=team).first()

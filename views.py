from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import (
    csrf_exempt,
    ensure_csrf_cookie,
    requires_csrf_token,
)
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin

decorators = [csrf_exempt, ensure_csrf_cookie]


class AppView(LoginRequiredMixin, TemplateView):
    template_name = "pages/todospa.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        token = self.request.headers["cookie"].split(";")[0].split("=")[1]
        context["cookie"] = token
        return context

    def get_login_url(self):
        """disallow attempt to access app directly from this view"""
        from django.core.exceptions import PermissionDenied

        raise PermissionDenied


app_view = AppView.as_view()

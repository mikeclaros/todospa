from django.urls import path
from django.urls import include
from .views import app_view

app_name = "todospa"
urlpatterns = [
    path("", app_view, name="todospa"),
]

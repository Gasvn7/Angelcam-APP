# app/urls.py
from django.urls import path
from .views import login
from .views import cameras
from .views import recordings

urlpatterns = [
    path("login/", login),
    path("cameras/", cameras),
    path("recordings/", recordings),
]

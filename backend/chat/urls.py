from django.urls import path
from .views import chat_page, ChatAPIView

urlpatterns = [
    path("", chat_page, name="chat-page"),
    path("api/chat/", ChatAPIView, name="chat-api"),
]

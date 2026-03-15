from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.rag.service import answer_question
import json


def chat_page(request):
    return render(request, "chat.html")


@csrf_exempt   # 🔥 disable CSRF just for this API (OK for local dev)
def ChatAPIView(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        question = data.get("question", "").strip()
        if not question:
            return JsonResponse({"error": "No question provided"}, status=400)

        try:
            result = answer_question(question)
            return JsonResponse(result, status=200)
        except Exception as e:
            print("RAG ERROR:", str(e))
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)

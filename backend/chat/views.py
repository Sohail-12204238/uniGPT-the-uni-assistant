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

        result = answer_question(question)
        # result already contains answer, pdf_sources, web_sources, from_web
        return JsonResponse(result, status=200)

    return JsonResponse({"error": "Invalid request method"}, status=405)

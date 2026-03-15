import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "university_policies")

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

PDF_DIR = Path(os.getenv("PDF_DIR", BASE_DIR / "data" / "documents"))

EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"

FALLBACK_PHRASE = "I'm sorry, I could not find that information in the university guidelines."

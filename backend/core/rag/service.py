import os

from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from tavily import TavilyClient

from .config import FALLBACK_PHRASE
from .retrieval import get_retriever

# ---------------------------------------------------
# Config: read API keys (with hardcoded fallback for local dev)
# ---------------------------------------------------

COHERE_API_KEY = (
    os.getenv("COHERE_API_KEY")
    or os.getenv("CO_API_KEY")
    or "pIfir1tTGbCveO0vBDR5oeg4BwawfjfiHFiyEgt8"
)

TAVILY_API_KEY = (
    os.getenv("TAVILY_API_KEY")
    or "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"     # 👈 put your real Tavily key here
)

# ---------------------------------------------------
# Prompt template (safe to keep at module level)
# ---------------------------------------------------

prompt = ChatPromptTemplate.from_template(
    """You are an assistant that answers students' questions about university details, rules, and guidelines.
Always use the provided context to answer.
If the answer is found in the context, give a clean, concise, and clear response in 3–5 sentences.
Do not add information outside the context.
If the context does not contain the answer, say:
"I'm sorry, I could not find that information in the university guidelines."

Answer the following question based only on the provided context:

<context>
{context}
</context>

Question: {input}"""
)

# ---------------------------------------------------
# Lazy singletons
# ---------------------------------------------------

_llm = None
_tavily_client = None


def get_llm():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    return ChatGroq(
        groq_api_key=api_key,
        model_name="llama-3.1-8b-instant",   # best balance for RAG
        temperature=0.3,
        max_tokens=500,
    )



def get_tavily_client():
    global _tavily_client
    if _tavily_client is not None:
        return _tavily_client

    if not TAVILY_API_KEY:
        return None  # web search disabled

    _tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
    return _tavily_client


def web_search_fallback(question: str):
    """
    Use Tavily to search the web when PDFs don't have the answer.
    If Tavily is not configured, returns a friendly message and no sources.
    """
    client = get_tavily_client()
    if client is None:
        return "Web search is not configured (no Tavily API key set).", []

    try:
        resp = client.search(
            query=question,
            search_depth="basic",
            max_results=5,
            include_answer=True,
            include_raw_content=False,
            include_images=False,
        )
    except Exception as e:
        # Avoid crashing the whole app if Tavily has an issue
        return f"Web search error: {e}", []

    answer = resp.get("answer", "I couldn't find a clear answer on the web.")
    sources = [
        item.get("url")
        for item in resp.get("results", [])
        if isinstance(item, dict) and item.get("url")
    ]
    return answer, sources


# ---------------------------------------------------
# Main RAG entrypoint
# ---------------------------------------------------

def answer_question(question: str) -> dict:
    """
    Answer a question using:
      1) University PDFs via Qdrant retriever
      2) Tavily web fallback if needed
    """
    retriever = get_retriever()
    docs = retriever.invoke(question)

    context = "\n\n".join(d.page_content for d in docs) if docs else ""

    pdf_sources: list[str] = []
    for d in docs:
        src = d.metadata.get("source", "unknown file")
        page = d.metadata.get("page", "?")
        pdf_sources.append(f"{src} (page {page})")

    llm = get_llm()
    formatted = prompt.invoke({"context": context, "input": question})
    result = llm.invoke(formatted)
    answer = result.content

    from_web = False
    web_sources: list[str] = []

    # Force Tavily if:
    # - no docs from Qdrant, OR
    # - model says "not in guidelines"
    if not docs or (FALLBACK_PHRASE and FALLBACK_PHRASE in answer):
        from_web = True
        web_answer, web_sources = web_search_fallback(question)
        answer = f"{web_answer}\n\n(Note: This answer is from web search, not university PDFs.)"

    return {
        "answer": answer,
        "pdf_sources": pdf_sources,
        "web_sources": web_sources,
        "from_web": from_web,
    }

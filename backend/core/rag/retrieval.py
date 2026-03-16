from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langchain_core.embeddings import Embeddings

from .config import QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION


class DummyEmbeddings(Embeddings):
    """
    We don't generate embeddings here.
    Qdrant already stores vectors.
    """

    def embed_documents(self, texts):
        raise NotImplementedError("Document embedding not supported")

    def embed_query(self, text):
        raise NotImplementedError("Query embedding handled by external system")


_vector_store = None
_retriever = None


def get_retriever():
    global _retriever, _vector_store

    if _retriever is not None:
        return _retriever

    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        prefer_grpc=False,
    )

    _vector_store = QdrantVectorStore(
        client=client,
        collection_name=QDRANT_COLLECTION,
        embedding=DummyEmbeddings(),   # 👈 lightweight
    )

    _retriever = _vector_store.as_retriever(
        search_kwargs={"k": 4}
    )

    return _retriever
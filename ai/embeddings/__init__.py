"""
Embeddings module for Orbital Sentinel
Handles document embedding generation using Ollama with Granite model
"""
from .ollama_client import OllamaEmbeddingClient
from .document_processor import DocumentProcessor

__all__ = ['OllamaEmbeddingClient', 'DocumentProcessor']

# Made with Bob

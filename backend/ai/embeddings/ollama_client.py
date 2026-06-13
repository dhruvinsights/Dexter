"""
Ollama Embedding Client
Generates vector embeddings using Ollama with Granite embedding model
"""
import os
import logging
from typing import List, Optional
import ollama
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OllamaEmbeddingClient:
    """Client for generating embeddings using Ollama"""
    
    def __init__(self):
        """Initialize Ollama client with configuration from environment"""
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.embedding_model = os.getenv('OLLAMA_EMBEDDING_MODEL', 'granite-embedding')
        self.timeout = int(os.getenv('OLLAMA_TIMEOUT', '120'))
        
        # Initialize client
        self.client = ollama.Client(host=self.base_url)
        
        logger.info(f"Ollama embedding client initialized")
        logger.info(f"  Base URL: {self.base_url}")
        logger.info(f"  Model: {self.embedding_model}")
    
    async def health_check(self) -> bool:
        """
        Check if Ollama service is available
        
        Returns:
            True if service is healthy
        """
        try:
            # Try to list models
            models = self.client.list()
            logger.info(f"✓ Ollama service is healthy ({len(models.get('models', []))} models available)")
            return True
        except Exception as e:
            logger.error(f"✗ Ollama health check failed: {e}")
            return False
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            List of embedding values
        """
        try:
            response = self.client.embeddings(
                model=self.embedding_model,
                prompt=text
            )
            return response['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def embed_batch(self, texts: List[str], batch_size: int = 10) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process at once
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
            
            for text in batch:
                try:
                    embedding = self.embed_text(text)
                    embeddings.append(embedding)
                except Exception as e:
                    logger.error(f"Error in batch processing: {e}")
                    # Append None for failed embeddings
                    embeddings.append(None)
        
        return embeddings
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embeddings produced by the model
        
        Returns:
            Embedding dimension
        """
        try:
            # Generate a test embedding to determine dimension
            test_embedding = self.embed_text("test")
            return len(test_embedding)
        except Exception as e:
            logger.error(f"Error determining embedding dimension: {e}")
            # Default for Granite embedding model
            return 768
    
    def check_model_availability(self) -> bool:
        """
        Check if the configured embedding model is available
        
        Returns:
            True if model is available
        """
        try:
            models = self.client.list()
            model_names = [m['name'] for m in models.get('models', [])]
            
            if self.embedding_model in model_names:
                logger.info(f"✓ Model {self.embedding_model} is available")
                return True
            else:
                logger.warning(f"⚠ Model {self.embedding_model} not found")
                logger.info(f"Available models: {', '.join(model_names)}")
                return False
        except Exception as e:
            logger.error(f"Error checking model availability: {e}")
            return False


# Singleton instance
_embedding_client: Optional[OllamaEmbeddingClient] = None


def get_embedding_client() -> OllamaEmbeddingClient:
    """
    Get singleton embedding client instance
    
    Returns:
        OllamaEmbeddingClient instance
    """
    global _embedding_client
    
    if _embedding_client is None:
        _embedding_client = OllamaEmbeddingClient()
    
    return _embedding_client


if __name__ == "__main__":
    """Test embedding client"""
    print("=" * 80)
    print("OLLAMA EMBEDDING CLIENT TEST")
    print("=" * 80)
    
    try:
        client = OllamaEmbeddingClient()
        
        # Health check
        import asyncio
        if asyncio.run(client.health_check()):
            print("✓ Health check passed")
        
        # Check model availability
        if client.check_model_availability():
            print("✓ Model is available")
            
            # Test embedding
            print("\nGenerating test embedding...")
            test_text = "Orbital debris poses a significant threat to space sustainability"
            embedding = client.embed_text(test_text)
            
            print(f"✓ Generated embedding with dimension: {len(embedding)}")
            print(f"  First 5 values: {embedding[:5]}")
        else:
            print("✗ Model not available")
            print("\nTo use embeddings, ensure Ollama is running and the model is pulled:")
            print(f"  ollama pull {client.embedding_model}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("=" * 80)

# Made with Bob

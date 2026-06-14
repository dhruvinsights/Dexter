"""
Ollama LLM Client
"""
import logging
from typing import AsyncGenerator, Optional

logger = logging.getLogger(__name__)


class OllamaLLMClient:
    """Client for Ollama local LLM"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.1",
        temperature: float = 0.3,
        max_tokens: int = 1024,
        top_p: float = 0.9
    ):
        """
        Initialize Ollama client
        
        Args:
            base_url: Ollama server URL
            model: Model name
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
        """
        try:
            import ollama
            self.ollama = ollama
        except ImportError:
            raise ImportError("Ollama package not installed. Install with: pip install ollama")
        
        self.base_url = base_url
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        
        # Configure client
        self.client = ollama.Client(host=base_url)
        
        logger.info(f"✓ Ollama client initialized: model={model}, url={base_url}")
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate a response from Ollama
        
        Args:
            prompt: The prompt to send
            system_prompt: Optional system prompt
            
        Returns:
            Generated text response
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                    "top_p": self.top_p
                }
            )
            return response['message']['content']
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
    
    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream a response from Ollama
        
        Args:
            prompt: The prompt to send
            system_prompt: Optional system prompt
            
        Yields:
            Chunks of generated text
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            stream = self.client.chat(
                model=self.model,
                messages=messages,
                stream=True,
                options={
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                    "top_p": self.top_p
                }
            )
            
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield chunk['message']['content']
                    
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            raise
    
    async def health_check(self) -> bool:
        """
        Check if Ollama service is accessible
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            models = self.client.list()
            logger.info(f"✓ Ollama healthy ({len(models.get('models', []))} models available)")
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def check_model_availability(self) -> bool:
        """
        Check if the configured model is available
        
        Returns:
            True if model is available, False otherwise
        """
        try:
            models = self.client.list()
            model_names = [m['name'] for m in models.get('models', [])]
            available = self.model in model_names
            if available:
                logger.info(f"✓ Model {self.model} is available")
            else:
                logger.warning(f"✗ Model {self.model} not found. Available: {model_names}")
            return available
        except Exception as e:
            logger.error(f"Model availability check failed: {e}")
            return False

# Made with Bob

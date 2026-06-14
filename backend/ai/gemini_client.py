"""
Gemini LLM Client using Google's native SDK
"""
import logging
from typing import AsyncGenerator, Optional
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

logger = logging.getLogger(__name__)


class GeminiLLMClient:
    """Client for Google's Gemini API using native SDK"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        temperature: float = 0.3,
        max_tokens: int = 1024
    ):
        """
        Initialize Gemini client
        
        Args:
            api_key: Google API key
            model: Model name (e.g., "gemini-1.5-flash", "gemini-1.5-pro")
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
        """
        self.api_key = api_key
        self.model_name = model
        self.model = model  # Store as string for compatibility
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Configure the SDK
        genai.configure(api_key=api_key)
        
        # Initialize the generative model
        self._gen_model = genai.GenerativeModel(
            model_name=model,
            generation_config=GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
        )
        
        logger.info(f"✓ Gemini client initialized: model={model}")
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate a response from Gemini
        
        Args:
            prompt: The prompt to send
            system_prompt: Optional system prompt (not used by Gemini)
            
        Returns:
            Generated text response
        """
        try:
            response = await self._gen_model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
    
    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream a response from Gemini
        
        Args:
            prompt: The prompt to send
            system_prompt: Optional system prompt (not used by Gemini)
            
        Yields:
            Chunks of generated text
        """
        try:
            response = await self._gen_model.generate_content_async(
                prompt,
                stream=True
            )
            
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            raise
    
    async def health_check(self) -> bool:
        """
        Check if the Gemini API is accessible
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            # Try to list models to verify API key works
            models = genai.list_models()
            model_names = [m.name for m in models]
            logger.info(f"✓ Gemini API healthy ({len(model_names)} models available)")
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

# Made with Bob

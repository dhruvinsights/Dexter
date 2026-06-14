"""
OpenAI-Compatible LLM Client
Supports OpenAI, Gemini (via OpenAI-compatible API), and custom endpoints
"""
import logging
from typing import Optional, AsyncGenerator
from openai import AsyncOpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OpenAICompatibleClient:
    """Client for OpenAI and OpenAI-compatible APIs (including Gemini)"""
    
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        top_p: float = 0.9
    ):
        """
        Initialize OpenAI-compatible client
        
        Args:
            api_key: API key for authentication
            model: Model name (e.g., 'gpt-4o-mini', 'gemini-1.5-flash-latest')
            base_url: Custom base URL (for Gemini or other providers)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
        """
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        
        # Initialize AsyncOpenAI client
        client_kwargs = {'api_key': api_key}
        if base_url:
            client_kwargs['base_url'] = base_url
        
        self.client = AsyncOpenAI(**client_kwargs)
        logger.info(f"Initialized OpenAI-compatible client: model={model}, base_url={base_url or 'default'}")
    
    async def health_check(self) -> bool:
        """Check if the API is accessible"""
        try:
            # Try to list models as a health check
            await self.client.models.list()
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def check_model_availability(self) -> bool:
        """Check if model is available (always True for API-based models)"""
        return True
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text completion
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Returns:
            Generated text
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                top_p=self.top_p
            )
            
            return response.choices[0].message.content or ""
        
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
    
    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream text generation token by token
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Yields:
            Generated tokens
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                top_p=self.top_p,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            raise


if __name__ == "__main__":
    """Test OpenAI-compatible client"""
    import asyncio
    import os
    
    async def test():
        # Test with Gemini
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            print("Set GEMINI_API_KEY to test")
            return
        
        client = OpenAICompatibleClient(
            api_key=api_key,
            model="gemini-1.5-flash-latest",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        
        print("Testing health check...")
        if await client.health_check():
            print("✓ Health check passed")
        
        print("\nTesting generation...")
        response = await client.generate("What is orbital debris?")
        print(f"Response: {response}")
        
        print("\nTesting streaming...")
        print("Response: ", end="", flush=True)
        async for token in client.stream("Explain satellites in one sentence."):
            print(token, end="", flush=True)
        print()
    
    asyncio.run(test())

# Made with Bob

"""
Universal LLM Client for Orbital Sentinel
Supports Ollama, OpenAI, Gemini, and custom providers with runtime reconfiguration
"""
import logging
from typing import Optional, AsyncGenerator
from .runtime_config import get_runtime_config, AIProviderConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UniversalLLMClient:
    """Universal client that supports multiple LLM providers with runtime reconfiguration"""
    
    def __init__(self):
        """Initialize LLM client based on runtime configuration"""
        self._client = None
        self._current_config = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize or reinitialize the client based on current configuration"""
        config = get_runtime_config().get_config()
        
        # Skip reinitialization if config hasn't changed
        if self._current_config == config:
            return
        
        self._current_config = config
        provider = config.provider.lower()
        
        logger.info(f"Initializing LLM client with provider: {provider}")
        
        try:
            if provider == 'ollama':
                self._init_ollama(config)
            elif provider == 'openai':
                self._init_openai(config)
            elif provider == 'gemini':
                self._init_gemini(config)
            elif provider == 'custom':
                self._init_custom(config)
            else:
                raise ValueError(f"Unsupported AI provider: {provider}")
            
            logger.info(f"✓ LLM client initialized successfully with {provider}")
        except Exception as e:
            logger.error(f"Failed to initialize {provider} client: {e}")
            raise
    
    def _init_ollama(self, config: AIProviderConfig):
        """Initialize Ollama client"""
        try:
            from .ollama_client import OllamaLLMClient
            self._client = OllamaLLMClient(
                base_url=config.ollama_url or "http://localhost:11434",
                model=config.ollama_model or "llama3.1",
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p
            )
        except ImportError:
            logger.error("Ollama not installed. Install with: pip install ollama")
            raise
    
    def _init_openai(self, config: AIProviderConfig):
        """Initialize OpenAI client"""
        if not config.openai_api_key:
            raise ValueError("OpenAI API key is required")
        
        from .openai_client import OpenAICompatibleClient
        self._client = OpenAICompatibleClient(
            api_key=config.openai_api_key,
            model=config.openai_model or "gpt-4o-mini",
            base_url=config.openai_base_url,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            top_p=config.top_p
        )
    
    def _init_gemini(self, config: AIProviderConfig):
        """Initialize Gemini client (uses native Google SDK)"""
        if not config.gemini_api_key:
            raise ValueError("Gemini API key is required")
        
        from .gemini_client import GeminiLLMClient
        self._client = GeminiLLMClient(
            api_key=config.gemini_api_key,
            model=config.gemini_model or "gemini-1.5-flash",
            temperature=config.temperature,
            max_tokens=config.max_tokens
        )
    
    def _init_custom(self, config: AIProviderConfig):
        """Initialize custom OpenAI-compatible endpoint"""
        if not config.openai_api_key:
            raise ValueError("API key is required for custom endpoint")
        if not config.openai_base_url:
            raise ValueError("Base URL is required for custom endpoint")
        
        from .openai_client import OpenAICompatibleClient
        self._client = OpenAICompatibleClient(
            api_key=config.openai_api_key,
            model=config.openai_model or "default",
            base_url=config.openai_base_url,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            top_p=config.top_p
        )
    
    def reconfigure(self, config: AIProviderConfig):
        """
        Reconfigure the client with new settings
        
        Args:
            config: New AI provider configuration
        """
        logger.info(f"Reconfiguring LLM client to provider: {config.provider}")
        get_runtime_config().update_config(config)
        self._current_config = None  # Force reinitialization
        self._initialize_client()
    
    @property
    def model(self) -> str:
        """Get the model name from the underlying client"""
        self._initialize_client()  # Ensure client is initialized
        return getattr(self._client, 'model', 'unknown')
    
    @property
    def provider(self) -> str:
        """Get the current provider name"""
        return get_runtime_config().get_config().provider
    
    async def health_check(self) -> bool:
        """Check if LLM service is available"""
        try:
            self._initialize_client()
            return await self._client.health_check()
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def check_model_availability(self) -> bool:
        """Check if the configured model is available"""
        try:
            self._initialize_client()
            return self._client.check_model_availability()
        except Exception as e:
            logger.error(f"Model availability check failed: {e}")
            return False
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text completion for a prompt"""
        self._initialize_client()
        return await self._client.generate(prompt, system_prompt)
    
    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        """Stream text generation token by token"""
        self._initialize_client()
        async for token in self._client.stream(prompt, system_prompt):
            yield token


# Singleton instance
_llm_client: Optional[UniversalLLMClient] = None


def get_llm_client() -> UniversalLLMClient:
    """
    Get singleton LLM client instance
    
    Returns:
        UniversalLLMClient instance
    """
    global _llm_client
    
    if _llm_client is None:
        _llm_client = UniversalLLMClient()
    
    return _llm_client


def reset_llm_client():
    """Reset the singleton client (useful for testing or reconfiguration)"""
    global _llm_client
    _llm_client = None


if __name__ == "__main__":
    """Test LLM client"""
    import asyncio
    
    print("=" * 80)
    print("UNIVERSAL LLM CLIENT TEST")
    print("=" * 80)
    
    async def test():
        try:
            client = UniversalLLMClient()
            
            # Health check
            if await client.health_check():
                print(f"✓ Health check passed (provider: {client.provider})")
            
            # Check model availability
            if client.check_model_availability():
                print(f"✓ Model is available: {client.model}")
                
                # Test generation
                print("\nGenerating test response...")
                prompt = "Explain orbital debris in one sentence."
                response = await client.generate(prompt)
                
                print(f"\nPrompt: {prompt}")
                print(f"Response: {response}")
                
                # Test streaming
                print("\nTesting streaming...")
                print("Response: ", end="", flush=True)
                async for token in client.stream(prompt):
                    print(token, end="", flush=True)
                print()
                
            else:
                print("✗ Model not available")
            
        except Exception as e:
            print(f"✗ Error: {e}")
            import traceback
            traceback.print_exc()
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob

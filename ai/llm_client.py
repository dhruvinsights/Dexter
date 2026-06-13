"""
Ollama LLM Client for Orbital Sentinel
Provides text generation using Ollama with Granite model
"""
import os
import logging
from typing import Optional, AsyncGenerator
import ollama
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OllamaLLMClient:
    """Client for LLM text generation using Ollama"""
    
    def __init__(self):
        """Initialize Ollama LLM client with configuration from environment"""
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = os.getenv('OLLAMA_MODEL', 'granite-code:8b')
        self.temperature = float(os.getenv('AI_TEMPERATURE', '0.3'))
        self.max_tokens = int(os.getenv('AI_MAX_TOKENS', '1024'))
        self.top_p = float(os.getenv('AI_TOP_P', '0.9'))
        self.timeout = int(os.getenv('OLLAMA_TIMEOUT', '120'))
        
        # Initialize client
        self.client = ollama.Client(host=self.base_url)
        
        logger.info(f"Ollama LLM client initialized")
        logger.info(f"  Base URL: {self.base_url}")
        logger.info(f"  Model: {self.model}")
        logger.info(f"  Temperature: {self.temperature}")
        logger.info(f"  Max tokens: {self.max_tokens}")
    
    async def health_check(self) -> bool:
        """
        Check if Ollama service is available
        
        Returns:
            True if service is healthy
        """
        try:
            models = self.client.list()
            logger.info(f"✓ Ollama service is healthy ({len(models.get('models', []))} models available)")
            return True
        except Exception as e:
            logger.error(f"✗ Ollama health check failed: {e}")
            return False
    
    def check_model_availability(self) -> bool:
        """
        Check if the configured model is available
        
        Returns:
            True if model is available
        """
        try:
            models = self.client.list()
            model_names = [m['name'] for m in models.get('models', [])]
            
            if self.model in model_names:
                logger.info(f"✓ Model {self.model} is available")
                return True
            else:
                logger.warning(f"⚠ Model {self.model} not found")
                logger.info(f"Available models: {', '.join(model_names)}")
                return False
        except Exception as e:
            logger.error(f"Error checking model availability: {e}")
            return False
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text completion for a prompt
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt to set context
            
        Returns:
            Generated text
        """
        try:
            messages = []
            
            if system_prompt:
                messages.append({
                    'role': 'system',
                    'content': system_prompt
                })
            
            messages.append({
                'role': 'user',
                'content': prompt
            })
            
            response = self.client.chat(
                model=self.model,
                messages=messages,
                options={
                    'temperature': self.temperature,
                    'num_predict': self.max_tokens,
                    'top_p': self.top_p,
                }
            )
            
            return response['message']['content']
            
        except Exception as e:
            logger.error(f"Error generating text: {e}")
            raise
    
    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream text generation token by token
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            
        Yields:
            Generated text tokens
        """
        try:
            messages = []
            
            if system_prompt:
                messages.append({
                    'role': 'system',
                    'content': system_prompt
                })
            
            messages.append({
                'role': 'user',
                'content': prompt
            })
            
            stream = self.client.chat(
                model=self.model,
                messages=messages,
                stream=True,
                options={
                    'temperature': self.temperature,
                    'num_predict': self.max_tokens,
                    'top_p': self.top_p,
                }
            )
            
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield chunk['message']['content']
                    
        except Exception as e:
            logger.error(f"Error streaming text: {e}")
            raise
    
    def pull_model(self) -> bool:
        """
        Pull the configured model if not available
        
        Returns:
            True if model is now available
        """
        try:
            logger.info(f"Pulling model {self.model}...")
            self.client.pull(self.model)
            logger.info(f"✓ Model {self.model} pulled successfully")
            return True
        except Exception as e:
            logger.error(f"Error pulling model: {e}")
            return False


# Singleton instance
_llm_client: Optional[OllamaLLMClient] = None


def get_llm_client() -> OllamaLLMClient:
    """
    Get singleton LLM client instance
    
    Returns:
        OllamaLLMClient instance
    """
    global _llm_client
    
    if _llm_client is None:
        _llm_client = OllamaLLMClient()
    
    return _llm_client


if __name__ == "__main__":
    """Test LLM client"""
    import asyncio
    
    print("=" * 80)
    print("OLLAMA LLM CLIENT TEST")
    print("=" * 80)
    
    async def test():
        try:
            client = OllamaLLMClient()
            
            # Health check
            if await client.health_check():
                print("✓ Health check passed")
            
            # Check model availability
            if client.check_model_availability():
                print("✓ Model is available")
                
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
                print(f"\nTo use the LLM, ensure Ollama is running and pull the model:")
                print(f"  ollama pull {client.model}")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob

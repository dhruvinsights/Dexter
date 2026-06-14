"""
Runtime Configuration Manager for AI Providers
Allows dynamic switching between Ollama, OpenAI, Gemini, and custom providers
"""
import os
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIProviderConfig(BaseModel):
    """Configuration for AI provider"""
    provider: str = Field(..., description="Provider type: ollama, openai, gemini, custom")
    
    # Ollama settings
    ollama_url: Optional[str] = Field(None, description="Ollama endpoint URL")
    ollama_model: Optional[str] = Field(None, description="Ollama model name")
    
    # OpenAI settings
    openai_api_key: Optional[str] = Field(None, description="OpenAI API key")
    openai_model: Optional[str] = Field(None, description="OpenAI model name")
    openai_base_url: Optional[str] = Field(None, description="Custom OpenAI-compatible base URL")
    
    # Gemini settings (uses OpenAI-compatible client)
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini API key")
    gemini_model: Optional[str] = Field(None, description="Gemini model name")
    
    # Generation parameters
    temperature: float = Field(0.3, ge=0.0, le=2.0)
    max_tokens: int = Field(1024, ge=1, le=8192)
    top_p: float = Field(0.9, ge=0.0, le=1.0)


class RuntimeConfigManager:
    """Manages runtime configuration for AI providers"""
    
    def __init__(self):
        self._config: Optional[AIProviderConfig] = None
        self._load_from_env()
    
    def _load_from_env(self):
        """Load initial configuration from environment variables"""
        provider = os.getenv('AI_PROVIDER', 'ollama').lower()
        
        config_dict = {
            'provider': provider,
            'ollama_url': os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434'),
            'ollama_model': os.getenv('OLLAMA_MODEL', 'llama3.1'),
            'openai_api_key': os.getenv('OPENAI_API_KEY', ''),
            'openai_model': os.getenv('OPENAI_MODEL', 'gpt-4o-mini'),
            'openai_base_url': os.getenv('OPENAI_BASE_URL'),
            'gemini_api_key': os.getenv('GEMINI_API_KEY', ''),
            'gemini_model': os.getenv('GEMINI_MODEL', 'gemini-1.5-flash-latest'),
            'temperature': float(os.getenv('AI_TEMPERATURE', '0.3')),
            'max_tokens': int(os.getenv('AI_MAX_TOKENS', '1024')),
            'top_p': float(os.getenv('AI_TOP_P', '0.9')),
        }
        
        self._config = AIProviderConfig(**config_dict)
        logger.info(f"Loaded configuration from environment: provider={provider}")
    
    def update_config(self, config: AIProviderConfig):
        """Update runtime configuration"""
        self._config = config
        logger.info(f"Updated runtime configuration: provider={config.provider}")
    
    def get_config(self) -> AIProviderConfig:
        """Get current configuration"""
        if self._config is None:
            self._load_from_env()
        return self._config
    
    def to_dict(self) -> Dict[str, Any]:
        """Export configuration as dictionary (without sensitive data)"""
        config = self.get_config()
        return {
            'provider': config.provider,
            'ollama_url': config.ollama_url,
            'ollama_model': config.ollama_model,
            'openai_model': config.openai_model,
            'openai_base_url': config.openai_base_url,
            'gemini_model': config.gemini_model,
            'temperature': config.temperature,
            'max_tokens': config.max_tokens,
            'top_p': config.top_p,
            # Don't expose API keys
            'openai_api_key_set': bool(config.openai_api_key),
            'gemini_api_key_set': bool(config.gemini_api_key),
        }


# Global singleton
_runtime_config: Optional[RuntimeConfigManager] = None


def get_runtime_config() -> RuntimeConfigManager:
    """Get singleton runtime configuration manager"""
    global _runtime_config
    if _runtime_config is None:
        _runtime_config = RuntimeConfigManager()
    return _runtime_config

# Made with Bob

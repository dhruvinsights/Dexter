"""
Configuration management for Orbital Sentinel AI
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings"""
    
    # Google Gemini Configuration
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-pro")
    
    # Ollama Configuration
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_embedding_model: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")
    
    # IBM Db2 Configuration
    db2_database: str = os.getenv("DB2_DATABASE", "ORBITAL")
    db2_hostname: str = os.getenv("DB2_HOSTNAME", "localhost")
    db2_port: int = int(os.getenv("DB2_PORT", "50000"))
    db2_uid: str = os.getenv("DB2_UID", "")
    db2_pwd: str = os.getenv("DB2_PWD", "")
    
    @property
    def db2_connection_string(self) -> str:
        """Build Db2 connection string"""
        return (
            f"DATABASE={self.db2_database};"
            f"HOSTNAME={self.db2_hostname};"
            f"PORT={self.db2_port};"
            f"UID={self.db2_uid};"
            f"PWD={self.db2_pwd};"
        )
    
    # Model Configuration
    llm_provider: str = os.getenv("LLM_PROVIDER", "gemini")
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "ollama")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "768"))
    
    # API Configuration
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    api_reload: bool = os.getenv("API_RELOAD", "true").lower() == "true"
    
    # Data Sources
    celestrak_base_url: str = os.getenv(
        "CELESTRAK_BASE_URL", 
        "https://celestrak.org/NORAD/elements/gp.php"
    )
    space_track_username: Optional[str] = os.getenv("SPACE_TRACK_USERNAME")
    space_track_password: Optional[str] = os.getenv("SPACE_TRACK_PASSWORD")
    
    # Agent Configuration
    max_iterations: int = int(os.getenv("MAX_ITERATIONS", "10"))
    agent_verbose: bool = os.getenv("AGENT_VERBOSE", "true").lower() == "true"
    top_k_retrieval: int = int(os.getenv("TOP_K_RETRIEVAL", "5"))
    similarity_threshold: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.7"))
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "orbital_sentinel.log")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings

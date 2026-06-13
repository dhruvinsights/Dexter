"""
Document Processor
Handles document loading, chunking, and embedding generation for RAG
"""
import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import hashlib
from datetime import datetime

# Document processing libraries
from pypdf import PdfReader
from docx import Document as DocxDocument

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.embeddings.ollama_client import get_embedding_client
from config.db2_connection import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Process documents for embedding and storage"""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize document processor
        
        Args:
            chunk_size: Target size for text chunks (in characters)
            chunk_overlap: Overlap between chunks (in characters)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embedding_client = get_embedding_client()
        self.db = None
        
        logger.info(f"Document processor initialized (chunk_size={chunk_size}, overlap={chunk_overlap})")
    
    def load_pdf(self, filepath: str) -> str:
        """
        Load text from PDF file
        
        Args:
            filepath: Path to PDF file
            
        Returns:
            Extracted text content
        """
        try:
            reader = PdfReader(filepath)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error loading PDF {filepath}: {e}")
            raise
    
    def load_docx(self, filepath: str) -> str:
        """
        Load text from DOCX file
        
        Args:
            filepath: Path to DOCX file
            
        Returns:
            Extracted text content
        """
        try:
            doc = DocxDocument(filepath)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            logger.error(f"Error loading DOCX {filepath}: {e}")
            raise
    
    def load_txt(self, filepath: str) -> str:
        """
        Load text from TXT file
        
        Args:
            filepath: Path to TXT file
            
        Returns:
            File content
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Error loading TXT {filepath}: {e}")
            raise
    
    def load_document(self, filepath: str) -> str:
        """
        Load document based on file extension
        
        Args:
            filepath: Path to document
            
        Returns:
            Extracted text content
        """
        ext = Path(filepath).suffix.lower()
        
        if ext == '.pdf':
            return self.load_pdf(filepath)
        elif ext == '.docx':
            return self.load_docx(filepath)
        elif ext == '.txt':
            return self.load_txt(filepath)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            
        Returns:
            List of text chunks
        """
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings
                for punct in ['. ', '.\n', '! ', '?\n']:
                    last_punct = text[start:end].rfind(punct)
                    if last_punct > self.chunk_size // 2:
                        end = start + last_punct + len(punct)
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = end - self.chunk_overlap
        
        return chunks
    
    def generate_doc_id(self, title: str, source: str) -> str:
        """
        Generate unique document ID
        
        Args:
            title: Document title
            source: Document source
            
        Returns:
            Unique document ID
        """
        content = f"{title}_{source}_{datetime.utcnow().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def store_document(self, doc_id: str, title: str, source: str, 
                      content: str, document_type: str, file_path: str) -> bool:
        """
        Store document in database
        
        Args:
            doc_id: Unique document ID
            title: Document title
            source: Document source
            content: Full document content
            document_type: Type of document
            file_path: Path to original file
            
        Returns:
            True if successful
        """
        try:
            if self.db is None:
                self.db = get_db_connection()
            
            query = """
                INSERT INTO policy_documents 
                (doc_id, title, source, document_type, content, file_path, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """
            
            self.db.execute_update(query, (doc_id, title, source, document_type, content, file_path))
            logger.info(f"✓ Stored document: {doc_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing document: {e}")
            return False
    
    def store_embeddings(self, doc_id: str, chunks: List[str], 
                        embeddings: List[List[float]]) -> int:
        """
        Store document embeddings in database
        
        Args:
            doc_id: Document ID
            chunks: List of text chunks
            embeddings: List of embedding vectors
            
        Returns:
            Number of embeddings stored
        """
        try:
            if self.db is None:
                self.db = get_db_connection()
            
            embedding_dim = len(embeddings[0]) if embeddings else 768
            model_name = self.embedding_client.embedding_model
            
            stored_count = 0
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                if embedding is None:
                    logger.warning(f"Skipping chunk {i} (embedding failed)")
                    continue
                
                # Convert embedding to bytes for BLOB storage
                import struct
                embedding_bytes = struct.pack(f'{len(embedding)}f', *embedding)
                
                query = """
                    INSERT INTO document_embeddings 
                    (doc_id, chunk_text, chunk_index, embedding_model, 
                     embedding_dimension, embedding, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """
                
                self.db.execute_update(
                    query, 
                    (doc_id, chunk, i, model_name, embedding_dim, embedding_bytes)
                )
                stored_count += 1
            
            logger.info(f"✓ Stored {stored_count} embeddings for document {doc_id}")
            return stored_count
            
        except Exception as e:
            logger.error(f"Error storing embeddings: {e}")
            return 0
    
    def process_document(self, filepath: str, title: str, source: str, 
                        document_type: str = "policy") -> Tuple[str, int]:
        """
        Complete document processing pipeline
        
        Args:
            filepath: Path to document file
            title: Document title
            source: Document source
            document_type: Type of document
            
        Returns:
            Tuple of (doc_id, number of chunks processed)
        """
        logger.info(f"Processing document: {title}")
        
        # Load document
        logger.info("  Loading document...")
        content = self.load_document(filepath)
        logger.info(f"  ✓ Loaded {len(content)} characters")
        
        # Generate document ID
        doc_id = self.generate_doc_id(title, source)
        
        # Store document
        logger.info("  Storing document...")
        if not self.store_document(doc_id, title, source, content, document_type, filepath):
            raise RuntimeError("Failed to store document")
        
        # Chunk text
        logger.info("  Chunking text...")
        chunks = self.chunk_text(content)
        logger.info(f"  ✓ Created {len(chunks)} chunks")
        
        # Generate embeddings
        logger.info("  Generating embeddings...")
        embeddings = self.embedding_client.embed_batch(chunks)
        logger.info(f"  ✓ Generated {len(embeddings)} embeddings")
        
        # Store embeddings
        logger.info("  Storing embeddings...")
        stored_count = self.store_embeddings(doc_id, chunks, embeddings)
        
        logger.info(f"✓ Document processing complete: {doc_id} ({stored_count} chunks)")
        return doc_id, stored_count


if __name__ == "__main__":
    """Test document processor"""
    print("=" * 80)
    print("DOCUMENT PROCESSOR TEST")
    print("=" * 80)
    
    # This is a test - you would provide actual document paths
    print("\nDocument processor initialized")
    print("To process documents, use:")
    print("  processor = DocumentProcessor()")
    print("  doc_id, chunks = processor.process_document(")
    print("      filepath='path/to/document.pdf',")
    print("      title='Document Title',")
    print("      source='Source Name',")
    print("      document_type='policy'")
    print("  )")
    
    print("=" * 80)

# Made with Bob

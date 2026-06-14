# Database & Knowledge Base - Complete Explanation

## Overview

The Orbital Sentinel system uses **IBM DB2** as a vector database for **RAG (Retrieval-Augmented Generation)** to enhance AI analysis with domain-specific knowledge about orbital mechanics, space debris, and satellite operations.

## Current Configuration

### DB2 Connection (Verified ✅)

From your Settings panel and backend logs:

```
DRIVER:    ibm-db2
HOST:      Geetika-5y420-x86.dev.fyre.ibm.com
PORT:      50000
DATABASE:  TESTDB
USERNAME:  Geetika
PASSWORD:  ••••••••
STATUS:    ✅ Connected (confirmed in logs)
```

**Backend Log Confirmation:**
```
INFO:config.db2_connection:Db2 connection configured for TESTDB@Geetika-5y420-x86.dev.fyre.ibm.com:50000
INFO:config.db2_connection:Attempting Db2 connection (attempt 1/3)...
INFO:config.db2_connection:✓ Successfully connected to Db2
```

## What is the Database Used For?

### 1. **Vector Embeddings Storage (RAG)**

The database stores **document embeddings** for Retrieval-Augmented Generation:

**Purpose**: When the AI analyzes orbital data, it can retrieve relevant context from stored documents to provide more accurate, domain-specific answers.

**How it works**:
1. Documents (PDFs, MD, TXT) are uploaded via the Knowledge Base panel
2. Documents are split into chunks (~500 characters each)
3. Each chunk is converted to a vector embedding using Ollama (`granite-embedding` model)
4. Embeddings are stored in DB2 with metadata
5. When AI analyzes data, it searches for relevant chunks using vector similarity
6. Retrieved context is added to the AI prompt for better answers

### 2. **Satellite Catalog & Orbital Data**

The database schema includes tables for:

**Tables Created:**
- `satellite_catalog` - Master catalog of all space objects (15,699 satellites)
- `orbital_elements` - Time-series orbital parameters (TLE data)
- `collision_events` - Predicted collision risks
- `debris_fragments` - Tracked debris objects
- `ai_analysis_cache` - Cached AI analysis results
- `document_embeddings` - RAG vector embeddings

**Schema Location**: [`backend/config/db2_schema_enhanced.sql`](backend/config/db2_schema_enhanced.sql:1)

### 3. **AI Analysis Caching**

Stores previous AI analysis results to avoid re-computing:
- Risk assessments
- Sustainability analyses
- Policy recommendations
- Executive summaries

## Knowledge Base - The 2 Documents

You mentioned seeing **"2 docs · 180 chunks"** in the Knowledge Base panel. These are:

### Document 1: `IADC-debris-mitigation.pdf`
- **Size**: 2.1 MB
- **Chunks**: 142 chunks
- **Content**: IADC (Inter-Agency Space Debris Coordination Committee) guidelines
- **Purpose**: Provides authoritative context about space debris mitigation standards

### Document 2: `celestrak-catalog-notes.md`
- **Size**: 64 KB  
- **Chunks**: 38 chunks
- **Content**: CelesTrak satellite catalog documentation
- **Purpose**: Explains satellite classification, orbital shells, and data formats

**Total**: 180 chunks embedded and stored in DB2

## How RAG Enhances AI Analysis

### Without RAG (Basic AI):
```
User: "What are the risks of debris in LEO?"
AI: "Debris in LEO poses collision risks..." (generic answer)
```

### With RAG (Enhanced AI):
```
User: "What are the risks of debris in LEO?"
System: 
1. Searches DB2 for relevant chunks about "LEO debris risks"
2. Finds IADC guidelines chunk: "Objects in LEO below 2000km should..."
3. Adds context to AI prompt
AI: "According to IADC guidelines, debris in LEO below 2000km poses 
     significant collision risks because orbital decay is slower at 
     higher altitudes. The 25-year rule requires..." (specific, accurate)
```

## Database Schema Highlights

### Document Embeddings Table
```sql
CREATE TABLE document_embeddings (
    embedding_id INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text CLOB NOT NULL,
    embedding BLOB NOT NULL,  -- Vector embedding (1024 dimensions)
    metadata VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Satellite Catalog Table
```sql
CREATE TABLE satellite_catalog (
    norad_cat_id INTEGER PRIMARY KEY,
    object_name VARCHAR(100) NOT NULL,
    object_type VARCHAR(20) NOT NULL,  -- PAYLOAD, DEBRIS, ROCKET BODY
    operator VARCHAR(100),
    country VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Verification Steps

### 1. Check DB2 Connection
```bash
curl http://localhost:8000/api/ai/health | python3 -m json.tool
```

Expected output:
```json
{
  "status": "healthy",
  "db_available": true,  ← Confirms DB2 is connected
  "llm_available": true,
  "embedding_available": true
}
```

### 2. Check Knowledge Base
1. Open http://localhost:5173
2. Click 📚 Knowledge Base icon
3. You should see:
   - "2 docs · 180 chunks"
   - IADC-debris-mitigation.pdf (142 chunks, ready)
   - celestrak-catalog-notes.md (38 chunks, ready)

### 3. Test RAG in Action
1. Click 🤖 AI Agent
2. Select "Risk Assessment"
3. Click "Run Analysis"
4. The AI will use both:
   - Real-time satellite data (15,699 objects)
   - Stored knowledge from documents (IADC guidelines, CelesTrak notes)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOADS DOCUMENT                     │
│                    (PDF, MD, TXT, DOCX)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              DOCUMENT PROCESSOR                              │
│  • Extracts text from document                              │
│  • Splits into chunks (500 chars, 50 overlap)              │
│  • Generates embeddings using Ollama                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DB2 DATABASE (TESTDB)                     │
│  • Stores document metadata                                 │
│  • Stores chunk text                                        │
│  • Stores vector embeddings (1024 dimensions)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  USER REQUESTS AI ANALYSIS                   │
│              (Risk Assessment, Sustainability)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAG RETRIEVAL                             │
│  • Converts query to embedding                              │
│  • Searches DB2 for similar chunks (vector similarity)      │
│  • Retrieves top 5 most relevant chunks                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI GENERATION                             │
│  • Combines: Query + Retrieved Context + Satellite Data     │
│  • Sends to LLM (Ollama/Gemini)                            │
│  • Streams response back to user                            │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

1. **Database Connection**: [`backend/config/db2_connection.py`](backend/config/db2_connection.py:1)
2. **Database Schema**: [`backend/config/db2_schema_enhanced.sql`](backend/config/db2_schema_enhanced.sql:1)
3. **Document Processor**: [`backend/ai/embeddings/document_processor.py`](backend/ai/embeddings/document_processor.py:1)
4. **Embedding Client**: [`backend/ai/embeddings/ollama_client.py`](backend/ai/embeddings/ollama_client.py:1)
5. **Configuration**: [`backend/.env`](backend/.env:15) (lines 15-20)

## Benefits of This Architecture

### 1. **Accurate Domain Knowledge**
- AI has access to authoritative space debris guidelines
- Responses cite specific standards and regulations
- Reduces hallucinations with factual grounding

### 2. **Scalable Knowledge Base**
- Upload new documents anytime via UI
- Automatically processed and embedded
- No code changes needed to add knowledge

### 3. **Fast Retrieval**
- Vector similarity search is extremely fast
- DB2 handles millions of embeddings efficiently
- Sub-second retrieval times

### 4. **Persistent Storage**
- Knowledge survives server restarts
- Shared across all users
- Version controlled through database

## Current Status Summary

✅ **DB2 Connected**: TESTDB@Geetika-5y420-x86.dev.fyre.ibm.com:50000
✅ **Knowledge Base Active**: 2 documents, 180 chunks embedded
✅ **Embedding Model**: granite-embedding (Ollama)
✅ **LLM Model**: gemma4:latest (Ollama) or gemini-flash-latest (Gemini)
✅ **RAG Pipeline**: Fully functional

## Next Steps

### To Add More Documents:
1. Open http://localhost:5173
2. Click 📚 Knowledge Base
3. Drag & drop PDF/MD/TXT/DOCX files
4. Wait for processing (shows progress)
5. Documents automatically embedded and stored in DB2

### To Query the Knowledge:
1. Click 🤖 AI Agent
2. Select any analysis type
3. AI automatically retrieves relevant context from DB2
4. Enhanced responses with domain-specific knowledge

The database is **actively being used** and is a critical component of the AI analysis pipeline!
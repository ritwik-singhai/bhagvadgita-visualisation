#!/usr/bin/env python3
"""
FastAPI search endpoint for semantic verse search using OpenAI embeddings.

This updated version uses OpenAI's text-embedding-3-large model for
high-quality semantic search.
"""

import json
import os
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

app = FastAPI(title="Bhagavad Gita Search API v2")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths and config
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_visualization_v2.json")
MODEL_NAME = "text-embedding-3-large"

# Global storage
verses_data = None
embeddings_fused = None
embeddings_english = None
embeddings_sanskrit = None
openai_client = None


def load_data():
    """Load verses and embeddings from JSON."""
    global verses_data, embeddings_fused, embeddings_english, embeddings_sanskrit, openai_client
    
    # Initialize OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        openai_client = OpenAI(api_key=api_key)
        print(f"✓ OpenAI client initialized with model: {MODEL_NAME}")
    else:
        print("⚠ Warning: OPENAI_API_KEY not found. Semantic search will be limited.")
    
    # Load verse data
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    verses_data = data["verses"]
    
    # Check if we have OpenAI embeddings
    sample = verses_data[0]
    has_separate_embeddings = "embedding_fused" in sample
    
    # Extract embeddings into numpy arrays
    if has_separate_embeddings:
        fused_list = [v.get("embedding_fused") or v.get("embedding", []) for v in verses_data]
        english_list = [v.get("embedding_translation") or v.get("embedding", []) for v in verses_data]
        sanskrit_list = [v.get("embedding_sanskrit") or v.get("embedding", []) for v in verses_data]
    else:
        fused_list = [v.get("embedding", []) for v in verses_data]
        english_list = fused_list
        sanskrit_list = fused_list
    
    embeddings_fused = np.array(fused_list, dtype=np.float32)
    embeddings_english = np.array(english_list, dtype=np.float32)
    embeddings_sanskrit = np.array(sanskrit_list, dtype=np.float32)
    
    # Normalize for cosine similarity
    for arr in [embeddings_fused, embeddings_english, embeddings_sanskrit]:
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        arr /= (norms + 1e-8)
    
    print(f"✓ Loaded {len(verses_data)} verses with {embeddings_fused.shape[1]}-dim embeddings")


def get_query_embedding(query: str, use_openai: bool = True) -> np.ndarray:
    """Get embedding for a search query."""
    if not openai_client or not use_openai:
        raise HTTPException(status_code=503, detail="OpenAI client not configured")
    
    response = openai_client.embeddings.create(
        model=MODEL_NAME,
        input=[query],
    )
    embedding = np.array(response.data[0].embedding, dtype=np.float32)
    embedding /= np.linalg.norm(embedding) + 1e-8
    return embedding


def cosine_similarity(query_embedding, embeddings):
    """Compute cosine similarity between query and all embeddings."""
    return np.dot(embeddings, query_embedding)


class SearchQuery(BaseModel):
    query: str
    top_k: int = 20
    space: str = "fused"  # "fused", "english", or "sanskrit"


class SearchResult(BaseModel):
    id: str
    chapter: int
    verse: int
    sanskrit: str
    translation: str
    topic: str
    similarity: float
    space: str


@app.on_event("startup")
async def startup_event():
    """Load data on startup."""
    load_data()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "verses_loaded": len(verses_data) if verses_data else 0,
        "openai_configured": openai_client is not None,
        "model": MODEL_NAME,
        "embedding_dim": embeddings_fused.shape[1] if embeddings_fused is not None else 0,
    }


@app.post("/search")
async def search(query: SearchQuery):
    """
    Search for verses similar to the query using semantic embeddings.
    """
    if not verses_data or embeddings_fused is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    try:
        # Get embedding for query
        query_embedding = get_query_embedding(query.query)
        
        # Select embedding space
        # Auto-detect Devanagari script
        has_devanagari = any('\u0900' <= ch <= '\u097F' for ch in query.query)
        
        if query.space == "auto" or query.space == "fused":
            target_space = "sanskrit" if has_devanagari else "fused"
        else:
            target_space = query.space
        
        if target_space == "sanskrit":
            matrix = embeddings_sanskrit
        elif target_space == "english":
            matrix = embeddings_english
        else:
            matrix = embeddings_fused
        
        # Compute similarities
        similarities = cosine_similarity(query_embedding, matrix)
        
        # Get top-k results
        top_indices = np.argsort(similarities)[::-1][:query.top_k]
        
        results = []
        for idx in top_indices:
            verse = verses_data[idx]
            results.append({
                "id": verse["id"],
                "chapter": verse["chapter"],
                "verse": verse["verse"],
                "sanskrit": verse["sanskrit"],
                "translation": verse["translation"],
                "topic": verse.get("topic", "Unknown"),
                "similarity": float(similarities[idx]),
                "space": target_space,
            })
        
        return {
            "query": query.query,
            "results": results,
            "total": len(results),
            "space_used": target_space,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/verses/{verse_id}")
async def get_verse(verse_id: str):
    """Get a specific verse by ID."""
    if not verses_data:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    for verse in verses_data:
        if verse["id"] == verse_id:
            return verse
    
    raise HTTPException(status_code=404, detail="Verse not found")


@app.get("/clusters")
async def get_clusters():
    """Get cluster information."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("clusters", [])


@app.get("/hierarchy")
async def get_hierarchy():
    """Get topic hierarchy information."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("hierarchy", {})


@app.get("/metadata")
async def get_metadata():
    """Get clustering and embedding metadata."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("metadata", {})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

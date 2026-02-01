#!/usr/bin/env python3
"""
Generate high-quality embeddings using OpenAI's text-embedding-3-large model.

This replaces the local Ollama embeddings with:
1. OpenAI text-embedding-3-large (3072 dimensions, excellent multilingual)
2. Separate embeddings for Sanskrit and English (dual-space approach)
3. Normalized embeddings for cosine similarity
4. Rate limiting and error handling

Usage:
    python scripts/generate_embeddings_openai.py
"""

import json
import os
import time
from typing import Optional

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Paths
INPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_raw.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_with_embeddings_openai.json")

# OpenAI embedding model
# text-embedding-3-large: 3072 dims, best quality
# text-embedding-3-small: 1536 dims, faster/cheaper
MODEL_NAME = "text-embedding-3-large"
EMBEDDING_DIM = 3072

# Rate limiting (OpenAI limits: 3000 RPM for most tiers)
BATCH_SIZE = 50  # Embed multiple texts at once
DELAY_BETWEEN_BATCHES = 0.5  # seconds


def get_client() -> OpenAI:
    """Initialize OpenAI client with API key from environment."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found in environment. "
            "Please add it to your .env file."
        )
    return OpenAI(api_key=api_key)


def normalize_embedding(embedding: list[float]) -> list[float]:
    """Normalize embedding to unit length for cosine similarity."""
    arr = np.array(embedding, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm
    return arr.tolist()


def embed_batch(
    client: OpenAI,
    texts: list[str],
    model: str = MODEL_NAME
) -> list[list[float]]:
    """
    Embed a batch of texts using OpenAI API.
    Returns normalized embeddings.
    """
    # Clean and validate texts
    cleaned_texts = []
    for text in texts:
        # OpenAI has a limit of ~8191 tokens per text
        # Truncate very long texts (rare for Gita verses)
        text = text.strip()
        if not text:
            text = " "  # Empty string causes errors
        if len(text) > 30000:  # Character limit as safety
            text = text[:30000]
        cleaned_texts.append(text)
    
    response = client.embeddings.create(
        model=model,
        input=cleaned_texts,
    )
    
    embeddings = []
    for item in response.data:
        normalized = normalize_embedding(item.embedding)
        embeddings.append(normalized)
    
    return embeddings


def create_fused_embedding(
    sanskrit_emb: list[float],
    english_emb: list[float],
    sanskrit_weight: float = 0.4,
    english_weight: float = 0.6
) -> list[float]:
    """
    Create a weighted fusion of Sanskrit and English embeddings.
    
    We weight English slightly higher because:
    1. The model understands English semantics better
    2. Users primarily search in English
    3. Sanskrit provides complementary phonetic/structural information
    
    Both inputs should already be normalized.
    """
    sanskrit_arr = np.array(sanskrit_emb, dtype=np.float32)
    english_arr = np.array(english_emb, dtype=np.float32)
    
    # Weighted combination
    fused = (sanskrit_weight * sanskrit_arr) + (english_weight * english_arr)
    
    # Re-normalize
    norm = np.linalg.norm(fused)
    if norm > 0:
        fused = fused / norm
    
    return fused.tolist()


def main():
    print("=" * 60)
    print("OpenAI Embedding Generation Pipeline")
    print("=" * 60)
    
    # Initialize client
    print("\nInitializing OpenAI client...")
    try:
        client = get_client()
        print("✓ OpenAI client initialized")
    except ValueError as e:
        print(f"✗ Error: {e}")
        return
    
    # Test connection
    print(f"\nTesting connection with model: {MODEL_NAME}...")
    try:
        test_response = client.embeddings.create(
            model=MODEL_NAME,
            input=["test"],
        )
        actual_dim = len(test_response.data[0].embedding)
        print(f"✓ Connection successful. Embedding dimension: {actual_dim}")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    # Load verses
    print(f"\nLoading verses from {INPUT_PATH}...")
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        verses = json.load(f)
    print(f"Loaded {len(verses)} verses")
    
    # Prepare texts for embedding
    print("\nPreparing texts for embedding...")
    sanskrit_texts = []
    english_texts = []
    combined_texts = []
    
    for verse in verses:
        # Sanskrit: original text + transliteration
        sanskrit = verse.get("sanskrit", "").strip()
        transliteration = verse.get("transliteration", "").strip()
        sanskrit_full = f"{sanskrit}\n{transliteration}".strip()
        if not sanskrit_full:
            sanskrit_full = " "
        sanskrit_texts.append(sanskrit_full)
        
        # English: translation
        english = verse.get("translation_english", "").strip()
        if not english:
            english = verse.get("translation", "").strip()
        if not english:
            english = " "
        english_texts.append(english)
        
        # Combined: for single-embedding approach (backup)
        combined = f"{english}\n\n{transliteration}".strip()
        combined_texts.append(combined)
    
    # Generate embeddings in batches
    print(f"\nGenerating embeddings ({len(verses)} verses, batch size {BATCH_SIZE})...")
    
    sanskrit_embeddings = []
    english_embeddings = []
    
    # Sanskrit embeddings
    print("\n[1/2] Embedding Sanskrit texts...")
    for i in tqdm(range(0, len(sanskrit_texts), BATCH_SIZE), desc="Sanskrit"):
        batch = sanskrit_texts[i:i + BATCH_SIZE]
        try:
            embeddings = embed_batch(client, batch)
            sanskrit_embeddings.extend(embeddings)
        except Exception as e:
            print(f"\n  Error at batch {i}: {e}")
            # Add zero embeddings as fallback
            for _ in batch:
                sanskrit_embeddings.append([0.0] * actual_dim)
        
        time.sleep(DELAY_BETWEEN_BATCHES)
    
    # English embeddings
    print("\n[2/2] Embedding English translations...")
    for i in tqdm(range(0, len(english_texts), BATCH_SIZE), desc="English"):
        batch = english_texts[i:i + BATCH_SIZE]
        try:
            embeddings = embed_batch(client, batch)
            english_embeddings.extend(embeddings)
        except Exception as e:
            print(f"\n  Error at batch {i}: {e}")
            for _ in batch:
                english_embeddings.append([0.0] * actual_dim)
        
        time.sleep(DELAY_BETWEEN_BATCHES)
    
    # Create fused embeddings
    print("\nCreating fused embeddings...")
    fused_embeddings = []
    for i in range(len(verses)):
        fused = create_fused_embedding(
            sanskrit_embeddings[i],
            english_embeddings[i],
            sanskrit_weight=0.4,
            english_weight=0.6
        )
        fused_embeddings.append(fused)
    
    # Add embeddings to verse data
    print("\nAdding embeddings to verse data...")
    for i, verse in enumerate(verses):
        verse["embedding_sanskrit"] = sanskrit_embeddings[i]
        verse["embedding_translation"] = english_embeddings[i]
        verse["embedding_fused"] = fused_embeddings[i]
        verse["embedding"] = fused_embeddings[i]  # Default for clustering
        verse["embedding_model"] = MODEL_NAME
        verse["embedding_dim"] = actual_dim
    
    # Validate embeddings
    valid_count = sum(1 for v in verses if v.get("embedding") and any(x != 0 for x in v["embedding"]))
    invalid_count = len(verses) - valid_count
    
    print(f"\n✓ Valid embeddings: {valid_count}/{len(verses)}")
    if invalid_count > 0:
        print(f"  Warning: {invalid_count} verses have zero embeddings")
    
    # Save results
    print(f"\nSaving to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(verses, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Saved {len(verses)} verses with OpenAI embeddings")
    
    # Print summary
    print("\n" + "=" * 60)
    print("EMBEDDING SUMMARY")
    print("=" * 60)
    print(f"Model: {MODEL_NAME}")
    print(f"Embedding dimension: {actual_dim}")
    print(f"Total verses: {len(verses)}")
    print(f"Sanskrit embeddings: {len(sanskrit_embeddings)}")
    print(f"English embeddings: {len(english_embeddings)}")
    print(f"Fused embeddings: {len(fused_embeddings)}")
    print(f"\nFusion weights: Sanskrit 40%, English 60%")
    print(f"Output: {OUTPUT_PATH}")
    
    # Compute some quick stats
    print("\n--- Embedding Statistics ---")
    fused_arr = np.array(fused_embeddings)
    print(f"Mean norm (should be ~1.0): {np.mean(np.linalg.norm(fused_arr, axis=1)):.4f}")
    print(f"Std of norms: {np.std(np.linalg.norm(fused_arr, axis=1)):.6f}")
    
    # Sample similarity check
    print("\n--- Sample Similarities ---")
    # First verse of chapters 1 and 2
    sim_1_2 = np.dot(fused_embeddings[0], fused_embeddings[46])  # BG1.1 vs BG2.1
    print(f"BG1.1 ↔ BG2.1: {sim_1_2:.4f}")
    # Two verses from same chapter
    sim_same = np.dot(fused_embeddings[0], fused_embeddings[1])  # BG1.1 vs BG1.2
    print(f"BG1.1 ↔ BG1.2: {sim_same:.4f}")


if __name__ == "__main__":
    main()

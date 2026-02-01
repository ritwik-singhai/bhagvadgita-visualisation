#!/usr/bin/env python3
"""
Generate embeddings for all Bhagavad Gita verses using Ollama's EmbeddingGemma model.
Outputs: data/verses_with_embeddings.json
"""

import json
import os
import ollama
import numpy as np
from tqdm import tqdm

INPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_raw.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_with_embeddings.json")

# Ollama embedding model - Google's EmbeddingGemma
MODEL_NAME = "embeddinggemma"
SANSKRIT_WEIGHT = 0.7
TRANSLATION_WEIGHT = 0.3


def get_embedding(text: str) -> list[float]:
    """Get embedding for a text using Ollama."""
    response = ollama.embed(model=MODEL_NAME, input=text)
    return response["embeddings"][0]


def fuse_embeddings(
    sanskrit_embedding: list[float],
    translation_embedding: list[float],
) -> list[float]:
    """Create a weighted fusion of Sanskrit and translation embeddings."""
    sanskrit_vec = np.array(sanskrit_embedding, dtype=np.float32)
    translation_vec = np.array(translation_embedding, dtype=np.float32)

    # Normalize to unit length before fusion
    sanskrit_vec /= np.linalg.norm(sanskrit_vec) + 1e-8
    translation_vec /= np.linalg.norm(translation_vec) + 1e-8

    fused = (SANSKRIT_WEIGHT * sanskrit_vec) + (TRANSLATION_WEIGHT * translation_vec)
    fused /= np.linalg.norm(fused) + 1e-8
    return fused.tolist()


def main():
    print(f"Loading verses from {INPUT_PATH}...")
    
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        verses = json.load(f)
    
    print(f"Found {len(verses)} verses")
    print(f"Using Ollama model: {MODEL_NAME}")
    
    # Test connection to Ollama
    print("\nTesting Ollama connection...")
    try:
        test_embedding = get_embedding("test")
        embedding_dim = len(test_embedding)
        print(f"✓ Ollama connected. Embedding dimension: {embedding_dim}")
    except Exception as e:
        print(f"✗ Failed to connect to Ollama: {e}")
        print("\nMake sure Ollama is running and the embeddinggemma model is installed:")
        print("  1. Start Ollama: ollama serve")
        print("  2. Pull model: ollama pull embeddinggemma")
        return
    
    # Generate embeddings for each verse
    print("\nGenerating embeddings...")
    
    for verse in tqdm(verses, desc="Embedding verses"):
        sanskrit_text = verse.get("sanskrit", "").strip()
        translation_text = verse.get("translation_english", "").strip()

        try:
            sanskrit_embedding = get_embedding(sanskrit_text)
            translation_embedding = get_embedding(translation_text or sanskrit_text)
            fused_embedding = fuse_embeddings(sanskrit_embedding, translation_embedding)

            verse["embedding_sanskrit"] = sanskrit_embedding
            verse["embedding_translation"] = translation_embedding
            verse["embedding_fused"] = fused_embedding
            # Backward compatible field for downstream scripts
            verse["embedding"] = fused_embedding
        except Exception as e:
            print(f"\nError embedding {verse['id']}: {e}")
            verse["embedding"] = None
    
    # Filter out any failed embeddings
    verses_with_embeddings = [v for v in verses if v.get("embedding") is not None]
    failed_count = len(verses) - len(verses_with_embeddings)
    
    if failed_count > 0:
        print(f"\nWarning: {failed_count} verses failed to embed")
    
    # Save results
    print(f"\nSaving embeddings to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(verses_with_embeddings, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Saved {len(verses_with_embeddings)} verses with embeddings")
    print(f"  Embedding dimension: {embedding_dim}")


if __name__ == "__main__":
    main()

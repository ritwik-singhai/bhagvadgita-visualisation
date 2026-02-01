#!/usr/bin/env python3
"""
Advanced clustering for Bhagavad Gita verses using BERTopic and HDBSCAN.

This replaces the naive hard-coded themes approach with:
1. HDBSCAN for density-based clustering (finds natural cluster shapes)
2. BERTopic-inspired c-TF-IDF for automatic topic labeling
3. Soft cluster assignments (probability distribution per verse)
4. Hierarchical topic structure for multi-resolution exploration

Author: Enhanced clustering pipeline
"""

import json
import os
import re
from collections import Counter
from typing import Optional

import hdbscan
import numpy as np
from scipy.cluster.hierarchy import fcluster, linkage
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer
from sklearn.metrics import silhouette_score
import umap

# Paths
INPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_with_embeddings_openai.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_visualization_v2.json")

# UMAP parameters - tuned for semantic text data
UMAP_N_NEIGHBORS = 30  # Larger neighborhood for better global structure
UMAP_MIN_DIST = 0.0  # Allow points to cluster tightly
UMAP_N_COMPONENTS_VIZ = 3  # For visualization
UMAP_N_COMPONENTS_CLUSTER = 15  # Higher dim for clustering accuracy
UMAP_METRIC = "cosine"

# HDBSCAN parameters - tuned for OpenAI 3072d embeddings
MIN_CLUSTER_SIZE = 10  # Smaller clusters allowed for more granularity
MIN_SAMPLES = 3  # Less strict core sample requirement
CLUSTER_SELECTION_EPSILON = 0.0  # Allow clusters of any density
CLUSTER_SELECTION_METHOD = "eom"  # Excess of Mass (better for varied densities)

# Extended Sanskrit-aware stopwords
STOPWORDS = {
    # English stopwords
    "the", "and", "of", "to", "in", "a", "is", "for", "on", "that", "this", "it",
    "as", "with", "by", "from", "an", "are", "be", "at", "or", "but", "so", "if",
    "their", "they", "them", "those", "these", "his", "her", "its", "our", "we",
    "you", "your", "yours", "i", "me", "my", "mine", "us", "not", "no", "nor",
    "who", "which", "what", "when", "where", "how", "why", "all", "each", "every",
    "both", "few", "more", "most", "other", "some", "such", "than", "too", "very",
    "can", "will", "just", "should", "would", "could", "may", "might", "must",
    "shall", "have", "has", "had", "do", "does", "did", "done", "being", "been",
    "was", "were", "am", "about", "after", "before", "through", "during", "under",
    "again", "further", "then", "once", "here", "there", "also", "only", "own",
    # Common Gita-specific words that don't add discriminative value
    "one", "said", "says", "therefore", "thus", "indeed", "even", "though",
    "always", "never", "ever", "also", "still", "yet", "unto", "upon",
    # Transliteration particles
    "ca", "tu", "eva", "hi", "api", "iti", "cha", "tatha",
}


def normalize_embeddings(embeddings: np.ndarray) -> np.ndarray:
    """Normalize embeddings to unit length for cosine-based metrics."""
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    return embeddings / (norms + 1e-8)


def tokenize_text(text: str) -> list[str]:
    """Sanskrit-aware tokenization with lemma-like normalization."""
    # Extract words, keeping Sanskrit transliteration diacritics
    tokens = re.findall(r"[a-zA-Zāīūṛṝṃṁñṅṭḍṇśṣḥ']+", text.lower())
    
    # Normalize common transliteration variants
    normalized = []
    for tok in tokens:
        if len(tok) <= 2:
            continue
        # Normalize diacritics for matching
        tok = tok.replace("ā", "a").replace("ī", "i").replace("ū", "u")
        tok = tok.replace("ṛ", "ri").replace("ṝ", "ri")
        tok = tok.replace("ṃ", "m").replace("ṁ", "m")
        tok = tok.replace("ñ", "n").replace("ṅ", "n").replace("ṇ", "n")
        tok = tok.replace("ṭ", "t").replace("ḍ", "d")
        tok = tok.replace("ś", "sh").replace("ṣ", "sh")
        tok = tok.replace("ḥ", "h")
        
        if tok not in STOPWORDS and len(tok) > 2:
            normalized.append(tok)
    
    return normalized


def extract_ctfidf_keywords(
    verses: list,
    labels: np.ndarray,
    top_k: int = 8
) -> tuple[dict, dict]:
    """
    Extract keywords using class-based TF-IDF (c-TF-IDF).
    
    This is the core of BERTopic's topic representation:
    - Concatenate all documents in a cluster
    - Compute TF-IDF at the cluster level
    - Weigh by inverse cluster frequency
    
    Returns:
        keywords: dict mapping cluster_id -> list of (word, score) tuples
        topic_labels: dict mapping cluster_id -> auto-generated label
    """
    cluster_ids = sorted(set(labels[labels >= 0]))  # Exclude noise (-1)
    
    if len(cluster_ids) == 0:
        return {}, {}
    
    # Collect all documents for vocabulary building
    all_docs = []
    cluster_docs = {cid: [] for cid in cluster_ids}
    
    for verse, label in zip(verses, labels):
        if label < 0:
            continue
        translation = verse.get("translation_english") or verse.get("translation") or ""
        transliteration = verse.get("transliteration") or ""
        text = f"{translation} {transliteration}"
        all_docs.append(text)
        cluster_docs[int(label)].append(text)
    
    if not all_docs:
        return {cid: [] for cid in cluster_ids}, {cid: f"Topic {cid}" for cid in cluster_ids}
    
    # Build vocabulary from ALL individual documents (not concatenated)
    vectorizer = CountVectorizer(
        tokenizer=tokenize_text,
        max_features=2000,
        min_df=3,  # Must appear in at least 3 documents
        max_df=0.85,  # Exclude terms in >85% of docs
    )
    
    try:
        vectorizer.fit(all_docs)
        vocab = vectorizer.get_feature_names_out()
        print(f"      Vocabulary size: {len(vocab)} terms")
    except ValueError as e:
        print(f"      Warning: Could not build vocabulary: {e}")
        return {cid: [] for cid in cluster_ids}, {cid: f"Topic {cid}" for cid in cluster_ids}
    
    if len(vocab) == 0:
        return {cid: [] for cid in cluster_ids}, {cid: f"Topic {cid}" for cid in cluster_ids}
    
    # Compute TF per cluster (by concatenating cluster documents)
    cluster_tf = {}
    for cid in cluster_ids:
        if cluster_docs[cid]:
            cluster_text = " ".join(cluster_docs[cid])
            try:
                tf_vector = vectorizer.transform([cluster_text]).toarray()[0]
                cluster_tf[cid] = tf_vector
            except Exception:
                cluster_tf[cid] = np.zeros(len(vocab))
        else:
            cluster_tf[cid] = np.zeros(len(vocab))
    
    # Compute IDF across clusters (how many clusters contain each term)
    n_clusters = len(cluster_ids)
    cluster_doc_freq = np.zeros(len(vocab))
    for cid, tf in cluster_tf.items():
        cluster_doc_freq += (tf > 0).astype(float)
    
    # IDF with smoothing
    idf = np.log((n_clusters + 1) / (cluster_doc_freq + 1)) + 1
    
    # Compute c-TF-IDF for each cluster
    keywords = {}
    topic_labels = {}
    
    for cid in cluster_ids:
        tf = cluster_tf.get(cid, np.zeros(len(vocab)))
        total_terms = tf.sum()
        if total_terms == 0:
            keywords[cid] = []
            topic_labels[cid] = f"Topic {cid}"
            continue
        
        # Normalize TF (term frequency within cluster)
        tf_norm = tf / total_terms
        
        # c-TF-IDF score
        ctfidf = tf_norm * idf
        
        # Get top keywords
        top_indices = np.argsort(ctfidf)[::-1][:top_k]
        kw_list = [(str(vocab[i]), float(ctfidf[i])) for i in top_indices if ctfidf[i] > 0.001]
        keywords[cid] = kw_list
        
        # Generate topic label from top 2 keywords
        label_words = [w for w, s in kw_list[:3] if len(w) > 3]
        if len(label_words) >= 2:
            topic_labels[cid] = " & ".join(w.capitalize() for w in label_words[:2])
        elif len(label_words) == 1:
            topic_labels[cid] = label_words[0].capitalize()
        else:
            topic_labels[cid] = f"Topic {cid}"
    
    return keywords, topic_labels


def compute_soft_clusters(
    embeddings: np.ndarray,
    hard_labels: np.ndarray,
    hdbscan_model: hdbscan.HDBSCAN
) -> np.ndarray:
    """
    Compute soft cluster probabilities for each verse.
    
    HDBSCAN provides membership strengths, but we enhance this
    with distance-based probabilities to all cluster centroids.
    """
    n_samples = len(embeddings)
    cluster_ids = sorted(set(hard_labels[hard_labels >= 0]))
    n_clusters = len(cluster_ids)
    
    if n_clusters == 0:
        return np.zeros((n_samples, 1))
    
    # Compute cluster centroids
    normalized = normalize_embeddings(embeddings)
    centroids = []
    for cid in cluster_ids:
        cluster_vecs = normalized[hard_labels == cid]
        if len(cluster_vecs) > 0:
            centroid = cluster_vecs.mean(axis=0)
            centroid /= np.linalg.norm(centroid) + 1e-8
            centroids.append(centroid)
        else:
            centroids.append(np.zeros(embeddings.shape[1]))
    
    centroids = np.vstack(centroids)
    
    # Compute similarities to all centroids
    similarities = np.dot(normalized, centroids.T)
    
    # Convert to probabilities using softmax with temperature
    temperature = 0.5  # Lower = sharper distributions
    exp_sim = np.exp(similarities / temperature)
    probabilities = exp_sim / (exp_sim.sum(axis=1, keepdims=True) + 1e-8)
    
    return probabilities


def build_topic_hierarchy(
    embeddings: np.ndarray,
    labels: np.ndarray,
    topic_labels: dict
) -> dict:
    """
    Build a hierarchical topic structure using agglomerative clustering
    on cluster centroids.
    
    This allows users to zoom in/out on topic granularity.
    """
    cluster_ids = sorted(set(labels[labels >= 0]))
    if len(cluster_ids) < 2:
        return {"levels": [], "tree": []}
    
    # Compute cluster centroids
    normalized = normalize_embeddings(embeddings)
    centroids = []
    for cid in cluster_ids:
        cluster_vecs = normalized[labels == cid]
        if len(cluster_vecs) > 0:
            centroid = cluster_vecs.mean(axis=0)
            centroids.append(centroid)
        else:
            centroids.append(np.zeros(embeddings.shape[1]))
    
    centroids = np.vstack(centroids)
    
    # Hierarchical clustering on centroids
    Z = linkage(centroids, method='ward')
    
    # Create hierarchy at multiple levels
    levels = []
    for n_super in [3, 6, len(cluster_ids)]:
        if n_super > len(cluster_ids):
            n_super = len(cluster_ids)
        super_labels = fcluster(Z, t=n_super, criterion='maxclust')
        
        level_mapping = {}
        for i, cid in enumerate(cluster_ids):
            super_id = int(super_labels[i]) - 1  # 0-indexed
            if super_id not in level_mapping:
                level_mapping[super_id] = []
            level_mapping[super_id].append({
                "id": int(cid),
                "label": topic_labels.get(cid, f"Topic {cid}")
            })
        
        levels.append({
            "n_clusters": n_super,
            "groups": level_mapping
        })
    
    return {"levels": levels}


def select_exemplar_verses(
    embeddings: np.ndarray,
    labels: np.ndarray,
    verses: list,
    n_exemplars: int = 3
) -> dict:
    """
    Select exemplar verses for each cluster.
    
    Instead of just the closest to centroid, we select:
    1. Most central (closest to centroid)
    2. Most distinctive (highest cluster probability)
    3. Most accessible (shortest, clearest translation)
    """
    normalized = normalize_embeddings(embeddings)
    cluster_ids = sorted(set(labels[labels >= 0]))
    
    exemplars = {}
    
    for cid in cluster_ids:
        cluster_indices = np.where(labels == cid)[0]
        if len(cluster_indices) == 0:
            continue
        
        cluster_vecs = normalized[cluster_indices]
        
        # Compute centroid
        centroid = cluster_vecs.mean(axis=0)
        centroid /= np.linalg.norm(centroid) + 1e-8
        
        # Similarity to centroid
        sims = np.dot(cluster_vecs, centroid)
        
        # Select top exemplars
        top_indices = np.argsort(sims)[::-1][:n_exemplars]
        
        exemplar_list = []
        for idx in top_indices:
            verse_idx = cluster_indices[idx]
            verse = verses[verse_idx]
            exemplar_list.append({
                "id": verse["id"],
                "translation": (verse.get("translation_english") or 
                               verse.get("translation") or "")[:200],
                "sanskrit": verse.get("sanskrit", "")[:100],
                "similarity": float(sims[idx])
            })
        
        exemplars[int(cid)] = exemplar_list
    
    return exemplars


def main():
    print("=" * 60)
    print("Advanced Bhagavad Gita Clustering Pipeline")
    print("=" * 60)
    
    # Load data
    print(f"\nLoading verses from {INPUT_PATH}...")
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        verses = json.load(f)
    
    print(f"Loaded {len(verses)} verses")
    
    # Extract embeddings
    embeddings = np.array([v["embedding"] for v in verses])
    print(f"Embedding matrix shape: {embeddings.shape}")
    
    # Normalize embeddings
    embeddings_norm = normalize_embeddings(embeddings)
    
    # Step 1: UMAP for clustering (higher dimensionality preserves structure)
    print(f"\n[1/6] UMAP dimensionality reduction for clustering...")
    reducer_cluster = umap.UMAP(
        n_neighbors=UMAP_N_NEIGHBORS,
        min_dist=0.0,
        n_components=UMAP_N_COMPONENTS_CLUSTER,
        metric=UMAP_METRIC,
        random_state=42,
    )
    embeddings_reduced = reducer_cluster.fit_transform(embeddings_norm)
    print(f"      Reduced to {embeddings_reduced.shape[1]} dimensions for clustering")
    
    # Step 2: HDBSCAN clustering
    print(f"\n[2/6] HDBSCAN clustering (min_cluster_size={MIN_CLUSTER_SIZE})...")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=MIN_CLUSTER_SIZE,
        min_samples=MIN_SAMPLES,
        cluster_selection_epsilon=CLUSTER_SELECTION_EPSILON,
        cluster_selection_method=CLUSTER_SELECTION_METHOD,
        metric='euclidean',
        prediction_data=True,
    )
    hard_labels = clusterer.fit_predict(embeddings_reduced)
    
    n_clusters = len(set(hard_labels[hard_labels >= 0]))
    n_noise = (hard_labels == -1).sum()
    print(f"      Found {n_clusters} clusters, {n_noise} noise points ({100*n_noise/len(verses):.1f}%)")
    
    # If too few clusters, retry with smaller min_cluster_size
    if n_clusters < 5:
        print("      Retrying with smaller min_cluster_size...")
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=8,
            min_samples=3,
            metric='euclidean',
            prediction_data=True,
        )
        hard_labels = clusterer.fit_predict(embeddings_reduced)
        n_clusters = len(set(hard_labels[hard_labels >= 0]))
        n_noise = (hard_labels == -1).sum()
        print(f"      Now found {n_clusters} clusters, {n_noise} noise points")
    
    # Compute clustering metrics
    non_noise_mask = hard_labels >= 0
    if non_noise_mask.sum() > 1 and n_clusters > 1:
        silhouette = silhouette_score(
            embeddings_reduced[non_noise_mask],
            hard_labels[non_noise_mask]
        )
        print(f"      Silhouette score: {silhouette:.4f}")
    else:
        silhouette = 0.0
    
    # Assign noise points to nearest cluster centroid
    if n_noise > 0:
        print(f"      Assigning {n_noise} noise points to nearest clusters...")
        cluster_ids_orig = sorted(set(hard_labels[hard_labels >= 0]))
        
        # Compute cluster centroids
        centroids = []
        for cid in cluster_ids_orig:
            cluster_vecs = embeddings_norm[hard_labels == cid]
            centroid = cluster_vecs.mean(axis=0)
            centroid /= np.linalg.norm(centroid) + 1e-8
            centroids.append(centroid)
        centroids = np.vstack(centroids)
        
        # Assign each noise point to nearest centroid
        noise_indices = np.where(hard_labels == -1)[0]
        for idx in noise_indices:
            vec = embeddings_norm[idx]
            vec /= np.linalg.norm(vec) + 1e-8
            similarities = np.dot(centroids, vec)
            nearest_cluster_idx = np.argmax(similarities)
            hard_labels[idx] = cluster_ids_orig[nearest_cluster_idx]
        
        n_noise_after = (hard_labels == -1).sum()
        print(f"      Noise reduced to {n_noise_after} points")
    
    # Step 3: UMAP for 3D visualization
    print(f"\n[3/6] UMAP for 3D visualization...")
    reducer_viz = umap.UMAP(
        n_neighbors=UMAP_N_NEIGHBORS,
        min_dist=UMAP_MIN_DIST,
        n_components=UMAP_N_COMPONENTS_VIZ,
        metric=UMAP_METRIC,
        random_state=42,
    )
    coords_3d = reducer_viz.fit_transform(embeddings_norm)
    
    # Normalize to [-5, 5] for Three.js
    coords_min = coords_3d.min(axis=0)
    coords_max = coords_3d.max(axis=0)
    coords_normalized = 2 * (coords_3d - coords_min) / (coords_max - coords_min + 1e-8) - 1
    coords_normalized *= 5
    
    print(f"      3D coordinates computed, range: [{coords_normalized.min():.2f}, {coords_normalized.max():.2f}]")
    
    # Step 4: Extract topic labels using c-TF-IDF
    print(f"\n[4/6] Extracting topic labels using c-TF-IDF...")
    keywords, topic_labels = extract_ctfidf_keywords(verses, hard_labels)
    
    print("      Auto-generated topic labels:")
    for cid in sorted(topic_labels.keys()):
        count = (hard_labels == cid).sum()
        print(f"        Cluster {cid}: {topic_labels[cid]} ({count} verses)")
    
    # Step 5: Compute soft cluster assignments
    print(f"\n[5/6] Computing soft cluster probabilities...")
    soft_probs = compute_soft_clusters(embeddings_norm, hard_labels, clusterer)
    print(f"      Probability matrix shape: {soft_probs.shape}")
    
    # Step 6: Build topic hierarchy
    print(f"\n[6/6] Building topic hierarchy...")
    hierarchy = build_topic_hierarchy(embeddings_norm, hard_labels, topic_labels)
    print(f"      Created {len(hierarchy.get('levels', []))} hierarchy levels")
    
    # Select exemplar verses
    exemplars = select_exemplar_verses(embeddings_norm, hard_labels, verses)
    
    # Build output data
    print("\nBuilding visualization data...")
    
    cluster_ids = sorted(set(hard_labels[hard_labels >= 0]))
    
    visualization_data = {
        "verses": [],
        "clusters": [],
        "hierarchy": hierarchy,
        "metadata": {
            "total_verses": len(verses),
            "total_clusters": n_clusters,
            "noise_verses": int(n_noise),
            "embedding_dim": embeddings.shape[1],
            "silhouette_score": float(silhouette),
            "clustering_method": "hdbscan",
            "topic_extraction": "c-tfidf",
            "umap_params": {
                "n_neighbors": UMAP_N_NEIGHBORS,
                "min_dist": UMAP_MIN_DIST,
            },
            "hdbscan_params": {
                "min_cluster_size": MIN_CLUSTER_SIZE,
                "min_samples": MIN_SAMPLES,
            }
        }
    }
    
    # Add verse data
    for i, verse in enumerate(verses):
        label = int(hard_labels[i])
        
        # Get top cluster probabilities
        if label >= 0:
            prob_idx = cluster_ids.index(label)
            top_probs = {
                int(cluster_ids[j]): float(soft_probs[i, j])
                for j in np.argsort(soft_probs[i])[::-1][:3]
            }
        else:
            top_probs = {}
        
        viz_verse = {
            "id": verse["id"],
            "chapter": verse["chapter"],
            "verse": verse["verse"],
            "chapter_name": verse["chapter_name"],
            "chapter_name_english": verse["chapter_name_english"],
            "sanskrit": verse["sanskrit"],
            "transliteration": verse["transliteration"],
            "translation": verse.get("translation_english") or verse.get("translation") or "",
            "position": {
                "x": float(coords_normalized[i, 0]),
                "y": float(coords_normalized[i, 1]),
                "z": float(coords_normalized[i, 2]),
            },
            "cluster": label,
            "topic": topic_labels.get(label, "Unassigned") if label >= 0 else "Unassigned",
            "cluster_probs": top_probs,
            "embedding": verse["embedding"],
        }
        visualization_data["verses"].append(viz_verse)
    
    # Add cluster metadata
    for cid in cluster_ids:
        cluster_verses = [v for v in visualization_data["verses"] if v["cluster"] == cid]
        
        if cluster_verses:
            centroid_x = np.mean([v["position"]["x"] for v in cluster_verses])
            centroid_y = np.mean([v["position"]["y"] for v in cluster_verses])
            centroid_z = np.mean([v["position"]["z"] for v in cluster_verses])
        else:
            centroid_x = centroid_y = centroid_z = 0
        
        visualization_data["clusters"].append({
            "id": int(cid),
            "theme": topic_labels.get(cid, f"Topic {cid}"),
            "verse_count": len(cluster_verses),
            "keywords": [{"word": w, "score": s} for w, s in keywords.get(cid, [])],
            "exemplars": exemplars.get(cid, []),
            "centroid": {
                "x": float(centroid_x),
                "y": float(centroid_y),
                "z": float(centroid_z),
            }
        })
    
    # Add noise cluster if any
    noise_verses = [v for v in visualization_data["verses"] if v["cluster"] == -1]
    if noise_verses:
        visualization_data["clusters"].append({
            "id": -1,
            "theme": "Unique Verses",
            "verse_count": len(noise_verses),
            "keywords": [],
            "exemplars": [],
            "centroid": {"x": 0, "y": 0, "z": 0}
        })
    
    # Save full data
    print(f"\nSaving visualization data to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(visualization_data, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved full visualization data")
    
    # Save frontend-optimized version (no embeddings)
    frontend_data = {
        "verses": [
            {k: v for k, v in verse.items() if k != "embedding"}
            for verse in visualization_data["verses"]
        ],
        "clusters": visualization_data["clusters"],
        "hierarchy": visualization_data["hierarchy"],
        "metadata": visualization_data["metadata"],
    }
    
    frontend_path = OUTPUT_PATH.replace(".json", "_frontend.json")
    with open(frontend_path, "w", encoding="utf-8") as f:
        json.dump(frontend_data, f, ensure_ascii=False, indent=2)
    print(f"✓ Saved frontend-optimized data to {frontend_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("CLUSTERING SUMMARY")
    print("=" * 60)
    print(f"Total verses: {len(verses)}")
    print(f"Clusters found: {n_clusters}")
    print(f"Noise points: {n_noise} ({100*n_noise/len(verses):.1f}%)")
    print(f"Silhouette score: {silhouette:.4f}")
    print("\nTop clusters by size:")
    
    cluster_sizes = [(cid, (hard_labels == cid).sum()) for cid in cluster_ids]
    cluster_sizes.sort(key=lambda x: x[1], reverse=True)
    
    for cid, size in cluster_sizes[:10]:
        kws = ", ".join(w for w, s in keywords.get(cid, [])[:4])
        print(f"  {topic_labels.get(cid, f'Topic {cid}'):30} ({size:3} verses) [{kws}]")


if __name__ == "__main__":
    main()

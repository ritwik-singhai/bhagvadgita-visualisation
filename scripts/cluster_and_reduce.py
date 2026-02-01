#!/usr/bin/env python3
"""
Apply UMAP dimensionality reduction and K-Means clustering to verse embeddings.
Outputs: data/verses_visualization.json (for frontend)
"""

import json
import os
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score,
)
from sklearn.neighbors import NearestNeighbors
import umap

STOPWORDS = {
    "the", "and", "of", "to", "in", "a", "is", "for", "on", "that", "this", "it",
    "as", "with", "by", "from", "an", "are", "be", "at", "or", "but", "so", "if",
    "their", "they", "them", "those", "these", "his", "her", "its", "our", "we",
    "you", "your", "yours", "i", "me", "my", "mine", "us", "not", "no", "nor",
}

INPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_with_embeddings.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "verses_visualization.json")

# UMAP parameters for 3D projection
UMAP_N_NEIGHBORS = 15
UMAP_MIN_DIST = 0.1
UMAP_N_COMPONENTS = 3
UMAP_METRIC = "cosine"

# Clustering parameters
N_CLUSTERS = 18  # Used for K-Means fallback
USE_GRAPH_CLUSTERING = True
KNN_K = 12


# Concept labels for clusters (will be auto-assigned based on chapter content)
CHAPTER_THEMES = {
    1: "Arjuna's Despair",
    2: "Path of Knowledge",
    3: "Path of Action",
    4: "Divine Knowledge",
    5: "Renunciation of Action",
    6: "Meditation & Self-Control",
    7: "Knowledge of the Absolute",
    8: "Attaining the Supreme",
    9: "Royal Knowledge", Christ, I don't know, okay 
    10: "Divine Manifestations",
    11: "Universal Form",
    12: "Path of Devotion",
    13: "Field & Knower",
    14: "Three Gunas",
    15: "Supreme Person",
    16: "Divine & Demoniac",
    17: "Threefold Faith",
    18: "Liberation & Surrender",
}


def normalize_embeddings(embeddings: np.ndarray) -> np.ndarray:
    """Normalize embeddings to unit length for cosine-based metrics."""
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    return embeddings / (norms + 1e-8)


def cosine_similarity_to_centroid(
    embeddings: np.ndarray, labels: np.ndarray
) -> dict:
    """Compute mean/std cosine similarity to cluster centroid."""
    normalized = normalize_embeddings(embeddings)
    metrics = {}
    for cluster_id in np.unique(labels):
        cluster_vecs = normalized[labels == cluster_id]
        if len(cluster_vecs) == 0:
            metrics[int(cluster_id)] = {"mean": 0.0, "std": 0.0}
            continue
        centroid = cluster_vecs.mean(axis=0)
        centroid /= np.linalg.norm(centroid) + 1e-8
        similarities = np.dot(cluster_vecs, centroid)
        metrics[int(cluster_id)] = {
            "mean": float(np.mean(similarities)),
            "std": float(np.std(similarities)),
        }
    return metrics


def chapter_entropy(verses: list, labels: np.ndarray) -> dict:
    """Compute chapter entropy per cluster (higher = more cross-chapter)."""
    metrics = {}
    for cluster_id in np.unique(labels):
        cluster_verses = [v for v, c in zip(verses, labels) if c == cluster_id]
        chapter_counts = {}
        for v in cluster_verses:
            ch = v["chapter"]
            chapter_counts[ch] = chapter_counts.get(ch, 0) + 1
        total = sum(chapter_counts.values())
        if total == 0:
            entropy = 0.0
        else:
            probs = np.array(list(chapter_counts.values()), dtype=np.float32) / total
            entropy = float(-np.sum(probs * np.log(probs + 1e-8)))
        metrics[int(cluster_id)] = {
            "entropy": entropy,
            "chapter_counts": chapter_counts,
        }
    return metrics


def extract_keywords(verses: list, labels: np.ndarray, top_k: int = 6) -> dict:
    """Compute simple TF-IDF-like keywords per cluster from English translations."""
    cluster_tokens = {}
    overall_df = {}

    def tokenize(text: str):
        import re
        tokens = re.findall(r"[a-zA-Z']+", text.lower())
        tokens = [t for t in tokens if len(t) > 3 and t not in STOPWORDS]
        return tokens

    for verse, label in zip(verses, labels):
        translation = verse.get("translation_english") or verse.get("translation") or ""
        tokens = set(tokenize(translation))
        cluster_tokens.setdefault(int(label), []).extend(tokens)
        for tok in tokens:
            overall_df[tok] = overall_df.get(tok, 0) + 1

    keywords = {}
    total_clusters = len(set(labels))
    for cluster_id, toks in cluster_tokens.items():
        tf = {}
        for tok in toks:
            tf[tok] = tf.get(tok, 0) + 1
        scores = []
        for tok, freq in tf.items():
            idf = np.log((1 + total_clusters) / (1 + overall_df.get(tok, 1))) + 1
            scores.append((tok, freq * idf))
        scores.sort(key=lambda x: x[1], reverse=True)
        keywords[cluster_id] = [w for w, _ in scores[:top_k]]
    return keywords


def exemplar_by_centroid(embeddings: np.ndarray, labels: np.ndarray, verses: list) -> dict:
    """Pick the verse closest to centroid as exemplar per cluster."""
    exemplars = {}
    normalized = normalize_embeddings(embeddings)
    centroids = {}
    for cid in np.unique(labels):
        cluster_vecs = normalized[labels == cid]
        if len(cluster_vecs) == 0:
            continue
        centroid = cluster_vecs.mean(axis=0)
        centroid /= np.linalg.norm(centroid) + 1e-8
        centroids[int(cid)] = centroid

    for cid, centroid in centroids.items():
        cluster_indices = np.where(labels == cid)[0]
        if len(cluster_indices) == 0:
            continue
        cluster_vecs = normalized[cluster_indices]
        sims = np.dot(cluster_vecs, centroid)
        best_idx = cluster_indices[int(np.argmax(sims))]
        verse = verses[best_idx]
        exemplars[cid] = {
            "id": verse["id"],
            "translation": verse.get("translation_english") or verse.get("translation") or "",
            "sanskrit": verse.get("sanskrit", ""),
        }
    return exemplars


def graph_community_clustering(embeddings: np.ndarray, k: int) -> np.ndarray:
    """Cluster using k-NN graph + Louvain community detection."""
    try:
        import networkx as nx
        import community as community_louvain
    except ImportError as exc:
        raise ImportError(
            "Graph clustering requires networkx and python-louvain."
        ) from exc

    normalized = normalize_embeddings(embeddings)
    nn = NearestNeighbors(n_neighbors=k + 1, metric="cosine")
    nn.fit(normalized)
    distances, indices = nn.kneighbors(normalized)

    graph = nx.Graph()
    for i in range(len(normalized)):
        graph.add_node(i)
        for j, dist in zip(indices[i][1:], distances[i][1:]):
            similarity = 1 - dist
            graph.add_edge(i, j, weight=float(similarity))

    partition = community_louvain.best_partition(graph, weight="weight")
    labels = np.array([partition[i] for i in range(len(normalized))], dtype=np.int32)
    return labels


def find_optimal_clusters(embeddings: np.ndarray, min_k: int = 10, max_k: int = 30) -> int:
    """Find optimal number of clusters using silhouette score."""
    print(f"Finding optimal cluster count between {min_k} and {max_k}...")
    
    best_score = -1
    best_k = min_k
    
    for k in range(min_k, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        score = silhouette_score(embeddings, labels)
        
        if score > best_score:
            best_score = score
            best_k = k
        
        print(f"  k={k}: silhouette={score:.4f}")
    
    print(f"Optimal k={best_k} with silhouette={best_score:.4f}")
    return best_k


def main():
    print(f"Loading verses with embeddings from {INPUT_PATH}...")
    
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        verses = json.load(f)
    
    print(f"Found {len(verses)} verses with embeddings")
    
    # Extract embeddings as numpy array
    embeddings = np.array([v["embedding"] for v in verses])
    print(f"Embedding matrix shape: {embeddings.shape}")
    
    # Apply UMAP for 3D reduction
    print(f"\nApplying UMAP (neighbors={UMAP_N_NEIGHBORS}, min_dist={UMAP_MIN_DIST})...")
    reducer = umap.UMAP(
        n_neighbors=UMAP_N_NEIGHBORS,
        min_dist=UMAP_MIN_DIST,
        n_components=UMAP_N_COMPONENTS,
        metric=UMAP_METRIC,
        random_state=42,
    )
    coords_3d = reducer.fit_transform(embeddings)
    print(f"✓ UMAP complete. Output shape: {coords_3d.shape}")
    
    # Normalize coordinates to [-1, 1] range for Three.js
    coords_min = coords_3d.min(axis=0)
    coords_max = coords_3d.max(axis=0)
    coords_normalized = 2 * (coords_3d - coords_min) / (coords_max - coords_min) - 1
    
    # Scale up for better visualization (spread points out more)
    coords_normalized *= 5
    
    # Apply clustering
    clustering_method = "kmeans"
    if USE_GRAPH_CLUSTERING:
        print(f"\nApplying graph clustering (kNN={KNN_K})...")
        try:
            cluster_labels = graph_community_clustering(embeddings, KNN_K)
            clustering_method = "graph_louvain"
        except Exception as e:
            print(f"Graph clustering failed ({e}). Falling back to K-Means.")
            kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(embeddings)
    else:
        print(f"\nApplying K-Means clustering (k={N_CLUSTERS})...")
        kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)

    cluster_ids = [int(x) for x in sorted(np.unique(cluster_labels))]
    effective_clusters = len(cluster_ids)
    
    # Calculate clustering metrics
    score = silhouette_score(embeddings, cluster_labels) if effective_clusters > 1 else 0.0
    db_index = davies_bouldin_score(embeddings, cluster_labels) if effective_clusters > 1 else 0.0
    ch_index = calinski_harabasz_score(embeddings, cluster_labels) if effective_clusters > 1 else 0.0
    print(f"✓ Clustering complete. Silhouette score: {score:.4f}")
    print(f"  Davies-Bouldin: {db_index:.4f}")
    print(f"  Calinski-Harabasz: {ch_index:.2f}")

    # Intra-cluster cosine similarity and chapter entropy
    intra_cosine = cosine_similarity_to_centroid(embeddings, cluster_labels)
    chapter_entropy_metrics = chapter_entropy(verses, cluster_labels)

    # Inter-cluster centroid cosine distances
    normalized_embeddings = normalize_embeddings(embeddings)
    centroids = []
    for cluster_id in cluster_ids:
        cluster_vecs = normalized_embeddings[cluster_labels == cluster_id]
        if len(cluster_vecs) == 0:
            centroids.append(np.zeros(normalized_embeddings.shape[1], dtype=np.float32))
            continue
        centroid = cluster_vecs.mean(axis=0)
        centroid /= np.linalg.norm(centroid) + 1e-8
        centroids.append(centroid)
    centroids = np.vstack(centroids)
    centroid_similarity = np.dot(centroids, centroids.T)
    centroid_distances = 1 - centroid_similarity
    inter_cluster_stats = {
        "mean": float(np.mean(centroid_distances)),
        "min": float(np.min(centroid_distances)),
        "max": float(np.max(centroid_distances)),
    }

    # Cluster keywords and exemplars
    cluster_keywords = extract_keywords(verses, cluster_labels)
    cluster_exemplars = exemplar_by_centroid(embeddings, cluster_labels, verses)

    # Build a lightweight cluster graph (top-N nearest neighbors)
    cluster_graph = []
    edge_map = {}
    top_n = 3
    for i, cluster_id in enumerate(cluster_ids):
        similarities = centroid_similarity[i]
        neighbor_indices = np.argsort(similarities)[::-1]
        neighbors_added = 0
        for idx in neighbor_indices:
            if idx == i:
                continue
            source = int(cluster_id)
            target = int(cluster_ids[idx])
            weight = float(similarities[idx])
            edge_key = tuple(sorted([source, target]))
            if edge_key not in edge_map or weight > edge_map[edge_key]["weight"]:
                edge_map[edge_key] = {"source": source, "target": target, "weight": weight}
            neighbors_added += 1
            if neighbors_added >= top_n:
                break
    cluster_graph = list(edge_map.values())
    
    # Assign theme labels to clusters based on dominant chapter
    cluster_themes = {}
    for cluster_id in cluster_ids:
        # Find verses in this cluster
        cluster_verses = [v for v, c in zip(verses, cluster_labels) if c == cluster_id]
        
        # Find dominant chapter in this cluster
        chapter_counts = {}
        for v in cluster_verses:
            ch = v["chapter"]
            chapter_counts[ch] = chapter_counts.get(ch, 0) + 1
        
        dominant_chapter = max(chapter_counts, key=chapter_counts.get)
        cluster_themes[cluster_id] = CHAPTER_THEMES.get(dominant_chapter, f"Cluster {cluster_id + 1}")
    
    # Build output data for frontend
    print("\nBuilding visualization data...")
    visualization_data = {
        "verses": [],
        "clusters": [],
        "metadata": {
            "total_verses": len(verses),
            "total_clusters": effective_clusters,
            "embedding_dim": embeddings.shape[1],
            "silhouette_score": float(score),
            "davies_bouldin": float(db_index),
            "calinski_harabasz": float(ch_index),
            "clustering_method": clustering_method,
            "knn_k": KNN_K if clustering_method == "graph_louvain" else None,
            "cluster_metrics": {
                "intra_cluster_cosine": intra_cosine,
                "chapter_entropy": chapter_entropy_metrics,
                "inter_cluster_centroid_distance": inter_cluster_stats,
            },
            "cluster_keywords": cluster_keywords,
            "cluster_exemplars": cluster_exemplars,
        }
    }
    
    for i, verse in enumerate(verses):
        viz_verse = {
            "id": verse["id"],
            "chapter": verse["chapter"],
            "verse": verse["verse"],
            "chapter_name": verse["chapter_name"],
            "chapter_name_english": verse["chapter_name_english"],
            "sanskrit": verse["sanskrit"],
            "transliteration": verse["transliteration"],
            "translation": verse["translation_english"],
            "position": {
                "x": float(coords_normalized[i, 0]),
                "y": float(coords_normalized[i, 1]),
                "z": float(coords_normalized[i, 2]),
            },
            "cluster": int(cluster_labels[i]),
            # Store embedding for search functionality
            "embedding": verse["embedding"],
        }
        if "embedding_sanskrit" in verse:
            viz_verse["embedding_sanskrit"] = verse["embedding_sanskrit"]
        if "embedding_translation" in verse:
            viz_verse["embedding_translation"] = verse["embedding_translation"]
        if "embedding_fused" in verse:
            viz_verse["embedding_fused"] = verse["embedding_fused"]
        visualization_data["verses"].append(viz_verse)
    
    # Add cluster metadata
    for cluster_id in cluster_ids:
        cluster_verses = [v for v in visualization_data["verses"] if v["cluster"] == cluster_id]
        
        # Calculate cluster centroid
        if cluster_verses:
            centroid_x = np.mean([v["position"]["x"] for v in cluster_verses])
            centroid_y = np.mean([v["position"]["y"] for v in cluster_verses])
            centroid_z = np.mean([v["position"]["z"] for v in cluster_verses])
        else:
            centroid_x = centroid_y = centroid_z = 0
        
        visualization_data["clusters"].append({
            "id": cluster_id,
            "theme": cluster_themes[cluster_id],
            "verse_count": len(cluster_verses),
            "keywords": cluster_keywords.get(cluster_id, []),
            "exemplar": cluster_exemplars.get(cluster_id),
            "centroid": {
                "x": float(centroid_x),
                "y": float(centroid_y),
                "z": float(centroid_z),
            }
        })

    visualization_data["cluster_graph"] = cluster_graph
    
    # Save visualization data
    print(f"\nSaving visualization data to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(visualization_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Saved visualization data")
    
    # Print cluster summary
    print("\nCluster Summary:")
    for cluster in visualization_data["clusters"]:
        print(f"  Cluster {cluster['id']}: {cluster['theme']} ({cluster['verse_count']} verses)")
    
    # Also create a version without embeddings for faster loading in frontend
    frontend_data = {
        "verses": [{k: v for k, v in verse.items() if k != "embedding"} for verse in visualization_data["verses"]],
        "clusters": visualization_data["clusters"],
        "metadata": visualization_data["metadata"],
    }
    
    frontend_path = OUTPUT_PATH.replace(".json", "_frontend.json")
    with open(frontend_path, "w", encoding="utf-8") as f:
        json.dump(frontend_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Saved frontend-optimized data to {frontend_path}")


if __name__ == "__main__":
    main()

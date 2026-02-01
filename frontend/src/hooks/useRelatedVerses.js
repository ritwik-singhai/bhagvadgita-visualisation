import { useMemo } from 'react';
import useStore from '../store';

/**
 * Hook to find semantically related verses using cosine similarity
 * Uses the stored cluster probabilities and embeddings
 */
export function useRelatedVerses(verseId, topK = 5) {
    const verses = useStore(state => state.verses);
    const verse = useStore(state => state.getVerseById(verseId));

    const relatedVerses = useMemo(() => {
        if (!verse || !verses.length) return [];

        // Method 1: Same cluster, different verse
        const sameClusterVerses = verses.filter(v =>
            v.cluster === verse.cluster && v.id !== verse.id
        );

        // Method 2: Use cluster probabilities if available
        const verseProbs = verse.cluster_probs || {};
        const primaryClusters = Object.entries(verseProbs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([clusterId]) => parseInt(clusterId));

        // Find verses in related clusters
        const relatedClusterVerses = verses.filter(v =>
            primaryClusters.includes(v.cluster) &&
            v.id !== verse.id &&
            v.cluster !== verse.cluster
        );

        // Combine and deduplicate
        const combined = [...sameClusterVerses, ...relatedClusterVerses];
        const seen = new Set();
        const unique = combined.filter(v => {
            if (seen.has(v.id)) return false;
            seen.add(v.id);
            return true;
        });

        // Sort by cluster probability match or random selection
        return unique.slice(0, topK).map(v => ({
            ...v,
            relationship: v.cluster === verse.cluster ? 'same_topic' : 'related_topic',
        }));
    }, [verse, verses, verseId, topK]);

    return relatedVerses;
}

export default useRelatedVerses;

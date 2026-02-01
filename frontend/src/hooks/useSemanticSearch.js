import { useState, useCallback } from 'react';
import useStore from '../store';

/**
 * Semantic Search Hook
 * 
 * Provides search functionality with proper fallback when API is unavailable.
 * Uses text similarity matching as fallback.
 */

export default function useSemanticSearch() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const verses = useStore(state => state.verses);

    /**
     * Text-based similarity search (fallback)
     * Searches through verse translations for matching text
     */
    const textSearch = useCallback((query, topK = 10) => {
        if (!verses || verses.length === 0) return [];

        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Score each verse based on word matches
        const scored = verses.map(verse => {
            const text = (verse.translation || '').toLowerCase();
            const sanskrit = (verse.sanskrit || '').toLowerCase();

            let score = 0;
            let exactMatch = 0;

            // Check for exact phrase match
            if (text.includes(queryLower)) {
                exactMatch = queryLower.length / text.length * 3;
            }

            // Score based on word matches
            queryWords.forEach(word => {
                if (text.includes(word)) {
                    score += 1;
                    // Bonus for important spiritual terms
                    if (['self', 'soul', 'atman', 'brahman', 'yoga', 'action', 'karma',
                        'dharma', 'knowledge', 'wisdom', 'peace', 'mind', 'devotion',
                        'bhakti', 'jnana', 'samkhya', 'duty', 'renunciation', 'surrender'].includes(word)) {
                        score += 0.5;
                    }
                }
                if (sanskrit.includes(word)) {
                    score += 0.5;
                }
            });

            // Normalize by query word count
            const normalizedScore = queryWords.length > 0
                ? (score / queryWords.length + exactMatch)
                : 0;

            return {
                id: verse.id,
                verse,
                similarity: Math.min(normalizedScore, 1), // Cap at 1
                score: normalizedScore
            };
        });

        // Filter and sort by score
        return scored
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }, [verses]);

    /**
     * Main search function
     * Tries API first, falls back to text search
     */
    const search = useCallback(async (query, options = {}) => {
        const { topK = 10 } = options;

        if (!query.trim()) {
            return [];
        }

        setIsLoading(true);
        setError(null);

        try {
            // Try the API first
            const response = await fetch('http://localhost:8000/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, top_k: topK }),
            });

            if (!response.ok) {
                throw new Error('API unavailable');
            }

            const data = await response.json();

            // Format API results
            const results = (data.results || []).map(r => ({
                id: r.verse_id,
                verse: verses.find(v => v.id === r.verse_id),
                similarity: r.similarity,
            })).filter(r => r.verse);

            setIsLoading(false);
            return results;

        } catch (err) {
            console.log('API unavailable, using text search fallback');

            // Use text search fallback
            const results = textSearch(query, topK);
            setIsLoading(false);
            return results;
        }
    }, [verses, textSearch]);

    return {
        search,
        isLoading,
        error,
    };
}

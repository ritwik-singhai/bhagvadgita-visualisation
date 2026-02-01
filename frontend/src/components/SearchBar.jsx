import { useState, useCallback, useRef } from 'react';
import useStore from '../store';

const API_URL = 'http://localhost:8000';

export default function SearchBar({ verses, clusters }) {
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const debounceRef = useRef(null);
  
  const {
    setSearchResults,
    setSearchQuery,
    setCameraTarget,
    searchResults
  } = useStore();

  const isDevanagari = (text) => /[\u0900-\u097F]/.test(text);

  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ā/g, 'a')
      .replace(/ī/g, 'i')
      .replace(/ū/g, 'u')
      .replace(/ṛ/g, 'r')
      .replace(/ṝ/g, 'r')
      .replace(/ṃ|ṁ/g, 'm')
      .replace(/ñ/g, 'n')
      .replace(/ṅ/g, 'n')
      .replace(/ṭ/g, 't')
      .replace(/ḍ/g, 'd')
      .replace(/ṇ/g, 'n')
      .replace(/ś|ṣ/g, 's');
  };

  // Text-based search (instant)
  const textSearch = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    const normalizedQuery = normalizeText(query);
    const isSanskritScript = isDevanagari(query);
    const matchingVerses = verses.filter((verse) => {
      const searchText = `${verse.sanskrit} ${verse.transliteration} ${verse.translation} ${verse.chapter_name} ${verse.chapter_name_english}`.toLowerCase();
      const normalizedText = normalizeText(searchText);
      if (isSanskritScript) {
        return searchText.includes(lowerQuery);
      }
      return normalizedText.includes(normalizedQuery);
    });
    return matchingVerses;
  }, [verses]);

  // Semantic search via API
  const semanticSearch = useCallback(async (query) => {
    try {
      const response = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 30 }),
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Semantic search error:', error);
      return null;
    }
  }, []);

  const handleSearch = useCallback(async (query) => {
    setInputValue(query);
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Text search is instant
    const textMatches = textSearch(query);
    const textMatchIds = textMatches.map(v => v.id);
    const textMeta = Object.fromEntries(textMatchIds.map((id) => [id, { source: 'text' }]));
    setSearchResults(textMatchIds, textMeta);

    // Move camera to first result
    if (textMatches.length > 0) {
      setCameraTarget(textMatches[0].position);
    }

    // Semantic search with debounce (if enabled)
    if (useSemanticSearch) {
      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        const semanticResults = await semanticSearch(query);
        if (semanticResults) {
          const semanticIds = semanticResults.map((r) => r.id);
          const semanticMeta = Object.fromEntries(
            semanticResults.map((r) => [
              r.id,
              { source: 'semantic', similarity: r.similarity, space: r.space }
            ])
          );

          // Combine text and semantic results
          const combined = [...new Set([...semanticIds, ...textMatchIds])];
          const combinedMeta = { ...textMeta, ...semanticMeta };
          setSearchResults(combined, combinedMeta);

          // Update camera to semantic best match
          const firstMatch = verses.find(v => v.id === semanticIds[0]);
          if (firstMatch) {
            setCameraTarget(firstMatch.position);
          }
        }
        setIsSearching(false);
      }, 500);
    }
  }, [verses, textSearch, semanticSearch, useSemanticSearch, setSearchResults, setSearchQuery, setCameraTarget]);

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
    setSearchResults([], {});
  };

  // Quick filters for common concepts
  const quickFilters = [
    { label: 'Dharma', query: 'dharma duty righteousness' },
    { label: 'Karma', query: 'action karma work' },
    { label: 'Yoga', query: 'yoga union meditation' },
    { label: 'Devotion', query: 'devotion bhakti worship' },
    { label: 'Knowledge', query: 'knowledge wisdom jnana' },
    { label: 'Soul', query: 'soul atman self immortal' },
    { label: 'Liberation', query: 'liberation moksha freedom' },
    { label: 'War', query: 'war battle fight army' },
  ];

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search verses... (e.g., 'dharma', 'karma', 'meditation')"
          className="search-input"
        />
        {inputValue && (
          <button onClick={handleClear} className="clear-button">
            ×
          </button>
        )}
        {isSearching && (
          <span className="search-spinner">⟳</span>
        )}
      </div>
      
      <div className="search-options">
        <label className="semantic-toggle">
          <input
            type="checkbox"
            checked={useSemanticSearch}
            onChange={(e) => setUseSemanticSearch(e.target.checked)}
          />
          AI-powered semantic search
        </label>
      </div>
      
      {searchResults.length > 0 && (
        <div className="search-results-count">
          Found {searchResults.length} matching verses
          {isSearching && ' (searching...)'}
        </div>
      )}

      <div className="quick-filters">
        {quickFilters.map((filter) => (
          <button
            key={filter.label}
            onClick={() => handleSearch(filter.query)}
            className="quick-filter-button"
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

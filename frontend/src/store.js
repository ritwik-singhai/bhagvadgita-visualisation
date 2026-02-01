import { create } from 'zustand';
import versesData from './data/verses.json';

/**
 * Central application state
 * Manages verses, search, journeys, and UI preferences
 */
const useStore = create((set, get) => ({
  // ═══════════════════════════════════════════════════════════
  // VERSE DATA
  // ═══════════════════════════════════════════════════════════

  verses: versesData.verses || [],
  clusters: versesData.clusters || [],
  hierarchy: versesData.hierarchy || {},
  metadata: versesData.metadata || {},

  // Get a verse by ID
  getVerseById: (id) => {
    return get().verses.find(v => v.id === id);
  },

  // Get verses by cluster
  getVersesByCluster: (clusterId) => {
    return get().verses.filter(v => v.cluster === clusterId);
  },

  // Get cluster info
  getClusterById: (id) => {
    return get().clusters.find(c => c.id === id);
  },

  // ═══════════════════════════════════════════════════════════
  // SELECTED VERSE
  // ═══════════════════════════════════════════════════════════

  selectedVerse: null,
  setSelectedVerse: (verse) => set({ selectedVerse: verse }),
  clearSelectedVerse: () => set({ selectedVerse: null }),

  // ═══════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════

  searchQuery: '',
  searchResults: [],
  searchResultsMeta: {},
  isSearching: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results, meta = {}) => set({
    searchResults: results,
    searchResultsMeta: meta
  }),
  setIsSearching: (isSearching) => set({ isSearching }),
  clearSearch: () => set({
    searchQuery: '',
    searchResults: [],
    searchResultsMeta: {},
    isSearching: false
  }),

  // ═══════════════════════════════════════════════════════════
  // JOURNEY STATE
  // ═══════════════════════════════════════════════════════════

  currentJourney: null,
  journeyProgress: 0,

  setCurrentJourney: (journey) => set({
    currentJourney: journey,
    journeyProgress: 0
  }),
  setJourneyProgress: (progress) => set({ journeyProgress: progress }),
  clearJourney: () => set({ currentJourney: null, journeyProgress: 0 }),

  // ═══════════════════════════════════════════════════════════
  // UI PREFERENCES
  // ═══════════════════════════════════════════════════════════

  theme: 'system', // 'light', 'dark', 'system'
  showSanskrit: true,
  showTransliteration: true,

  setTheme: (theme) => set({ theme }),
  toggleSanskrit: () => set(state => ({ showSanskrit: !state.showSanskrit })),
  toggleTransliteration: () => set(state => ({
    showTransliteration: !state.showTransliteration
  })),

  // ═══════════════════════════════════════════════════════════
  // BOOKMARKS
  // ═══════════════════════════════════════════════════════════

  bookmarks: JSON.parse(localStorage.getItem('gita-bookmarks') || '[]'),

  addBookmark: (verseId) => {
    const bookmarks = [...get().bookmarks, verseId];
    localStorage.setItem('gita-bookmarks', JSON.stringify(bookmarks));
    set({ bookmarks });
  },

  removeBookmark: (verseId) => {
    const bookmarks = get().bookmarks.filter(id => id !== verseId);
    localStorage.setItem('gita-bookmarks', JSON.stringify(bookmarks));
    set({ bookmarks });
  },

  isBookmarked: (verseId) => get().bookmarks.includes(verseId),

  // ═══════════════════════════════════════════════════════════
  // 3D EXPLORATION STATE (for Explore page)
  // ═══════════════════════════════════════════════════════════

  cameraTarget: null,
  hoveredVerse: null,
  showClusterLabels: true,

  setCameraTarget: (target) => set({ cameraTarget: target }),
  setHoveredVerse: (verse) => set({ hoveredVerse: verse }),
  toggleClusterLabels: () => set(state => ({
    showClusterLabels: !state.showClusterLabels
  })),
}));

export default useStore;

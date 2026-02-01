import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useStore from '../store';
import useSemanticSearch from '../hooks/useSemanticSearch';
import './Home.css';

/**
 * Home Page - Semantic Visualization Showcase
 * 
 * Explore the semantic visualization of the Bhagavad Gita.
 * Show the data, the clusters, the connections.
 */

function Home() {
    const navigate = useNavigate();
    const verses = useStore(state => state.verses);
    const clusters = useStore(state => state.clusters);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const { search, isLoading } = useSemanticSearch();

    // Handle search
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        const results = await search(searchQuery, { topK: 12 });
        setSearchResults(results);
        setShowResults(true);
    };

    // Navigate to verse
    const handleVerseClick = (verseId) => {
        navigate(`/read/${verseId}`);
    };

    // Key stats
    const stats = {
        verses: verses.length || 701,
        clusters: clusters.length || 21,
        dimensions: 3072,
        chapters: 18,
    };

    return (
        <div className="home-page">
            {/* Animated Background */}
            <div className="bg-gradient" />
            <div className="bg-glow" />

            {/* Hero Section */}
            <header className="hero">
                <div className="hero-content">
                    {/* Badge */}
                    <div className="hero-badge animate-fade-in">
                        <span className="badge-dot" />
                        Semantic NLP Visualization
                    </div>

                    {/* Title */}
                    <h1 className="hero-title animate-fade-in-up">
                        <span className="hero-sanskrit font-sanskrit">भगवद्गीता</span>
                        <span className="hero-english">Bhagavad Gita</span>
                        <span className="hero-subtitle">701 Verses in Semantic Space</span>
                    </h1>

                    {/* Stats Row */}
                    <div className="hero-stats animate-fade-in-up">
                        <div className="stat">
                            <span className="stat-value">{stats.verses}</span>
                            <span className="stat-label">Verses</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat">
                            <span className="stat-value">{stats.clusters}</span>
                            <span className="stat-label">Semantic Clusters</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat">
                            <span className="stat-value">{stats.dimensions.toLocaleString()}</span>
                            <span className="stat-label">Embedding Dims</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat">
                            <span className="stat-value">{stats.chapters}</span>
                            <span className="stat-label">Chapters</span>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="hero-actions animate-fade-in-up">
                        <Link to="/explore" className="btn btn-primary btn-lg">
                            <span>Explore 3D Space</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <a href="#search" className="btn btn-secondary btn-lg">
                            Semantic Search
                        </a>
                    </div>
                </div>

                {/* 3D Preview */}
                <div className="hero-preview">
                    <div className="preview-frame">
                        <div className="preview-glow" />
                        <div className="preview-dots">
                            {/* Animated cluster preview dots */}
                            {Array.from({ length: 50 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="preview-dot"
                                    style={{
                                        left: `${10 + Math.random() * 80}%`,
                                        top: `${10 + Math.random() * 80}%`,
                                        backgroundColor: `var(--cluster-${i % 12})`,
                                        animationDelay: `${Math.random() * 3}s`,
                                        transform: `scale(${0.5 + Math.random() * 0.8})`,
                                    }}
                                />
                            ))}
                        </div>
                        <Link to="/explore" className="preview-cta">
                            <span>Enter Visualization</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section className="features">
                <div className="container">
                    <h2 className="section-title">Semantic Analysis</h2>
                    <p className="section-subtitle">
                        Verses clustered by meaning and visualized in 3D
                    </p>

                    <div className="feature-grid">
                        <div className="feature-card card">
                            <div className="feature-icon" style={{ background: 'var(--gradient-card)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="6" />
                                    <circle cx="12" cy="12" r="2" />
                                </svg>
                            </div>
                            <h3>Semantic Embeddings</h3>
                            <p>Captures meaning across Sanskrit and English</p>
                        </div>

                        <div className="feature-card card">
                            <div className="feature-icon" style={{ background: 'var(--gradient-card)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-secondary)" strokeWidth="2">
                                    <circle cx="6" cy="6" r="3" />
                                    <circle cx="18" cy="18" r="3" />
                                    <circle cx="18" cy="6" r="3" />
                                    <circle cx="6" cy="18" r="3" />
                                    <path d="M6 9v6M18 9v6M9 6h6M9 18h6" />
                                </svg>
                            </div>
                            <h3>Thematic Groups</h3>
                            <p>{clusters.length} themes discovered automatically</p>
                        </div>

                        <div className="feature-card card">
                            <div className="feature-icon" style={{ background: 'var(--gradient-card)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-tertiary)" strokeWidth="2">
                                    <polygon points="12,2 2,7 12,12 22,7" />
                                    <polyline points="2,17 12,22 22,17" />
                                    <polyline points="2,12 12,17 22,12" />
                                </svg>
                            </div>
                            <h3>3D Visualization</h3>
                            <p>See relationships between verses in 3D</p>
                        </div>

                        <div className="feature-card card">
                            <div className="feature-icon" style={{ background: 'var(--gradient-card)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                            </div>
                            <h3>Topic Labels</h3>
                            <p>Key themes identified for each group</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search Section */}
            <section id="search" className="search-section">
                <div className="container">
                    <h2 className="section-title">Semantic Search</h2>
                    <p className="section-subtitle">
                        Find verses by meaning, not just keywords
                    </p>

                    <form className="search-form" onSubmit={handleSearch}>
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for verses by meaning..."
                            />
                            <button type="submit" className="search-btn" disabled={isLoading}>
                                {isLoading ? (
                                    <span className="search-loading" />
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="M21 21l-4.35-4.35" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Search Results */}
                    {showResults && (
                        <div className="search-results animate-fade-in-up">
                            <div className="results-header">
                                <span className="results-count">{searchResults.length} results</span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => { setShowResults(false); setSearchResults([]); }}
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="results-grid">
                                {searchResults.map((result, i) => {
                                    const verse = result.verse || verses.find(v => v.id === result.id);
                                    if (!verse) return null;

                                    return (
                                        <article
                                            key={result.id}
                                            className="result-card card card-interactive"
                                            onClick={() => handleVerseClick(result.id)}
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <header className="result-header">
                                                <span className="result-ref">
                                                    BG {verse.chapter}.{verse.verse}
                                                </span>
                                                {result.similarity != null && (
                                                    <span className="result-score badge">
                                                        {(result.similarity * 100).toFixed(1)}% match
                                                    </span>
                                                )}
                                            </header>

                                            {verse.topic && (
                                                <span
                                                    className="result-topic badge badge-cluster"
                                                    style={{ '--cluster-color': `var(--cluster-${verse.cluster % 12})` }}
                                                >
                                                    {verse.topic}
                                                </span>
                                            )}

                                            <p className="result-text">
                                                {verse.translation?.slice(0, 150)}{verse.translation?.length > 150 ? '...' : ''}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Cluster Preview */}
            <section className="clusters-section">
                <div className="container">
                    <h2 className="section-title">Discovered Themes</h2>
                    <p className="section-subtitle">
                        {clusters.length} semantic clusters identified through unsupervised learning
                    </p>

                    <div className="cluster-grid">
                        {clusters.slice(0, 12).map((cluster, i) => {
                            const count = verses.filter(v => v.cluster === cluster.id).length;
                            return (
                                <div
                                    key={cluster.id}
                                    className="cluster-chip"
                                    style={{ '--cluster-color': `var(--cluster-${i % 12})` }}
                                >
                                    <span
                                        className="cluster-dot"
                                        style={{ background: `var(--cluster-${i % 12})` }}
                                    />
                                    <span className="cluster-label">
                                        {cluster.label || cluster.theme || `Cluster ${cluster.id}`}
                                    </span>
                                    <span className="cluster-count font-mono">{count}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="clusters-cta">
                        <Link to="/explore" className="btn btn-primary">
                            Explore All Clusters in 3D
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="container">
                    <p className="footer-tech">
                        Built with OpenAI Embeddings · HDBSCAN · UMAP · Three.js · React
                    </p>
                    <p className="footer-sanskrit font-sanskrit">
                        सर्वे भवन्तु सुखिनः
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default Home;

import { lazy, Suspense, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useStore from '../store';
import './Explore.css';

// Lazy load the heavy 3D components
const Scene = lazy(() => import('../components/Scene'));
const VerseDetailPanel = lazy(() => import('../components/VerseDetailLegacy'));
const Legend = lazy(() => import('../components/ClusterLegend'));

/**
 * Explore Page - 3D Semantic Visualization
 * 
 * The crown jewel: 701 verses visualized in semantic space.
 * Stunning, interactive, awe-inspiring.
 */

function Explore() {
    const navigate = useNavigate();
    const selectedVerse = useStore(state => state.selectedVerse);
    const setSelectedVerse = useStore(state => state.setSelectedVerse);
    const showClusterLabels = useStore(state => state.showClusterLabels);
    const toggleClusterLabels = useStore(state => state.toggleClusterLabels);
    const verses = useStore(state => state.verses);
    const clusters = useStore(state => state.clusters);

    const [showOnboarding, setShowOnboarding] = useState(
        !localStorage.getItem('explore-onboarding-seen')
    );
    const [viewMode, setViewMode] = useState('3d'); // '3d' | 'stats'

    const handleVerseClick = (verse) => {
        setSelectedVerse(verse);
    };

    const handleReadVerse = () => {
        if (selectedVerse) {
            navigate(`/read/${selectedVerse.id}`);
        }
    };

    const dismissOnboarding = () => {
        localStorage.setItem('explore-onboarding-seen', 'true');
        setShowOnboarding(false);
    };

    // Stats
    const stats = {
        verses: verses.length,
        clusters: clusters.length,
        dimensions: 3072,
    };

    return (
        <div className="explore-page">
            {/* Header */}
            <header className="explore-header">
                <div className="header-left">
                    <Link to="/" className="back-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </Link>
                </div>

                <div className="header-center">
                    <h1 className="explore-title">Semantic Space</h1>
                    <div className="explore-stats">
                        <span className="stat-item">
                            <span className="stat-num font-mono">{stats.verses}</span> verses
                        </span>
                        <span className="stat-sep">·</span>
                        <span className="stat-item">
                            <span className="stat-num font-mono">{stats.clusters}</span> clusters
                        </span>
                        <span className="stat-sep">·</span>
                        <span className="stat-item">
                            <span className="stat-num font-mono">{stats.dimensions.toLocaleString()}</span> dims
                        </span>
                    </div>
                </div>

                <div className="header-right">
                    <button
                        className={`control-btn ${showClusterLabels ? 'active' : ''}`}
                        onClick={toggleClusterLabels}
                        title="Toggle cluster labels"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Cluster Labels</span>
                    </button>
                </div>
            </header>

            {/* Onboarding Modal */}
            {showOnboarding && (
                <div className="onboarding-overlay">
                    <div className="onboarding-modal animate-fade-in">
                        <div className="onboarding-icon animate-float">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                        </div>

                        <h2>Exploring the Semantic Space</h2>
                        <p className="onboarding-desc">
                            Each point represents a verse from the Bhagavad Gita.
                            Verses are positioned based on their <strong>semantic meaning</strong> —
                            similar teachings cluster together.
                        </p>

                        <div className="onboarding-controls">
                            <div className="control-item">
                                <div className="control-icon">🖱️</div>
                                <div>
                                    <strong>Drag</strong>
                                    <span>Rotate the view</span>
                                </div>
                            </div>
                            <div className="control-item">
                                <div className="control-icon">🔍</div>
                                <div>
                                    <strong>Scroll</strong>
                                    <span>Zoom in/out</span>
                                </div>
                            </div>
                            <div className="control-item">
                                <div className="control-icon">👆</div>
                                <div>
                                    <strong>Click</strong>
                                    <span>Select a verse</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={dismissOnboarding}
                        >
                            Start Exploring
                        </button>
                    </div>
                </div>
            )}

            {/* 3D Canvas */}
            <div className="explore-canvas">
                <Suspense fallback={<ExploreLoader />}>
                    <Scene onVerseClick={handleVerseClick} />
                </Suspense>
            </div>

            {/* Legend Panel */}
            {clusters?.length > 0 && (
                <aside className="explore-legend">
                    <Suspense fallback={null}>
                        <Legend />
                    </Suspense>
                </aside>
            )}

            {/* Verse Detail Panel */}
            {selectedVerse && (
                <aside className="explore-detail animate-fade-in">
                    <Suspense fallback={null}>
                        <VerseDetailPanel
                            verse={selectedVerse}
                            onClose={() => setSelectedVerse(null)}
                            onRead={handleReadVerse}
                        />
                    </Suspense>
                </aside>
            )}

            {/* Bottom Info Bar */}
            <div className="explore-info-bar">
                <div className="info-item">
                    <span className="info-label">Model:</span>
                    <span className="info-value font-mono">text-embedding-3-large</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Clustering:</span>
                    <span className="info-value font-mono">HDBSCAN</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Projection:</span>
                    <span className="info-value font-mono">UMAP-3D</span>
                </div>
            </div>
        </div>
    );
}

function ExploreLoader() {
    return (
        <div className="explore-loader">
            <div className="loader-content">
                <div className="loader-ring">
                    <div className="ring-dot" style={{ '--i': 0 }} />
                    <div className="ring-dot" style={{ '--i': 1 }} />
                    <div className="ring-dot" style={{ '--i': 2 }} />
                    <div className="ring-dot" style={{ '--i': 3 }} />
                    <div className="ring-dot" style={{ '--i': 4 }} />
                    <div className="ring-dot" style={{ '--i': 5 }} />
                </div>
                <p className="loader-text">Loading 701 verse embeddings...</p>
            </div>
        </div>
    );
}

export default Explore;

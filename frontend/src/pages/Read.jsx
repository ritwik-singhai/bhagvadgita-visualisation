import { useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import useStore from '../store';
import useRelatedVerses from '../hooks/useRelatedVerses';
import './Read.css';

/**
 * Read Page - Deep Verse Engagement
 * 
 * The heart of the experience. One verse, fully presented,
 * with space for understanding and connection.
 */

function Read() {
    const { verseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const getVerseById = useStore(state => state.getVerseById);
    const verses = useStore(state => state.verses);
    const getClusterById = useStore(state => state.getClusterById);
    const bookmarks = useStore(state => state.bookmarks);
    const addBookmark = useStore(state => state.addBookmark);
    const removeBookmark = useStore(state => state.removeBookmark);

    const verse = getVerseById(verseId);
    const relatedVerses = useRelatedVerses(verseId, 5);
    const cluster = verse ? getClusterById(verse.cluster) : null;
    const isBookmarked = bookmarks.includes(verseId);

    // Scroll to top on verse change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [verseId]);

    if (!verse) {
        return (
            <div className="read-page read-not-found">
                <div className="not-found-content">
                    <span className="not-found-icon">🔍</span>
                    <h1>Verse not found</h1>
                    <p>The verse you're looking for doesn't exist.</p>
                    <Link to="/" className="btn btn-primary">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    // Find prev/next verses in chapter
    const chapterVerses = verses
        .filter(v => v.chapter === verse.chapter)
        .sort((a, b) => a.verse - b.verse);
    const currentIndex = chapterVerses.findIndex(v => v.id === verse.id);
    const prevVerse = currentIndex > 0 ? chapterVerses[currentIndex - 1] : null;
    const nextVerse = currentIndex < chapterVerses.length - 1 ? chapterVerses[currentIndex + 1] : null;

    const handleBookmarkToggle = () => {
        if (isBookmarked) {
            removeBookmark(verseId);
        } else {
            addBookmark(verseId);
        }
    };

    return (
        <div className="read-page">
            {/* Header Navigation */}
            <header className="read-header">
                <button
                    className="read-back btn btn-ghost"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <div className="read-actions">
                    <button
                        className={`read-bookmark btn btn-ghost ${isBookmarked ? 'bookmarked' : ''}`}
                        onClick={handleBookmarkToggle}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                        {isBookmarked ? '★' : '☆'}
                    </button>

                    <Link
                        to={`/contemplate/${verseId}`}
                        className="btn btn-primary"
                    >
                        Contemplate
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="read-main">
                <article className="verse-full">
                    {/* Verse Reference */}
                    <header className="verse-full-header">
                        <h1 className="verse-full-ref">
                            Chapter {verse.chapter}, Verse {verse.verse}
                        </h1>
                        {verse.topic && (
                            <span
                                className="verse-full-topic"
                                style={{ background: `var(--cluster-${verse.cluster % 10})` }}
                            >
                                {verse.topic}
                            </span>
                        )}
                    </header>

                    {/* Sanskrit */}
                    <section className="verse-section verse-sanskrit-section">
                        <h2 className="sr-only">Sanskrit</h2>
                        <p className="verse-full-sanskrit sanskrit-display">
                            {verse.sanskrit}
                        </p>
                    </section>

                    {/* Transliteration */}
                    {verse.transliteration && (
                        <section className="verse-section verse-transliteration-section">
                            <h2 className="verse-section-label">Transliteration</h2>
                            <p className="verse-full-transliteration transliteration">
                                {verse.transliteration}
                            </p>
                        </section>
                    )}

                    {/* Translation */}
                    <section className="verse-section verse-translation-section">
                        <h2 className="verse-section-label">Translation</h2>
                        <blockquote className="verse-full-translation translation-large">
                            {verse.translation}
                        </blockquote>
                        {verse.translator && (
                            <cite className="verse-translator">
                                — {verse.translator}
                            </cite>
                        )}
                    </section>

                    {/* Confidence/Cluster Info */}
                    {verse.cluster_probability != null && (
                        <section className="verse-meta">
                            <div className="verse-meta-item">
                                <span className="verse-meta-label">Topic Confidence</span>
                                <span className="verse-meta-value">
                                    {Math.round(verse.cluster_probability * 100)}%
                                </span>
                            </div>
                        </section>
                    )}
                </article>

                {/* Related Verses */}
                {relatedVerses.length > 0 && (
                    <section className="related-section">
                        <h2 className="related-title">Related Verses</h2>
                        <p className="related-subtitle">
                            Others on this theme
                        </p>

                        <div className="related-list">
                            {relatedVerses.map(related => (
                                <Link
                                    key={related.id}
                                    to={`/read/${related.id}`}
                                    className="related-item"
                                >
                                    <span className="related-ref">
                                        BG {related.chapter}.{related.verse}
                                    </span>
                                    <p className="related-translation">
                                        {related.translation?.slice(0, 80)}...
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Chapter Navigation */}
                <nav className="verse-navigation">
                    {prevVerse ? (
                        <Link
                            to={`/read/${prevVerse.id}`}
                            className="nav-link nav-prev"
                        >
                            <span className="nav-direction">← Previous</span>
                            <span className="nav-ref">BG {prevVerse.chapter}.{prevVerse.verse}</span>
                        </Link>
                    ) : (
                        <div className="nav-placeholder" />
                    )}

                    {nextVerse && (
                        <Link
                            to={`/read/${nextVerse.id}`}
                            className="nav-link nav-next"
                        >
                            <span className="nav-direction">Next →</span>
                            <span className="nav-ref">BG {nextVerse.chapter}.{nextVerse.verse}</span>
                        </Link>
                    )}
                </nav>
            </main>

            {/* Bottom Actions */}
            <footer className="read-footer">
                <Link to="/" className="footer-link">
                    ← Return to Home
                </Link>
                <Link to="/explore" className="footer-link">
                    Explore All Verses →
                </Link>
            </footer>
        </div>
    );
}

export default Read;

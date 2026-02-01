import './VerseCard.css';

/**
 * Verse Card Component
 * 
 * Compact verse display for grids and lists.
 * Shows Sanskrit, translation snippet, and topic.
 */

function VerseCard({ verse, onClick, similarity, delay = 0 }) {
    if (!verse) return null;

    // Truncate translation for card view
    const truncatedTranslation = verse.translation && verse.translation.length > 120
        ? verse.translation.slice(0, 120) + '...'
        : verse.translation;

    return (
        <article
            className="verse-card card card-interactive"
            onClick={() => onClick?.(verse.id)}
            style={{ animationDelay: `${delay}ms` }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.(verse.id)}
        >
            {/* Header */}
            <header className="verse-card-header">
                <span className="verse-card-ref">
                    BG {verse.chapter}.{verse.verse}
                </span>
                {similarity != null && (
                    <span className="verse-card-match">
                        {Math.round(similarity * 100)}% match
                    </span>
                )}
            </header>

            {/* Sanskrit */}
            <p className="verse-card-sanskrit sanskrit-inline">
                {verse.sanskrit?.slice(0, 60)}{verse.sanskrit?.length > 60 ? '...' : ''}
            </p>

            {/* Translation */}
            <p className="verse-card-translation">
                {truncatedTranslation}
            </p>

            {/* Footer */}
            <footer className="verse-card-footer">
                {verse.topic && (
                    <span
                        className="verse-card-topic"
                        style={{
                            '--topic-color': `var(--cluster-${verse.cluster % 10})`
                        }}
                    >
                        {verse.topic}
                    </span>
                )}
            </footer>
        </article>
    );
}

export default VerseCard;

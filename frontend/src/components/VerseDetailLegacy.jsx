import { Link } from 'react-router-dom';
import './VerseDetailLegacy.css';

/**
 * Verse Detail Panel for Explore Mode
 * A compact detail view for the 3D exploration sidebar
 */

function VerseDetailLegacy({ verse, onClose, onRead }) {
    if (!verse) return null;

    return (
        <div className="verse-detail-legacy">
            {/* Header */}
            <header className="vdl-header">
                <h2 className="vdl-ref">
                    BG {verse.chapter}.{verse.verse}
                </h2>
                <button
                    className="vdl-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ✕
                </button>
            </header>

            {/* Topic */}
            {verse.topic && (
                <div
                    className="vdl-topic"
                    style={{ background: `var(--cluster-${verse.cluster % 10})` }}
                >
                    {verse.topic}
                </div>
            )}

            {/* Sanskrit */}
            <section className="vdl-sanskrit">
                {verse.sanskrit}
            </section>

            {/* Translation */}
            <section className="vdl-translation">
                {verse.translation}
            </section>

            {/* Confidence */}
            {verse.cluster_probability != null && (
                <div className="vdl-meta">
                    Topic confidence: {Math.round(verse.cluster_probability * 100)}%
                </div>
            )}

            {/* Actions */}
            <div className="vdl-actions">
                <button
                    className="btn btn-primary btn-lg w-full"
                    onClick={onRead}
                >
                    Read & Contemplate
                </button>
                <Link
                    to={`/contemplate/${verse.id}`}
                    className="btn btn-secondary w-full"
                >
                    Contemplate Now
                </Link>
            </div>
        </div>
    );
}

export default VerseDetailLegacy;

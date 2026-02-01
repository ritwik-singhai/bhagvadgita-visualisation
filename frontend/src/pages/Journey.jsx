import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import useStore from '../store';
import './Journey.css';

/**
 * Journey Page
 * 
 * Guided thematic journeys through the Gita.
 * Each journey is a curated path through related verses.
 */

const JOURNEYS = {
    'karma-yoga': {
        id: 'karma-yoga',
        title: 'Path of Action',
        sanskrit: 'कर्मयोग',
        description: 'Understanding selfless action and the nature of duty',
        searchTerms: ['action', 'karma', 'duty', 'work'],
        topicKeywords: ['action', 'karma', 'yoga'],
    },
    'jnana-yoga': {
        id: 'jnana-yoga',
        title: 'Path of Knowledge',
        sanskrit: 'ज्ञानयोग',
        description: 'The wisdom of self-inquiry and discernment',
        searchTerms: ['knowledge', 'wisdom', 'self', 'atman'],
        topicKeywords: ['knowledge', 'self', 'field'],
    },
    'bhakti-yoga': {
        id: 'bhakti-yoga',
        title: 'Path of Devotion',
        sanskrit: 'भक्तियोग',
        description: 'Love, surrender, and the way of the heart',
        searchTerms: ['devotion', 'worship', 'love', 'surrender'],
        topicKeywords: ['worship', 'devotion', 'faith'],
    },
    'gunas': {
        id: 'gunas',
        title: 'Three Qualities',
        sanskrit: 'त्रिगुण',
        description: 'Understanding sattva, rajas, and tamas',
        searchTerms: ['sattva', 'rajas', 'tamas', 'gunas'],
        topicKeywords: ['sattva', 'rajas', 'tamas'],
    },
    'meditation': {
        id: 'meditation',
        title: 'Meditation & Self-Control',
        sanskrit: 'ध्यान',
        description: 'Practices for stilling the mind',
        searchTerms: ['meditation', 'yoga', 'mind', 'control'],
        topicKeywords: ['yogi', 'self', 'mind', 'senses'],
    },
    'eternal-soul': {
        id: 'eternal-soul',
        title: 'The Eternal Soul',
        sanskrit: 'आत्मन्',
        description: 'Understanding your true, imperishable nature',
        searchTerms: ['soul', 'eternal', 'imperishable', 'death'],
        topicKeywords: ['self', 'beings', 'nature'],
    },
};

function Journey() {
    const { journeyId } = useParams();
    const navigate = useNavigate();
    const verses = useStore(state => state.verses);

    const journey = JOURNEYS[journeyId];

    // Find verses matching this journey
    const journeyVerses = useMemo(() => {
        if (!journey || !verses.length) return [];

        return verses
            .filter(verse => {
                // Match by topic keywords
                const topic = (verse.topic || '').toLowerCase();
                const matchesTopic = journey.topicKeywords.some(kw =>
                    topic.includes(kw.toLowerCase())
                );

                // Match by translation content
                const translation = (verse.translation || '').toLowerCase();
                const matchesContent = journey.searchTerms.some(term =>
                    translation.includes(term.toLowerCase())
                );

                return matchesTopic || matchesContent;
            })
            .slice(0, 20); // Limit to 20 verses per journey
    }, [journey, verses]);

    if (!journey) {
        return (
            <div className="journey-page">
                <div className="journey-not-found">
                    <h1>Journey not found</h1>
                    <Link to="/" className="btn btn-primary">Return Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="journey-page">
            {/* Header */}
            <header className="journey-header">
                <button
                    className="journey-back"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>
            </header>

            {/* Journey Info */}
            <section className="journey-hero">
                <span className="journey-sanskrit">{journey.sanskrit}</span>
                <h1 className="journey-title">{journey.title}</h1>
                <p className="journey-description">{journey.description}</p>
                <p className="journey-count">{journeyVerses.length} verses</p>
            </section>

            {/* Verse List */}
            <main className="journey-main">
                <div className="journey-verses">
                    {journeyVerses.map((verse, index) => (
                        <article
                            key={verse.id}
                            className="journey-verse"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <Link to={`/read/${verse.id}`} className="journey-verse-link">
                                <header className="journey-verse-header">
                                    <span className="journey-verse-number">{index + 1}</span>
                                    <span className="journey-verse-ref">
                                        BG {verse.chapter}.{verse.verse}
                                    </span>
                                </header>
                                <p className="journey-verse-text">
                                    {verse.translation?.slice(0, 150)}
                                    {verse.translation?.length > 150 ? '...' : ''}
                                </p>
                            </Link>
                        </article>
                    ))}
                </div>
            </main>

            {/* Other Journeys */}
            <section className="other-journeys">
                <h2>Other Journeys</h2>
                <div className="journey-links">
                    {Object.values(JOURNEYS)
                        .filter(j => j.id !== journeyId)
                        .slice(0, 3)
                        .map(j => (
                            <Link
                                key={j.id}
                                to={`/journey/${j.id}`}
                                className="journey-link-card"
                            >
                                <span className="journey-link-sanskrit">{j.sanskrit}</span>
                                <span className="journey-link-title">{j.title}</span>
                            </Link>
                        ))}
                </div>
            </section>
        </div>
    );
}

export default Journey;

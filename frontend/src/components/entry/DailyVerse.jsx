import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import './DailyVerse.css';

/**
 * Daily Verse Component
 * 
 * A featured verse that changes based on the day.
 * Uses a deterministic selection based on date to ensure consistency.
 */

function DailyVerse({ verses }) {
    const dailyVerse = useMemo(() => {
        if (!verses || verses.length === 0) return null;

        // Use day of year for consistent daily selection
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        // Select verse based on day
        const index = dayOfYear % verses.length;
        return verses[index];
    }, [verses]);

    if (!dailyVerse) return null;

    return (
        <div className="daily-verse">
            <div className="daily-verse-header">
                <span className="daily-verse-label">Today's Verse</span>
                <span className="daily-verse-ref">BG {dailyVerse.chapter}.{dailyVerse.verse}</span>
            </div>

            <blockquote className="daily-verse-content">
                <p className="daily-verse-sanskrit sanskrit-verse">
                    {dailyVerse.sanskrit}
                </p>
                <p className="daily-verse-translation">
                    "{dailyVerse.translation}"
                </p>
            </blockquote>

            <div className="daily-verse-footer">
                {dailyVerse.topic && (
                    <span
                        className="daily-verse-topic"
                        style={{ background: `var(--cluster-${dailyVerse.cluster % 10})` }}
                    >
                        {dailyVerse.topic}
                    </span>
                )}

                <Link
                    to={`/read/${dailyVerse.id}`}
                    className="daily-verse-link"
                >
                    Read & Contemplate →
                </Link>
            </div>
        </div>
    );
}

export default DailyVerse;

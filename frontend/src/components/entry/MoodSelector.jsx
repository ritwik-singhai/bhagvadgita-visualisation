import './MoodSelector.css';

/**
 * Mood/Intent Selector
 * 
 * Visual cards for common states that bring seekers to the Gita.
 * Each mood maps to a semantic search query to find relevant verses.
 */

const MOODS = [
    {
        id: 'anxiety',
        emoji: '🌊',
        title: 'Finding Peace',
        description: 'I feel anxious or overwhelmed',
        color: 'var(--cluster-jnana)',
    },
    {
        id: 'purpose',
        emoji: '🧭',
        title: 'Seeking Purpose',
        description: "What should I do with my life?",
        color: 'var(--cluster-dharma)',
    },
    {
        id: 'loss',
        emoji: '🕯️',
        title: 'Facing Loss',
        description: "I've lost someone or something dear",
        color: 'var(--cluster-atman)',
    },
    {
        id: 'duty',
        emoji: '⚖️',
        title: 'Right Action',
        description: 'Facing a difficult decision',
        color: 'var(--cluster-karma)',
    },
    {
        id: 'devotion',
        emoji: '🙏',
        title: 'Seeking Devotion',
        description: 'I want to deepen my connection',
        color: 'var(--cluster-bhakti)',
    },
    {
        id: 'knowledge',
        emoji: '💡',
        title: 'Understanding Self',
        description: 'Who am I? What is real?',
        color: 'var(--cluster-yoga)',
    },
];

function MoodSelector({ onSelect }) {
    return (
        <div className="mood-selector">
            <div className="mood-grid">
                {MOODS.map((mood, index) => (
                    <button
                        key={mood.id}
                        className="mood-card"
                        onClick={() => onSelect(mood)}
                        style={{
                            '--mood-color': mood.color,
                            animationDelay: `${index * 50}ms`,
                        }}
                    >
                        <span className="mood-emoji">{mood.emoji}</span>
                        <strong className="mood-title">{mood.title}</strong>
                        <p className="mood-description">{mood.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default MoodSelector;

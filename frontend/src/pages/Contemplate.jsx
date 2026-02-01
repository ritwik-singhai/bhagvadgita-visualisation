import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useStore from '../store';
import './Contemplate.css';

/**
 * Contemplation Mode
 * 
 * Full-screen meditative experience with a single verse.
 * Minimal UI, optional timer, deep focus.
 * 
 * "Be still and know..."
 */

const TIMER_OPTIONS = [
    { value: 60, label: '1 min' },
    { value: 180, label: '3 min' },
    { value: 300, label: '5 min' },
    { value: 600, label: '10 min' },
    { value: null, label: 'Open' },
];

function Contemplate() {
    const { verseId } = useParams();
    const navigate = useNavigate();

    const getVerseById = useStore(state => state.getVerseById);
    const verse = getVerseById(verseId);

    const [timerDuration, setTimerDuration] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showTranslation, setShowTranslation] = useState(false);
    const [breathePhase, setBreathePhase] = useState('inhale');

    // Generate a contemplation prompt
    const contemplationPrompt = useCallback(() => {
        const prompts = [
            "What does this wisdom mean in your life right now?",
            "Where in your body do you feel resistance to this teaching?",
            "If you fully accepted this truth, what would change?",
            "Who in your life needs to hear this?",
            "What attachment is this verse asking you to examine?",
            "How would the wisest version of yourself respond to this?",
            "What fear is this verse addressing?",
            "Close your eyes and let these words settle...",
        ];
        const dayIndex = new Date().getDate() % prompts.length;
        return prompts[dayIndex];
    }, []);

    // Timer effect
    useEffect(() => {
        if (!isTimerActive || timeRemaining === null) return;

        if (timeRemaining <= 0) {
            setIsTimerActive(false);
            return;
        }

        const interval = setInterval(() => {
            setTimeRemaining(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isTimerActive, timeRemaining]);

    // Breathing animation
    useEffect(() => {
        const interval = setInterval(() => {
            setBreathePhase(prev => prev === 'inhale' ? 'exhale' : 'inhale');
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Hide controls after inactivity
    useEffect(() => {
        if (!showControls) return;

        const timeout = setTimeout(() => {
            if (isTimerActive) {
                setShowControls(false);
            }
        }, 5000);

        return () => clearTimeout(timeout);
    }, [showControls, isTimerActive]);

    // Start timer
    const startTimer = (seconds) => {
        setTimerDuration(seconds);
        setTimeRemaining(seconds);
        setIsTimerActive(true);
        setShowControls(false);

        // Show translation after a moment
        setTimeout(() => setShowTranslation(true), 3000);
    };

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle exit
    const handleExit = () => {
        navigate(`/read/${verseId}`);
    };

    // Show controls on interaction
    const handleInteraction = () => {
        setShowControls(true);
    };

    if (!verse) {
        return (
            <div className="contemplate-page">
                <div className="contemplate-error">
                    <p>Verse not found</p>
                    <Link to="/" className="btn btn-primary">Return Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className="contemplate-page"
            onClick={handleInteraction}
            onMouseMove={handleInteraction}
        >
            {/* Breathing Guide */}
            <div
                className={`breathe-guide ${breathePhase}`}
                aria-hidden="true"
            />

            {/* Controls (fade in/out) */}
            <div className={`contemplate-controls ${showControls ? 'visible' : ''}`}>
                <button
                    className="exit-button"
                    onClick={handleExit}
                    aria-label="Exit contemplation"
                >
                    ✕
                </button>

                {!isTimerActive && (
                    <div className="timer-selection">
                        <p className="timer-label">Set a contemplation timer</p>
                        <div className="timer-options">
                            {TIMER_OPTIONS.map(option => (
                                <button
                                    key={option.label}
                                    className="timer-option btn btn-secondary"
                                    onClick={() => option.value ? startTimer(option.value) : setShowTranslation(true)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="contemplate-content">
                {/* Verse Reference */}
                <div className="contemplate-ref">
                    BG {verse.chapter}.{verse.verse}
                </div>

                {/* Sanskrit */}
                <div className="contemplate-sanskrit">
                    {verse.sanskrit}
                </div>

                {/* Translation (fades in) */}
                <div className={`contemplate-translation ${showTranslation ? 'visible' : ''}`}>
                    {verse.translation}
                </div>

                {/* Timer Display */}
                {isTimerActive && timeRemaining !== null && (
                    <div className="contemplate-timer">
                        {formatTime(timeRemaining)}
                    </div>
                )}

                {/* Contemplation Prompt */}
                {showTranslation && (
                    <div className="contemplate-prompt animate-fade-in">
                        <p>{contemplationPrompt()}</p>
                    </div>
                )}
            </main>

            {/* Subtle Om */}
            <div className="contemplate-om" aria-hidden="true">ॐ</div>
        </div>
    );
}

export default Contemplate;

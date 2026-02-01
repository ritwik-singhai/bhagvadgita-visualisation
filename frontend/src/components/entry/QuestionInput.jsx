import { useState, useCallback } from 'react';
import './QuestionInput.css';

/**
 * Question Input Component
 * 
 * Free-form question input for semantic search.
 * "How do I find peace?"
 * "What is my duty?"
 * "Who am I?"
 */

function QuestionInput({
    value,
    onChange,
    onSearch,
    isLoading,
    placeholder = 'Ask a question...'
}) {
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (value.trim()) {
            onSearch(value);
        }
    }, [value, onSearch]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    }, [handleSubmit]);

    return (
        <form className="question-input-wrapper" onSubmit={handleSubmit}>
            <div className={`question-input-container ${isFocused ? 'focused' : ''}`}>
                <span className="question-icon" aria-hidden="true">
                    {isLoading ? (
                        <span className="loading-spinner"></span>
                    ) : (
                        '🔍'
                    )}
                </span>

                <input
                    type="text"
                    className="question-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    aria-label="Ask a question about the Gita"
                />

                {value && (
                    <button
                        type="button"
                        className="clear-button"
                        onClick={() => {
                            onChange('');
                            onSearch('');
                        }}
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                )}

                <button
                    type="submit"
                    className="search-button btn btn-primary"
                    disabled={!value.trim() || isLoading}
                >
                    {isLoading ? 'Seeking...' : 'Seek'}
                </button>
            </div>

            <p className="question-hint">
                Ask in English, Hindi, or Sanskrit — we understand all
            </p>
        </form>
    );
}

export default QuestionInput;

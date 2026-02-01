import useStore from '../store';

export default function VerseDetail() {
  const { selectedVerse, setSelectedVerse, setCameraTarget, searchResultsMeta } = useStore();

  if (!selectedVerse) return null;

  const handleClose = () => {
    setSelectedVerse(null);
  };

  const handleFocus = () => {
    setCameraTarget(selectedVerse.position);
  };

  return (
    <div className="verse-detail">
      <button className="close-button" onClick={handleClose}>
        ×
      </button>

      <div className="verse-header">
        <h2 className="verse-id">{selectedVerse.id}</h2>
        <span className="chapter-name">{selectedVerse.chapter_name_english || selectedVerse.chapter_name}</span>
      </div>

      <div className="verse-content">
        <div className="sanskrit-text">
          {selectedVerse.sanskrit}
        </div>

        {selectedVerse.transliteration && (
          <div className="transliteration">
            {selectedVerse.transliteration}
          </div>
        )}

        <div className="translation">
          {selectedVerse.translation}
        </div>
      </div>

      <div className="verse-meta">
        <span className="meta-item">
          Chapter {selectedVerse.chapter}, Verse {selectedVerse.verse}
        </span>
        <span className="meta-item" title={`Cluster ${selectedVerse.cluster}`}>
          Topic: {selectedVerse.topic || `Cluster ${selectedVerse.cluster}`}
        </span>
        {selectedVerse.cluster_probs && Object.keys(selectedVerse.cluster_probs).length > 0 && (
          <span className="meta-item">
            Confidence: {Math.round(Math.max(...Object.values(selectedVerse.cluster_probs)) * 100)}%
          </span>
        )}
        {searchResultsMeta?.[selectedVerse.id]?.similarity && (
          <span className="meta-item">
            Similarity: {searchResultsMeta[selectedVerse.id].similarity.toFixed(3)}
          </span>
        )}
      </div>

      <button className="focus-button" onClick={handleFocus}>
        Focus in 3D
      </button>
    </div>
  );
}

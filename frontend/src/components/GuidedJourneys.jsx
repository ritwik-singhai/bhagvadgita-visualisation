import useStore from '../store';

/**
 * Guided Journeys that use semantic topic matching
 * instead of simple string matching on hard-coded themes.
 */

const JOURNEYS = [
  {
    id: 'arjunas-path',
    title: "Arjuna's Spiritual Journey",
    description: "Follow Arjuna from despair through understanding to liberation",
    steps: [
      { keyword: 'battle', label: 'The Battlefield' },
      { keyword: 'arjuna', label: 'Crisis & Doubt' },
      { keyword: 'action', label: 'Path of Action' },
      { keyword: 'yogi', label: 'Meditation' },
      { keyword: 'brahman', label: 'Supreme Knowledge' },
    ],
  },
  {
    id: 'three-paths',
    title: 'Three Paths to Liberation',
    description: "Karma, Jnana, and Bhakti Yoga",
    steps: [
      { keyword: 'action', label: 'Karma Yoga' },
      { keyword: 'self', label: 'Jnana Yoga' },
      { keyword: 'worship', label: 'Bhakti Yoga' },
    ],
  },
  {
    id: 'cosmic-vision',
    title: 'Cosmic Vision',
    description: "From the personal to the universal",
    steps: [
      { keyword: 'form', label: 'Divine Forms' },
      { keyword: 'among', label: 'Divine Manifestations' },
      { keyword: 'worship', label: 'Devotion' },
    ],
  },
  {
    id: 'nature-of-reality',
    title: 'Nature of Reality',
    description: "Understanding the gunas and the field",
    steps: [
      { keyword: 'field', label: 'Field & Knower' },
      { keyword: 'tamas', label: 'Three Gunas' },
      { keyword: 'brahman', label: 'Supreme Truth' },
    ],
  },
];

/**
 * Find the best matching cluster for a keyword
 * by checking if any keywords in the cluster match
 */
const findClusterByKeyword = (clusters, keyword) => {
  const lower = keyword.toLowerCase();

  // First try: match in theme name
  let match = clusters.find((cluster) =>
    cluster.theme.toLowerCase().includes(lower)
  );

  if (match) return match;

  // Second try: match in cluster keywords
  match = clusters.find((cluster) =>
    cluster.keywords?.some((kw) => {
      const word = kw.word || kw;
      return word.toLowerCase().includes(lower);
    })
  );

  return match;
};

export default function GuidedJourneys({ verses, clusters }) {
  const { setSearchResults, setCameraTarget, setSelectedVerse } = useStore();

  const handleStepClick = (cluster) => {
    const clusterVerses = verses.filter((v) => v.cluster === cluster.id);
    const ids = clusterVerses.map((v) => v.id);
    setSearchResults(ids, {});
    setCameraTarget(cluster.centroid);

    // Also select the exemplar verse if available
    if (cluster.exemplars && cluster.exemplars.length > 0) {
      const exemplarId = cluster.exemplars[0].id;
      const exemplarVerse = verses.find((v) => v.id === exemplarId);
      if (exemplarVerse) {
        setSelectedVerse(exemplarVerse);
      }
    }
  };

  return (
    <div className="guided-journeys">
      <div className="journeys-title">🕉️ Guided Journeys</div>
      {JOURNEYS.map((journey) => (
        <div key={journey.id} className="journey-card">
          <div className="journey-name">{journey.title}</div>
          {journey.description && (
            <div className="journey-description">{journey.description}</div>
          )}
          <div className="journey-steps">
            {journey.steps.map((step, idx) => {
              const cluster = findClusterByKeyword(clusters, step.keyword);
              if (!cluster) {
                return (
                  <span key={idx} className="journey-step disabled" title={`No cluster matches: ${step.keyword}`}>
                    {step.label}
                  </span>
                );
              }
              return (
                <button
                  key={idx}
                  className="journey-step"
                  onClick={() => handleStepClick(cluster)}
                  title={`${cluster.theme} (${cluster.verse_count} verses)`}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

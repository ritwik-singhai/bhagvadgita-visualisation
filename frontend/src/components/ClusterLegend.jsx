import './ClusterLegend.css';
import useStore from '../store';

/**
 * Cluster Legend for Explore Mode
 * Shows the list of discovered topic clusters with colors
 */

function ClusterLegend() {
    const clusters = useStore(state => state.clusters);
    const verses = useStore(state => state.verses);

    if (!clusters || clusters.length === 0) return null;

    // Sort clusters by size
    const sortedClusters = [...clusters].sort((a, b) => {
        const aSize = verses.filter(v => v.cluster === a.id).length;
        const bSize = verses.filter(v => v.cluster === b.id).length;
        return bSize - aSize;
    });

    return (
        <div className="cluster-legend">
            <h3 className="legend-title">Topic Clusters</h3>

            <div className="legend-list">
                {sortedClusters.map((cluster, index) => {
                    const count = verses.filter(v => v.cluster === cluster.id).length;
                    const colorVar = `--cluster-${cluster.id % 10}`;

                    return (
                        <div key={cluster.id} className="legend-item">
                            <span
                                className="legend-color"
                                style={{ background: `var(${colorVar})` }}
                            />
                            <span className="legend-label">
                                {cluster.label || cluster.theme || `Cluster ${cluster.id}`}
                            </span>
                            <span className="legend-count">{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ClusterLegend;

# Bhagavad Gita 3D Semantic Visualization

An interactive 3D visualization of all 700+ verses of the Bhagavad Gita, semantically clustered using AI embeddings.

![Visualization Preview](preview.png)

## Features

- **3D Visualization**: Explore the entire Bhagavad Gita in an interactive 3D space
- **Semantic Clustering**: Verses are clustered by meaning using AI embeddings
- **Search**: Both text-based and AI-powered semantic search
- **Sanskrit Text**: View verses in original Sanskrit with transliteration and English translation
- **Interactive**: Click to select verses, hover for previews, zoom and rotate the view

## Tech Stack

### Data Pipeline (Python)
- **Ollama** with `embeddinggemma` for generating 768-dimensional verse embeddings
- **UMAP** for dimensionality reduction (768D → 3D)
- **Scikit-learn** for K-Means clustering

### Frontend (React)
- **React + Vite** for the web application
- **Three.js** with `@react-three/fiber` for 3D rendering
- **Zustand** for state management

### Search API (Python)
- **FastAPI** for the semantic search endpoint
- Real-time embedding similarity search

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Ollama** with `embeddinggemma` model installed

## Setup

### 1. Clone and Install Python Dependencies

```bash
cd bhagvadgita-visualisation
python3 -m venv venv
source venv/bin/activate
pip install -r scripts/requirements.txt
```

### 2. Set up Ollama

Make sure Ollama is running and pull the embedding model:

```bash
ollama serve  # In a separate terminal
ollama pull embeddinggemma
```

### 3. Generate Data (if not already done)

```bash
# Fetch verses from API
python scripts/fetch_gita.py

# Generate embeddings
python scripts/generate_embeddings.py

# Create clusters and 3D coordinates
python scripts/cluster_and_reduce.py
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Copy Data to Frontend

```bash
mkdir -p frontend/src/data
cp data/verses_visualization_frontend.json frontend/src/data/verses.json
```

## Running the Application

### Start the Frontend

```bash
cd frontend
npm run dev
```

The visualization will be available at http://localhost:5173

### Start the Search API (optional, for semantic search)

```bash
# In the project root
source venv/bin/activate
python api/search.py
```

The API will run at http://localhost:8000

## Project Structure

```
bhagvadgita-visualisation/
├── scripts/
│   ├── fetch_gita.py           # Download Gita verses
│   ├── generate_embeddings.py  # Create embeddings
│   ├── cluster_and_reduce.py   # UMAP + K-Means
│   └── requirements.txt
├── api/
│   ├── search.py               # FastAPI search endpoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Scene.jsx       # Three.js scene
│   │   │   ├── VersePoints.jsx # Point cloud
│   │   │   ├── SearchBar.jsx   # Search interface
│   │   │   ├── VerseDetail.jsx # Verse panel
│   │   │   └── ...
│   │   ├── data/
│   │   │   └── verses.json     # Visualization data
│   │   ├── store.js            # Zustand store
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
├── data/
│   ├── verses_raw.json              # Raw verse data
│   ├── verses_with_embeddings.json  # With embeddings
│   └── verses_visualization.json    # Final visualization data
└── README.md
```

## Controls

- **Drag**: Rotate the view
- **Scroll**: Zoom in/out
- **Click**: Select a verse to view details
- **Search**: Type to find verses by text or enable AI search for semantic matching

## Data Source

Verse data is sourced from the [Vedic Scriptures API](https://vedicscriptures.github.io/), which provides:
- Sanskrit text (Devanagari)
- Transliteration
- Multiple English translations

## Cluster Themes

The visualization automatically clusters verses into semantic concepts:
- Arjuna's Despair
- Path of Knowledge
- Path of Action
- Divine Knowledge
- Renunciation
- Meditation & Self-Control
- And more...

## License

This project is for educational purposes. The Bhagavad Gita is an ancient text in the public domain.

---

**ॐ शान्ति शान्ति शान्तिः**

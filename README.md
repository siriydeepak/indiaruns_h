# WeHire - Intelligent Candidate Discovery & Predictive Ranking Engine

WeHire is an enterprise-grade candidate matching and ranking platform built for elite technical talent discovery. It combines dense semantic representation models with engagement telemetry signals to build a contextual, bi-directional search capability.

---

## 🧠 Core Architecture & Design Patterns

The platform strictly separates machine learning compute pipelines, API controllers, and data validation layers to maximize horizontal scaling:

* **FastAPI Backend Router**: High-throughput asynchronous routing utilizing dependency injection and singleton ML services.
* **Dynamic NLP Job Parser**: Cleans raw, multi-paragraph text specifications on the fly, applying stop-word filters and proximity boosts for core skill indicators (direct modifiers of action verbs).
* **Dense Embedding Vector Search**: Integrates local Hugging Face `SentenceTransformer` models (`all-MiniLM-L6-v2`) to perform 384-dimensional cosine similarity matching. Runs 100% on-network to secure candidate PII (GDPR/CCPA compliant).
* **Behavioral Telemetry Scoring**: Integrates candidate activity markers (profile completeness, career progression velocity, recruiter interaction response, and linear recency decay).
* **Interactive Recruiter Dashboard**: Responsive Vite + React UI using a glassmorphic dark-theme visual identity. Exposes presets, experience parameters, and dynamic weight tuning sliders.

---

## ⚡ Mathematical Matching Formula

For each candidate in the inventory, the engine calculates:

$$\text{Score}_{\text{semantic}} = \cos(\vec{V}_{\text{job}}, \vec{V}_{\text{resume}}) = \frac{\vec{V}_{\text{job}} \cdot \vec{V}_{\text{resume}}}{\|\vec{V}_{\text{job}}\| \|\vec{V}_{\text{resume}}\|}$$

$$\text{Score}_{\text{behavioral}} = (\text{completeness} \times 0.30) + \left(\frac{\text{velocity}}{5.0} \times 0.40\right) + (\text{responseRate} \times 0.20) + \left(\frac{\max(0, 30 - \text{inactiveDays})}{30} \times 0.10\right)$$

$$\text{Score}_{\text{composite}} = (\text{Score}_{\text{semantic}} \times W_{\text{semantic}}) + (\text{Score}_{\text{behavioral}} \times W_{\text{behavioral}})$$

*Where $W_{\text{semantic}}$ and $W_{\text{behavioral}}$ default to 0.60 and 0.40, but are dynamically overridden in real-time by the recruiter via the dashboard.*

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup and Running (Using run.bat on Windows)
Simply double-click the **`run.bat`** file in the root directory. It will automatically launch the backend FastAPI service (on port `8080`) and the Vite React client (on port `5173`) in side-by-side terminal windows.

- **Recruiter Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Documentation**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Health Check Endpoint**: [http://localhost:8080/](http://localhost:8080/)

### Containerized Execution (Using Docker Compose)
To run the fully containerized pipeline, execute:
```bash
docker-compose up --build
```

"""
In-Memory Mock Vector Store and Candidate Registry.

Provides a thread-safe, singleton mock database layer that registers candidates and stores
their profiles. Automatically seeds the database with a high-fidelity challenge
dataset representing a diverse spectrum of domains and behavioral/verification telemetry signals.
"""

import logging
from typing import Dict, List, Optional
from threading import Lock

from app.schemas.candidate import CandidateProfile, BehavioralSignals, VerificationSignals

logger = logging.getLogger(__name__)


class InMemoryTalentStore:
    """
    A thread-safe, singleton in-memory mock store for candidate profiles.
    
    Acts as our primary data registry. Single-instance access is enforced via a 
    thread-safe double-checked locking singleton pattern.
    """
    _instance = None
    _lock = Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(InMemoryTalentStore, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return
        
        self._lock = Lock()
        self._store: Dict[str, CandidateProfile] = {}
        self._initialized = True
        
        logger.info("Initializing InMemoryTalentStore singleton instance...")

    def add_candidate(self, candidate: CandidateProfile) -> None:
        """
        Adds a candidate profile to the registry, validating it through Pydantic.
        """
        with self._lock:
            self._store[candidate.id] = candidate
            logger.info(f"Registered candidate: {candidate.name} ({candidate.id}) - location: {candidate.location}")

    def get_candidate(self, candidate_id: str) -> Optional[CandidateProfile]:
        """
        Retrieves a candidate by ID.
        """
        with self._lock:
            return self._store.get(candidate_id)

    def list_all_candidates(self) -> List[CandidateProfile]:
        """
        Returns all registered candidates.
        """
        with self._lock:
            return list(self._store.values())

    def get_all_candidates(self) -> List[CandidateProfile]:
        """
        Alias for list_all_candidates to support the get_all_candidates interface.
        """
        return self.list_all_candidates()

    def clear(self) -> None:
        """
        Clears all candidates in the registry.
        """
        with self._lock:
            self._store.clear()
            logger.warning("InMemoryTalentStore cleared of all records.")

    def seed_initial_profiles(self) -> None:
        """
        Seeds the store with 7 highly detailed mock candidate profiles across diverse domains.
        
        The profiles cover various engineering fields with dense technical prose 
        and distinct behavioral and verification signals.
        """
        logger.info("Seeding InMemoryTalentStore with mock candidate dataset...")
        
        mock_candidates = [
            CandidateProfile(
                id="cand_001",
                name="Sarah Jenkins",
                current_title="Senior Full-Stack Engineer",
                full_resume_text=(
                    "Sarah Jenkins is a Senior Full-Stack Software Engineer with 8 years of experience. "
                    "Expertise in React, TypeScript, Next.js, Node.js, and Postgres. "
                    "Developed scalable microservices using Python FastAPI. Proven history of leading engineering teams "
                    "and deploying high-throughput, latency-sensitive production systems. Strong focus on design systems "
                    "and front-end performance tuning. Proficient with Docker, Kubernetes, AWS, and modern CI/CD pipelines."
                ),
                skills=["React", "TypeScript", "Next.js", "Node.js", "Postgres", "Python", "FastAPI", "Docker", "Kubernetes", "AWS"],
                location="San Francisco, CA",
                gender="Female",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=True,
                    hackathon_awards_count=2
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=1.0,
                    career_velocity_score=4.8,
                    interaction_response_rate=0.95,
                    days_since_last_activity=2
                )
            ),
            CandidateProfile(
                id="cand_002",
                name="Alex Rivera",
                current_title="Junior Data Scientist",
                full_resume_text=(
                    "Alex Rivera is an aspiring Data Scientist and Analyst. "
                    "Strong educational background in mathematical statistics and machine learning algorithms. "
                    "Proficient in Python, Pandas, NumPy, SQL, and Tableau. "
                    "Experience training predictive regression and classification models using scikit-learn. "
                    "Passionate about storytelling with data and finding patterns in behavioral telemetry data."
                ),
                skills=["Python", "Pandas", "NumPy", "SQL", "Tableau", "Scikit-Learn", "Machine Learning"],
                location="Austin, TX",
                gender="Non-binary",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=False,
                    hackathon_awards_count=0
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.75,
                    career_velocity_score=2.5,
                    interaction_response_rate=0.80,
                    days_since_last_activity=14
                )
            ),
            CandidateProfile(
                id="cand_003",
                name="Dr. Elena Rostova",
                current_title="Principal Machine Learning Engineer",
                full_resume_text=(
                    "Dr. Elena Rostova is a Principal ML Research Scientist and ML Ops Engineer. "
                    "Ph.D. in Computer Science. Over 10 years of experience designing deep learning models for NLP and Computer Vision. "
                    "Extensive experience with PyTorch, TensorFlow, Transformers, HuggingFace, and distributed ML training. "
                    "Built real-time vector search index architectures using Qdrant and Milvus. "
                    "Pioneered embedding pipelines for production candidate semantic discovery and cross-encoder rankers. "
                    "Passionate about optimizing Triton inference server latency and deploying LLMs on the edge."
                ),
                skills=["PyTorch", "TensorFlow", "Transformers", "HuggingFace", "Qdrant", "Milvus", "NLP", "Computer Vision", "LLMs", "Triton"],
                location="Boston, MA",
                gender="Female",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=True,
                    hackathon_awards_count=5
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.98,
                    career_velocity_score=5.0,
                    interaction_response_rate=0.90,
                    days_since_last_activity=1
                )
            ),
            CandidateProfile(
                id="cand_004",
                name="Marcus Vance",
                current_title="Senior Frontend Engineer",
                full_resume_text=(
                    "Marcus is a creative Senior Front-end Developer with 6 years of experience. "
                    "Specialized in UI/UX rendering, Tailwind CSS, Vue.js, and React.js. "
                    "Focuses on responsive design, accessibility (WCAG), and responsive layouts. "
                    "Collaborates heavily with product designers to map Figma mockups into production code."
                ),
                skills=["React.js", "Vue.js", "Tailwind CSS", "JavaScript", "CSS", "UI/UX", "Figma", "HTML5"],
                location="Chicago, IL",
                gender="Male",
                verification_signals=VerificationSignals(
                    github_verified=False,
                    portfolio_linked=True,
                    hackathon_awards_count=1
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.85,
                    career_velocity_score=3.2,
                    interaction_response_rate=0.60,
                    days_since_last_activity=30
                )
            ),
            CandidateProfile(
                id="cand_005",
                name="Jane Doe",
                current_title="Backend System Architect",
                full_resume_text=(
                    "Jane Doe is a veteran backend software engineer with 12 years of industry experience. "
                    "Expert in Go (Golang), Python, PostgreSQL, Redis, and gRPC. "
                    "Designed high-performance database schema schemas, indexing strategies, and database query optimizations. "
                    "Deep understanding of distributed systems architecture, concurrency patterns, and message brokers like RabbitMQ and Kafka. "
                    "Believer in clean code, unit testing, and structural design patterns."
                ),
                skills=["Go", "Python", "PostgreSQL", "Redis", "gRPC", "Kafka", "RabbitMQ", "Distributed Systems"],
                location="Seattle, WA",
                gender="Female",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=True,
                    hackathon_awards_count=3
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.90,
                    career_velocity_score=3.8,
                    interaction_response_rate=0.88,
                    days_since_last_activity=5
                )
            ),
            CandidateProfile(
                id="cand_006",
                name="Liam O'Connor",
                current_title="Cyber Security & SecOps Engineer",
                full_resume_text=(
                    "Liam O'Connor is a dedicated Cyber Security Specialist and SecOps Engineer with 5 years of experience. "
                    "Expert in monitoring SIEM systems, threat detection, and firewall configurations. "
                    "Proficient with Wireshark for network traffic analysis and conducting penetration testing against OWASP Top 10 vulnerabilities. "
                    "Strong experience securing cloud infrastructure in AWS and GCP, writing incident response plans, and managing IAM user privileges."
                ),
                skills=["SIEM", "Wireshark", "OWASP", "Pentesting", "Firewalls", "AWS", "GCP", "Incident Response", "IAM"],
                location="New York, NY",
                gender="Male",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=False,
                    hackathon_awards_count=1
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.95,
                    career_velocity_score=4.0,
                    interaction_response_rate=0.92,
                    days_since_last_activity=3
                )
            ),
            CandidateProfile(
                id="cand_007",
                name="Sophia Martinez",
                current_title="Senior UX Researcher",
                full_resume_text=(
                    "Sophia Martinez is a Senior UX Researcher and Product Designer with 7 years of user experience mapping. "
                    "Experienced in planning and leading usability testing sessions, conducting one-on-one user interviews, mapping user personas, "
                    "and drawing interactive wireframes in Figma and Miro. Focused on interface accessibility, user-centric research, A/B testing, "
                    "and translating customer insights into product features."
                ),
                skills=["Usability Testing", "User Interviews", "Wireframing", "Personas", "Figma", "Miro", "A/B Testing", "UX Research", "UI Design"],
                location="Denver, CO",
                gender="Female",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=True,
                    hackathon_awards_count=4
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=1.0,
                    career_velocity_score=4.5,
                    interaction_response_rate=0.85,
                    days_since_last_activity=6
                )
            ),
            CandidateProfile(
                id="cand_008",
                name="Vikram Malhotra",
                current_title="Lead Blockchain Developer",
                full_resume_text=(
                    "Vikram Malhotra is a seasoned Blockchain Architect with 6 years of core ledger experience. "
                    "Expert in Solidity smart contract development, EVM architecture, and rust-based substrate frameworks. "
                    "Designed high-security decentralized finance (DeFi) liquidity pools and audited token bridge protocols "
                    "against smart contract reentrancy vulnerabilities. Proficient with Web3.js, Hardhat, Go-Ethereum, and cryptography."
                ),
                skills=["Solidity", "Rust", "Web3.js", "Smart Contracts", "Ethereum", "Go", "Cryptography", "Hardhat"],
                location="Mumbai, MH",
                gender="Male",
                verification_signals=VerificationSignals(
                    github_verified=True,
                    portfolio_linked=True,
                    hackathon_awards_count=3
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.92,
                    career_velocity_score=4.2,
                    interaction_response_rate=0.88,
                    days_since_last_activity=4
                )
            ),
            CandidateProfile(
                id="cand_009",
                name="Yuki Tanaka",
                current_title="Senior Android Engineer",
                full_resume_text=(
                    "Yuki Tanaka is a Senior Android Developer with 7 years of mobile experience. "
                    "Expertise in Kotlin, Android SDK, Jetpack Compose, Kotlin Coroutines, and MVVM architecture. "
                    "Led the migration of legacy mobile codebases to reactive Compose streams. Optimized client-side Room database "
                    "queries to minimize CPU profiling footprints. Integrated OAuth2 security wrappers and Retrofit network layers."
                ),
                skills=["Kotlin", "Java", "Android SDK", "Jetpack Compose", "Coroutines", "MVVM", "Gradle", "Retrofit"],
                location="Tokyo, JP",
                gender="Male",
                verification_signals=VerificationSignals(
                    github_verified=False,
                    portfolio_linked=True,
                    hackathon_awards_count=1
                ),
                behavioral_signals=BehavioralSignals(
                    profile_completeness=0.80,
                    career_velocity_score=3.5,
                    interaction_response_rate=0.72,
                    days_since_last_activity=8
                )
            )
        ]
        
        for candidate in mock_candidates:
            self.add_candidate(candidate)
        
        logger.info(f"Successfully seeded {len(mock_candidates)} candidate profiles in database memory.")


# Instantiate global store singleton
talent_store = InMemoryTalentStore()

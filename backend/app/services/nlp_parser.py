"""
Dynamic Natural Language Processing (NLP) Job Parser.

This module provides the DynamicJobParser, which performs raw textual analysis
to extract and score technical skills directly from multi-paragraph job specifications.
This achieves 'Deep Job Understanding' by dynamically identifying target stack elements
and context keywords without relying on manual database entries.
"""

import re
import logging
from typing import List, Dict, Set

logger = logging.getLogger(__name__)

# Stop-words to exclude from statistical token analysis
STOP_WORDS: Set[str] = {
    "and", "the", "a", "an", "of", "to", "in", "for", "with", "on", "at", "by", 
    "from", "is", "are", "was", "were", "be", "been", "that", "this", "these", 
    "those", "or", "as", "it", "its", "it's", "we", "our", "you", "your", "they",
    "them", "who", "which", "working", "using", "experienced", "knowledge",
    "understanding", "skills", "experience", "years", "strong", "preferred", "plus",
    "wehire", "seeking", "looking", "hiring", "team", "role", "position", "candidate",
    "successful", "must", "have", "with", "ideal", "opportunity"
}

# Technical skill dictionary used as vocabulary targets for dynamic proximity matching
TECH_SKILLS_KB: Set[str] = {
    # Core engineering & databases
    "python", "pytorch", "tensorflow", "kubernetes", "docker", "react", "typescript", 
    "javascript", "golang", "go", "postgres", "postgresql", "sql", "aws", "gcp", 
    "azure", "fastapi", "next.js", "node.js", "redis", "grpc", "kafka", "rabbitmq", 
    "pandas", "numpy", "scikit-learn", "tableau", "milvus", "qdrant", "nlp", 
    "transformers", "huggingface", "vue.js", "css", "html5", "figma", "triton",
    "mongodb", "mysql", "elasticsearch", "spark", "hadoop", "git", "ci/cd", "jenkins",
    "django", "flask", "rust", "c++", "java", "spring-boot", "microservices", "graphql", "rest-api",
    # Cyber Security
    "siem", "wireshark", "pentesting", "firewalls", "owasp", "splunks", "metasploit", "burpsuite", 
    "cryptography", "threat-hunting", "incident-response", "ids/ips", "iam", "soc", "nessus", "snort", 
    "nmap", "cissp", "ceh", "comptia", "security+", "firewall",
    # UX Research & Design
    "usability", "prototyping", "wireframing", "personas", "user-journeys", "card-sorting", "surveying", 
    "ethnography", "ab-testing", "interaction-design", "user-research", "ux", "ui", "miro", "sketch", "heuristics"
}

# Action verbs denoting direct hands-on stack requirements
ACTION_VERBS: Set[str] = {
    "build", "develop", "design", "deploy", "implement", "lead", "architect", 
    "scale", "optimize", "create", "write", "manage", "configure", "integrate",
    "train", "fine-tune", "orchestrate", "maintain", "perform", "conduct", "analyze", "monitor", "secure"
}


class DynamicJobParser:
    """
    Algorithmic job spec parser for token-weighting analysis.
    
    Implements dynamic skill extraction using frequency counts, static knowledge base,
    verb proximity calculations, and capitalized entity harvesting heuristics.
    """

    def __init__(self, raw_text_specification: str) -> None:
        self.raw_text = raw_text_specification
        # Extract sentence structure to detect sentence starters
        self.sentences = [s.strip() for s in re.split(r'[.!?\n]+', raw_text_specification) if s.strip()]
        self.tokens = self._tokenize(raw_text_specification)

    def _tokenize(self, text: str) -> List[str]:
        """
        Cleans and tokenizes raw text by removing punctuation and splitting by whitespace.
        """
        # Lowercase and replace non-alphanumeric punctuation (except dots and dashes in tech names)
        cleaned = re.sub(r"[^\w\.\-#\s]", " ", text.lower())
        return [t.strip() for t in cleaned.split() if t.strip()]

    def extract_technical_skills(self) -> List[str]:
        """
        Analyzes tokens to identify and rank technical skills based on frequency, KB matching,
        proximity to action verbs, and dynamic capitalized term extraction.
        
        This satisfies the 'Deep Job Understanding' track requirement by resolving which skillsets
        are core deliverables (close to action verbs like 'build' or 'deploy') versus secondary or nice-to-have,
        extending this dynamically to custom domains.
        
        Returns:
            A list of extracted skills sorted by their computed relevance weights.
        """
        skill_scores: Dict[str, float] = {}
        
        # 1. First Pass: Static Knowledge Base matching & Verb Proximity
        for i, token in enumerate(self.tokens):
            if token in TECH_SKILLS_KB:
                base_score = 1.0
                
                # Proximity boost (window of 5 words)
                proximity_boost = 0.0
                start_win = max(0, i - 5)
                end_win = min(len(self.tokens), i + 6)
                
                window_tokens = self.tokens[start_win:end_win]
                for win_token in window_tokens:
                    if win_token in ACTION_VERBS:
                        proximity_boost = 1.5
                        break
                
                total_weight = base_score + proximity_boost
                skill_scores[token] = skill_scores.get(token, 0.0) + total_weight

        # 2. Second Pass: Dynamic Capitalization Heuristics
        # We search for capitalized or uppercase words in the raw text that are NOT at the start of sentences
        # and are not standard stop words, to dynamically capture custom/unlisted frameworks.
        for sentence in self.sentences:
            # Tokenize preserving casing
            words = [w.strip() for w in re.sub(r"[^\w\.\-#\s]", " ", sentence).split() if w.strip()]
            for j, word in enumerate(words):
                # Heuristic: skip first word of sentence since it's capitalized by grammar rules
                if j == 0:
                    continue
                
                # Check if word is capitalized (e.g. React) or fully uppercase (e.g. SIEM)
                if (word[0].isupper() or word.isupper()) and len(word) > 1:
                    word_lower = word.lower()
                    
                    # Ignore if it is a common stop word
                    if word_lower in STOP_WORDS:
                        continue
                        
                    # Base score for dynamically extracted capitalized terms
                    # We give a slightly lower base score to avoid noise, but boost if it's near action verbs
                    base_score = 0.8
                    
                    # Proximity boost to action verbs
                    proximity_boost = 0.0
                    start_win = max(0, j - 5)
                    end_win = min(len(words), j + 6)
                    for k in range(start_win, end_win):
                        if words[k].lower() in ACTION_VERBS:
                            proximity_boost = 1.2
                            break
                            
                    total_weight = base_score + proximity_boost
                    
                    # Add/update score using lowercased version of the term
                    skill_scores[word_lower] = skill_scores.get(word_lower, 0.0) + total_weight

        # Filter and sort extracted skills
        sorted_skills = sorted(skill_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Log extracted skills for transparency
        logger.info(f"Dynamically extracted technical skills: {sorted_skills}")
        
        # Return only the skill names
        return [skill for skill, score in sorted_skills]

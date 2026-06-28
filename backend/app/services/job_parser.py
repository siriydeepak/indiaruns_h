"""
Deep Job Understanding and NLP Job Parser Service.

This module parses completely unstructured, raw multi-paragraph job specifications
to dynamically extract experience constraints (years of experience), job title keywords,
and technical skill entities using token patterns.
"""

import re
import logging
from typing import List, Dict, Set, Any

logger = logging.getLogger(__name__)

# major industry technical frameworks, languages, and architectures
TECH_SKILLS_KB: Set[str] = {
    # Languages
    "python", "javascript", "typescript", "golang", "go", "rust", "c++", "c#", "java", "scala", "ruby", "php", "html", "css",
    # Frameworks & Libraries
    "react", "react.js", "next.js", "vue", "angular", "node.js", "node", "fastapi", "django", "flask", "pytorch", "tensorflow", "scikit-learn", "numpy", "pandas",
    # Databases & Stores
    "sql", "postgres", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "qdrant", "milvus",
    # DevOps & Infrastructure
    "kubernetes", "docker", "aws", "gcp", "azure", "devops", "ci/cd", "jenkins", "terraform", "ansible", "kafka", "rabbitmq", "grpc", "triton",
    # Design & UX
    "figma", "miro", "sketch", "ux", "ui", "usability", "wireframing"
}

class UnstructuredJobParser:
    """
    NLP parser for extracting structural metadata from unstructured job description prose.
    """

    def __init__(self) -> None:
        pass

    def extract_experience_requirement(self, raw_text: str) -> int:
        """
        Searches the text for experience requirement numbers using precise regex.
        Returns the highest integer found as the mandatory minimum experience constraint.
        If no year metric is detected, defaults to 0.
        """
        if not raw_text:
            return 0

        logger.info("Extracting years of experience requirement from job spec...")
        found_years: List[int] = []

        # Define numerical patterns paired with experience keywords
        patterns = [
            # Ranges or suffix matches like "3-5 yrs", "5+ years", "5 to 7 years", "4+ yrs"
            r'\b(\d+)\s*(?:\+|to|-|–)\s*(\d+)?\s*(?:years?|yrs?)\b',
            # Prefix matches like "minimum of 4 years", "experience of 7 yrs", "at least 3 years"
            r'\b(?:experience\s+of\s+|minimum\s+of\s+|at\s+least\s+|have\s+)?(\d+)\s*(?:years?|yrs?)\b',
            # Suffix keyword matching like "7 years of professional experience"
            r'\b(\d+)\s*(?:years?|yrs?)\b\s*(?:of\s+)?(?:professional|relevant|hands-on|industry)?\s*(?:experience)?\b'
        ]

        try:
            for pattern in patterns:
                matches = re.finditer(pattern, raw_text, re.IGNORECASE)
                for match in matches:
                    groups = match.groups()
                    for group in groups:
                        if group is not None:
                            try:
                                val = int(group)
                                # Sanity check: ignore unrealistic values (e.g. 50+ years of experience)
                                if 0 < val < 30:
                                    found_years.append(val)
                            except ValueError:
                                continue
            
            if found_years:
                highest_exp = max(found_years)
                logger.info(f"Experience constraint extracted: {highest_exp} years")
                return highest_exp
            
            logger.info("No experience constraint found. Defaulting to 0 years.")
            return 0
        except Exception as e:
            logger.error(f"Error occurred during experience requirements extraction: {str(e)}", exc_info=True)
            return 0

    def extract_technical_skills(self, raw_text: str) -> List[str]:
        """
        Cleans and tokenizes text, cross-referencing tokens against the internal
        knowledge base of technical skills. Returns list of unique discovered skills.
        """
        if not raw_text:
            return []

        logger.info("Extracting technical skill entities from job spec...")
        discovered_skills: List[str] = []

        try:
            # Lowercase and clean formatting noise (preserve dash/dots in skill names like next.js, c++)
            cleaned_text = re.sub(r"[^\w\.\+#\s-]", " ", raw_text.lower())
            
            # Tokenize on whitespace
            tokens = cleaned_text.split()
            
            # Collect unique skills preserving order of appearance
            seen_skills = set()
            for token in tokens:
                # Strip trailing dots or dashes from words that are not technical names
                t_clean = token.strip(".-")
                
                # Check directly in KB
                if token in TECH_SKILLS_KB and token not in seen_skills:
                    seen_skills.add(token)
                    discovered_skills.append(token)
                elif t_clean in TECH_SKILLS_KB and t_clean not in seen_skills:
                    seen_skills.add(t_clean)
                    discovered_skills.append(t_clean)

            logger.info(f"Discovered technical skill entities: {discovered_skills}")
            return discovered_skills
        except Exception as e:
            logger.error(f"Error occurred during technical skills extraction: {str(e)}", exc_info=True)
            return []

    def extract_title_keywords(self, raw_text: str) -> List[str]:
        """
        Heuristically extracts key job title terms from the first lines of the text.
        """
        if not raw_text:
            return []

        try:
            # Look at first line or first paragraph
            first_line = raw_text.split('\n')[0].strip()
            if not first_line:
                # Fallback to first non-empty line
                lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
                first_line = lines[0] if lines else ""

            # Common job titles keywords
            role_keywords = {
                "engineer", "developer", "architect", "specialist", "researcher", 
                "analyst", "scientist", "manager", "lead", "senior", "principal", 
                "junior", "full-stack", "frontend", "backend", "fullstack", "devops",
                "cybersecurity", "security", "machine", "learning", "data", "ux", "ui"
            }

            words = re.findall(r'\b[a-zA-Z-]+\b', first_line.lower())
            extracted = [w for w in words if w in role_keywords]

            # Fallback to capitalized words in first line if no keywords matched
            if not extracted:
                capitalized_words = re.findall(r'\b[A-Z][a-zA-Z-]+\b', first_line)
                extracted = [w.lower() for w in capitalized_words]

            return list(dict.fromkeys(extracted))
        except Exception as e:
            logger.error(f"Error occurred during title keywords extraction: {str(e)}", exc_info=True)
            return []

    def parse_job_specification(self, raw_text: str) -> Dict[str, Any]:
        """
        Executes all subroutines and returns a clean, structured payload dictionary:
        {
            "extracted_title_keywords": [...],
            "required_experience_years": int,
            "mandatory_skills": [...]
        }
        """
        try:
            title_keywords = self.extract_title_keywords(raw_text)
            exp_years = self.extract_experience_requirement(raw_text)
            skills = self.extract_technical_skills(raw_text)

            return {
                "extracted_title_keywords": title_keywords,
                "required_experience_years": exp_years,
                "mandatory_skills": skills
            }
        except Exception as e:
            logger.error(f"Failed to parse job specification: {str(e)}", exc_info=True)
            return {
                "extracted_title_keywords": [],
                "required_experience_years": 0,
                "mandatory_skills": []
            }

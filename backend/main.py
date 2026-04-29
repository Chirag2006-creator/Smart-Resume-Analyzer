from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import spacy
import re
import os
import json
import tempfile
import httpx
from typing import Optional

app = FastAPI(title="Neural Resume Analyzer API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

KNOWN_SKILLS = [
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
    # Frontend
    "react", "angular", "vue", "svelte", "next.js", "nuxt", "html", "css",
    "tailwind", "bootstrap", "sass", "redux", "jquery",
    # Backend
    "node.js", "express", "fastapi", "django", "flask", "spring boot",
    "asp.net", "rails", "laravel", "graphql", "rest api",
    # Databases
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
    "dynamodb", "firebase", "cassandra", "oracle",
    # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "ci/cd", "github actions", "ansible", "nginx", "linux",
    # Data & ML
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "pandas", "numpy", "scikit-learn", "spark", "hadoop", "tableau",
    "power bi", "data analysis", "computer vision",
    # Tools & Practices
    "git", "jira", "agile", "scrum", "microservices", "api design",
    "unit testing", "figma", "postman",
]

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF using pdfplumber, page by page."""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def extract_entities(text: str) -> dict:
    """
    Use spaCy NER + regex to extract structured data from raw resume text.
    This is the deterministic layer — fast, free, no API calls.
    """
    doc = nlp(text)

    entities = {
        "emails": list(set(re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text))),
        "phones": list(set(re.findall(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text))),
        "links": list(set(re.findall(r'https?://[^\s,)]+', text))),
        "skills": [],
        "organizations": [],
    }

    # Skill extraction via keyword matching against our dictionary
    text_lower = text.lower()
    for skill in KNOWN_SKILLS:
        if skill in text_lower:
            entities["skills"].append(skill.title())

    # Named Entity Recognition for organizations
    for ent in doc.ents:
        if ent.label_ == "ORG":
            entities["organizations"].append(ent.text)

    entities["organizations"] = list(set(entities["organizations"]))[:8]

    return entities


def compute_skill_match(resume_skills: list, job_description: str) -> dict:
    """
    Compare resume skills against a job description using keyword matching.
    Returns match score, matched skills, and missing skills.
    """
    jd_lower = job_description.lower()
    jd_skills = [skill for skill in KNOWN_SKILLS if skill in jd_lower]

    resume_skills_lower = [s.lower() for s in resume_skills]

    matched = [s.title() for s in jd_skills if s in resume_skills_lower]
    missing = [s.title() for s in jd_skills if s not in resume_skills_lower]

    score = round((len(matched) / len(jd_skills)) * 100) if jd_skills else 100

    return {
        "match_score": score,
        "matched_skills": matched,
        "missing_skills": missing,
    }


async def get_llm_analysis(resume_text: str, job_description: Optional[str] = None) -> dict:
    """
    Send the resume text (and optional JD) to Google Gemini for deep,
    context-aware analysis that goes far beyond keyword matching.

    Returns a structured JSON with:
      - summary: A professional summary of the candidate
      - strengths: Top 3-5 strengths
      - weaknesses: Areas for improvement
      - experience_level: Junior / Mid / Senior / Lead
      - recommendations: Actionable suggestions
      - fit_analysis: (only if JD provided) Why they are/aren't a good fit
    """
    if not OPENROUTER_API_KEY:
        return {"error": "OPENROUTER_API_KEY not set. LLM analysis skipped."}

    jd_section = ""
    if job_description:
        jd_section = f"""

--- JOB DESCRIPTION ---
{job_description}
--- END JOB DESCRIPTION ---

Additionally, provide a "fit_analysis" field: a 2-3 sentence explanation of how well this candidate fits the job described above, highlighting both alignment and gaps.
"""

    prompt = f"""You are an expert HR recruiter and technical talent evaluator.
Analyze the following resume text and return a JSON object with EXACTLY these keys:

- "summary": A concise 2-3 sentence professional summary of the candidate.
- "strengths": An array of 3-5 key strengths (strings).
- "weaknesses": An array of 2-3 areas for improvement (strings).
- "experience_level": One of "Junior", "Mid-Level", "Senior", or "Lead/Principal".
- "recommendations": An array of 2-3 actionable suggestions for the candidate to improve their resume or career trajectory.
{'"fit_analysis": A 2-3 sentence analysis of job fit.' if job_description else ''}

IMPORTANT: Return ONLY the raw JSON object. No markdown, no code fences, no explanation.

--- RESUME TEXT ---
{resume_text[:6000]}
--- END RESUME ---
{jd_section}"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:8080",
                    "X-Title": "Neural Resume Analyzer",
                },
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 1024,
                }
            )
            response.raise_for_status()

            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]

            # Clean potential markdown code fences from response
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]  # remove first line
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            return json.loads(cleaned)

    except httpx.HTTPStatusError as e:
        return {"error": f"OpenRouter API error: {e.response.status_code} — {e.response.text[:200]}"}
    except json.JSONDecodeError:
        return {"error": "OpenRouter returned non-JSON response.", "raw": raw_text[:500]}
    except Exception as e:
        return {"error": f"LLM analysis failed: {str(e)}"}


@app.post("/api/analyze")
async def analyze_resume(file: UploadFile = File(...), job_description: Optional[str] = Form(None)):
    """
    Main endpoint. Accepts a PDF resume and optional job description.
    Runs BOTH the deterministic NLP layer and the LLM layer in sequence,
    then returns a unified response.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = extract_text_from_pdf(tmp_path)

        if not text.strip():
            return {"status": "error", "message": "Could not extract text from the PDF. It may be image-based or empty."}

        entities = extract_entities(text)

        match_data = {"match_score": None, "matched_skills": [], "missing_skills": []}
        if job_description:
            match_data = compute_skill_match(entities["skills"], job_description)

        llm_insights = await get_llm_analysis(text, job_description)

        return {
            "status": "success",
            "filename": file.filename,
            "entities": entities,
            **match_data,
            "llm_analysis": llm_insights,
        }
    finally:
        os.remove(tmp_path)


@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {
        "status": "healthy",
        "llm_configured": bool(OPENROUTER_API_KEY),
        "nlp_model": "en_core_web_sm",
    }

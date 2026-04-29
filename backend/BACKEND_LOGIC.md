# 🧠 Backend Logic — Neural Resume Analyzer v2.0

> **Architecture**: Hybrid AI — Deterministic NLP (Layer 1) + LLM Deep Analysis (Layer 2)
>
> **Stack**: Python · FastAPI · spaCy · pdfplumber · Google Gemini API · httpx

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Request Lifecycle](#2-request-lifecycle)
3. [Layer 1: Deterministic NLP](#3-layer-1-deterministic-nlp)
   - [PDF Text Extraction](#31-pdf-text-extraction)
   - [Entity Extraction](#32-entity-extraction-spacy--regex)
   - [Skill Matching](#33-skill-matching-engine)
4. [Layer 2: LLM Deep Analysis](#4-layer-2-llm-deep-analysis-google-gemini)
   - [Prompt Engineering](#41-prompt-engineering)
   - [Response Parsing](#42-response-parsing)
   - [Error Handling](#43-error-handling)
5. [API Reference](#5-api-reference)
6. [Why the Hybrid Approach?](#6-why-the-hybrid-approach)
7. [Environment Setup](#7-environment-setup)

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                      │
│               Upload PDF + Optional Job Description            │
└───────────────────────────┬────────────────────────────────────┘
                            │  POST /api/analyze (multipart/form-data)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 1: PDF Text Extraction (pdfplumber)                │  │
│  │  - Opens the uploaded PDF                                │  │
│  │  - Extracts raw text from every page                     │  │
│  │  - Returns a single concatenated string                  │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               ▼                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 2: LAYER 1 — Deterministic NLP                     │  │
│  │                                                          │  │
│  │  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │  Regex Engine   │  │ spaCy NER    │  │ Skill Dict   │  │  │
│  │  │                │  │              │  │              │  │  │
│  │  │ • Emails       │  │ • ORG labels │  │ • 60+ skills │  │  │
│  │  │ • Phones       │  │ • GPE labels │  │ • keyword    │  │  │
│  │  │ • URLs/Links   │  │              │  │   matching   │  │  │
│  │  └────────────────┘  └──────────────┘  └──────────────┘  │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               ▼                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 3: Skill Match Scoring (if Job Description given)  │  │
│  │  - Extract JD skills using same dictionary               │  │
│  │  - Compare resume skills vs. JD skills                   │  │
│  │  - Compute: matched, missing, match_score (%)            │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               ▼                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 4: LAYER 2 — LLM Deep Analysis (Gemini API)       │  │
│  │                                                          │  │
│  │  • Sends resume text + JD to Gemini 2.0 Flash            │  │
│  │  • Structured prompt → JSON output                       │  │
│  │  • Returns: summary, strengths, weaknesses,              │  │
│  │    experience_level, recommendations, fit_analysis       │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               ▼                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 5: Unified JSON Response                           │  │
│  │  Combines Layer 1 + Layer 2 into a single response       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Lifecycle

When a user clicks **"Launch Analysis"** on the frontend, here is exactly what happens:

1. **Frontend** sends a `POST` request to `/api/analyze` with the PDF file and optional job description as `multipart/form-data`.
2. **FastAPI** receives the uploaded file and writes it to a temporary file on disk (required by `pdfplumber`, which needs a file path, not raw bytes).
3. **pdfplumber** opens the temp file and extracts text from every page.
4. **spaCy + Regex** (Layer 1) runs entirely locally — no network call needed. It extracts emails, phones, links, skills, and organizations in milliseconds.
5. **Skill matching** compares extracted skills against the JD to produce a match score.
6. **Gemini API** (Layer 2) is called asynchronously via `httpx`. The resume text (capped at 6000 chars) and JD are sent in a carefully engineered prompt. Gemini returns structured JSON.
7. **The response** combines both layers into a single unified JSON object and returns it to the frontend.
8. **The temp file is deleted** in a `finally` block to prevent disk leaks.

---

## 3. Layer 1: Deterministic NLP

This layer is the backbone. It is **fast** (~50ms), **free** (no API costs), **offline-capable**, and **deterministic** (same input always produces same output).

### 3.1 PDF Text Extraction

```python
def extract_text_from_pdf(file_path: str) -> str:
```

**Library**: `pdfplumber`

- Opens the PDF file page by page.
- Calls `page.extract_text()` on each page to get raw text.
- Concatenates all pages with newline separators.
- Returns the complete text as a single string.

**Why pdfplumber?** It handles complex PDF layouts (tables, columns, headers) much better than alternatives like `PyPDF2`. It can also extract tables as structured data if needed in the future.

### 3.2 Entity Extraction (spaCy + Regex)

```python
def extract_entities(text: str) -> dict:
```

This function uses **two complementary techniques**:

#### A) Regex Patterns (Rule-Based)

| Entity   | Regex Pattern                                    | Purpose                          |
|----------|--------------------------------------------------|----------------------------------|
| Emails   | `[\w\.-]+@[\w\.-]+\.\w+`                        | Matches standard email formats   |
| Phones   | `\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}`          | Matches US phone number formats  |
| Links    | `https?://[^\s,)]+`                              | Matches HTTP/HTTPS URLs          |

**Why Regex?** For structured patterns like emails and phone numbers, regex is significantly more reliable than any ML model. These patterns have well-defined formats that regex can capture with near-100% accuracy.

#### B) spaCy Named Entity Recognition (ML-Based)

```python
doc = nlp(text)
for ent in doc.ents:
    if ent.label_ == "ORG":
        entities["organizations"].append(ent.text)
```

**Model**: `en_core_web_sm` — a small but effective English NLP model trained on web text.

spaCy processes the text through a full NLP pipeline:
1. **Tokenization** — splits text into words/tokens
2. **Part-of-Speech Tagging** — identifies nouns, verbs, etc.
3. **Dependency Parsing** — understands sentence structure
4. **Named Entity Recognition** — classifies entities into categories like `ORG` (organizations), `PERSON`, `GPE` (geopolitical entities), etc.

We specifically extract `ORG` entities to find companies, universities, and organizations mentioned in the resume.

#### C) Keyword Dictionary Matching

```python
KNOWN_SKILLS = ["python", "java", "react", ...]  # 60+ skills
text_lower = text.lower()
for skill in KNOWN_SKILLS:
    if skill in text_lower:
        entities["skills"].append(skill.title())
```

We maintain a curated dictionary of **60+ technical skills** spanning:
- Programming languages (Python, Java, JavaScript, etc.)
- Frontend frameworks (React, Angular, Vue, etc.)
- Backend frameworks (FastAPI, Django, Spring Boot, etc.)
- Databases (PostgreSQL, MongoDB, Redis, etc.)
- Cloud & DevOps (AWS, Docker, Kubernetes, etc.)
- Data & ML (TensorFlow, PyTorch, Pandas, etc.)
- Tools & Practices (Git, Jira, Agile, etc.)

**Why keyword matching instead of ML?** For skill extraction, keyword matching against a curated dictionary is actually more accurate than general-purpose NER models. Skills like "React" or "Docker" are proper nouns that NER models often misclassify as organizations or locations.

### 3.3 Skill Matching Engine

```python
def compute_skill_match(resume_skills: list, job_description: str) -> dict:
```

When a Job Description is provided:

1. Scan the JD text against the same 60+ skill dictionary to find **required skills**.
2. Compare required skills against the **extracted resume skills**.
3. Categorize into:
   - **Matched Skills** — skills found in BOTH the resume and JD
   - **Missing Skills** — skills in the JD but NOT in the resume
4. Calculate **Match Score** = `(matched / total_jd_skills) × 100`

---

## 4. Layer 2: LLM Deep Analysis (Google Gemini)

This layer provides **contextual intelligence** that rules and regex simply cannot achieve. It reads the resume like a human recruiter would.

### 4.1 Prompt Engineering

The prompt is carefully structured to produce consistent, parseable JSON:

```
You are an expert HR recruiter and technical talent evaluator.
Analyze the following resume text and return a JSON object with EXACTLY these keys:

- "summary": A concise 2-3 sentence professional summary
- "strengths": An array of 3-5 key strengths
- "weaknesses": An array of 2-3 areas for improvement
- "experience_level": One of "Junior", "Mid-Level", "Senior", "Lead/Principal"
- "recommendations": An array of 2-3 actionable suggestions
- "fit_analysis": (if JD provided) 2-3 sentence job fit analysis

IMPORTANT: Return ONLY the raw JSON object. No markdown, no code fences.
```

**Key design decisions:**

| Decision | Rationale |
|----------|-----------|
| `temperature: 0.3` | Low temperature = more deterministic, less creative hallucination |
| `maxOutputTokens: 1024` | Enough for a thorough analysis, prevents runaway responses |
| Resume text capped at 6000 chars | Gemini Flash context is limited; 6K covers 2-3 pages |
| Role: "expert HR recruiter" | Primes the model to evaluate from a hiring perspective |
| "Return ONLY raw JSON" | Prevents markdown code fences that would break parsing |

### 4.2 Response Parsing

```python
raw_text = data["candidates"][0]["content"]["parts"][0]["text"]

# Clean potential markdown code fences
cleaned = raw_text.strip()
if cleaned.startswith("```"):
    cleaned = cleaned.split("\n", 1)[1]
if cleaned.endswith("```"):
    cleaned = cleaned.rsplit("```", 1)[0]

return json.loads(cleaned)
```

Despite explicit instructions, LLMs sometimes wrap JSON in markdown code fences. The parser defensively strips these before calling `json.loads()`.

### 4.3 Error Handling

The LLM layer is wrapped in comprehensive error handling:

| Error Type | Handling |
|------------|----------|
| No API key set | Returns `{"error": "GEMINI_API_KEY not set"}` — the app still works with Layer 1 only |
| HTTP errors (429, 500, etc.) | Catches `httpx.HTTPStatusError`, returns the status code and truncated error message |
| Non-JSON response | Catches `json.JSONDecodeError`, returns the raw text for debugging |
| Network timeout | 30-second timeout via `httpx.AsyncClient(timeout=30.0)` |
| Any other exception | Generic catch-all that returns the error string |

**This means the app NEVER crashes due to LLM failures.** Layer 1 always runs, and Layer 2 degrades gracefully.

---

## 5. API Reference

### `POST /api/analyze`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | PDF file | ✅ | The resume PDF to analyze |
| `job_description` | string | ❌ | Optional job description for matching |

**Response** (200 OK):

```json
{
  "status": "success",
  "filename": "resume.pdf",
  "entities": {
    "emails": ["john@example.com"],
    "phones": ["555-123-4567"],
    "links": ["https://github.com/john"],
    "skills": ["Python", "React", "Docker"],
    "organizations": ["Google", "MIT"]
  },
  "match_score": 75,
  "matched_skills": ["Python", "React"],
  "missing_skills": ["Kubernetes"],
  "llm_analysis": {
    "summary": "Experienced full-stack developer with...",
    "strengths": ["Strong backend expertise", "..."],
    "weaknesses": ["Limited cloud experience", "..."],
    "experience_level": "Mid-Level",
    "recommendations": ["Consider AWS certification", "..."],
    "fit_analysis": "The candidate aligns well with..."
  }
}
```

### `GET /api/health`

Returns the health status of the API and whether the LLM is configured.

```json
{
  "status": "healthy",
  "llm_configured": true,
  "nlp_model": "en_core_web_sm"
}
```

---

## 6. Why the Hybrid Approach?

| Aspect | Layer 1 (NLP Only) | Layer 2 (LLM Only) | Hybrid (Both) |
|--------|-------------------|-------------------|----------------|
| **Speed** | ~50ms | ~3-5 seconds | ~3-5 seconds (parallel possible) |
| **Cost** | $0 | ~$0.001/request | ~$0.001/request |
| **Accuracy (structured data)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Accuracy (contextual)** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Offline support** | ✅ | ❌ | Partial (Layer 1 works offline) |
| **Hallucination risk** | None | Possible | Mitigated (Layer 1 validates) |
| **Nuance understanding** | ❌ | ✅ | ✅ |

The hybrid approach gives you the **reliability** of deterministic NLP for hard facts (emails, phones, skills) combined with the **intelligence** of an LLM for soft analysis (strengths, career advice, job fit reasoning).

---

## 7. Environment Setup

```bash
# 1. Create and activate virtual environment
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Download spaCy language model
python -m spacy download en_core_web_sm

# 4. Set your Gemini API key (get one free at https://aistudio.google.com/apikey)
$env:GEMINI_API_KEY="your_api_key_here"   # PowerShell
# export GEMINI_API_KEY="your_api_key_here"  # Bash

# 5. Start the server
uvicorn main:app --reload --port 8000
```

> **Note**: The app works without a Gemini API key — you'll get all Layer 1 features. Layer 2 (LLM) will show a friendly "not configured" message.

# Neural Resume Analyzer

A powerful web application built with **React**, **Tailwind CSS**, and **FastAPI** that uses Natural Language Processing (via spaCy) to extract insights from resumes and measure alignment against job descriptions.

## Features
- **Modern Premium UI:** Built with Tailwind CSS, featuring glassmorphism, responsive design, dark mode aesthetics, and micro-animations.
- **NLP Powered:** Uses spaCy to perform entity recognition (Organizations, emails, phone numbers).
- **Skill Extraction:** Scans PDFs for technical skills.
- **Job Description Matching:** Compares extracted skills with a given job description to output a Match Score, Matched Skills, and Missing Skills.

## Prerequisites
- Node.js (v18+)
- Python (3.9+)

## Setup Instructions

### 1. Backend (FastAPI)
Open a terminal in the project root:
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\activate
# Activate it (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download the spaCy NLP model (Required!)
python -m spacy download en_core_web_sm

# Start the server
uvicorn main:app --reload --port 8000
```
The backend API will run on `http://localhost:8000`.

### 2. Frontend (React + Vite)
Open a new terminal in the project root:
```bash
cd frontend

# Install dependencies (already initialized, but good to ensure)
npm install

# Start the dev server
npm run dev
```
The frontend will typically run on `http://localhost:5173`. Open this URL in your browser.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS, Lucide Icons
- **Backend**: Python, FastAPI, pdfplumber (for PDF text extraction), spaCy (for NLP processing)

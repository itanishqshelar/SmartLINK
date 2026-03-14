# SmartLINK (Digital Continuity Engine)

SmartLINK is a privacy-first personal continuity web app that unifies your documents and allows you to seamlessly extract, semantically search, and interact with your uploaded data using powerful LLMs.

<p align="left">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
</p>

##  Features

- **Document Unification**: Upload and securely manage various document types (PDFs, Images, Word Documents).
- **Intelligent Extraction**: Leverages robust parsing tools and the Google Gemini API to structure, summarize, and understand document contents.
- **Semantic Vault Search**: Search across your entire knowledge base using natural language directly within the document vault—bringing context rather than just keyword hits.
- **Privacy & Security First**: Keeps your processed data minimal, structured, and entirely under your control via a local SQLite database.
- **Beautiful, Responsive UI**: A meticulously crafted interface using React, Tailwind CSS, and precise typography for a premium, unified user experience.

##  Tech Stack

### Frontend
- **Framework**: React 18 powered by Vite
- **Styling**: Tailwind CSS with custom styling tokens
- **Icons & UI**: Lucide React
- **Routing & Networking**: React Router, Axios
- **Markdown Rendering**: React Markdown

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite managed via SQLModel (ORM)
- **AI Integration**: Google Generative AI (`google-generativeai`)
- **Document Processing**: `pdfplumber`, `PyMuPDF` (`fitz`), `python-docx`
- **ASGI Server**: Uvicorn

## Getting Started

### Prerequisites
- Python 3.9+ 
- Node.js 18+
- A [Google Gemini API Key](https://aistudio.google.com/)

### Backend Setup

#### Quick Start (Windows)
We provide batch scripts to automate the backend setup and startup process.

1. **Initial Setup:** Run `setup.bat` in the `backend` directory to create the virtual environment, install dependencies, and create a `.env` file template if it doesn't exist.
   ```cmd
   cd backend
   setup.bat
   ```
2. **Add API Key:** Open the `backend/.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
3. **Start the Server:** Run `start.bat` to cleanly activate the environment and launch the API server.
   ```cmd
   start.bat
   ```
   *The backend will be available at `http://localhost:8000`.*

#### Manual Setup (macOS/Linux or Manual Windows)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Set up a virtual environment (recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install backend dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**  
   Create a `.env` file in the `backend/` directory and add your keys:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

5. **Start the API server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend will be available at `http://localhost:8000`.*

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**  
   Open your browser and seamlessly navigate to `http://localhost:5173` (or the port specified by Vite in the terminal). 

---

*Engineered with focus on digital continuity and privacy.*

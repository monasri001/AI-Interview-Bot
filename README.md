# 🎤 AI Interview Practice Voice Bot for Indians

An AI-powered voice-based interview simulator designed to help Indian students practice technical and HR interviews using real-time voice interaction and AI feedback.

This project simulates a real interviewer by asking questions through voice, listening to the candidate’s spoken answers, evaluating them using AI, and providing constructive feedback with scores and suggestions.

---

# 🚀 Features

### 🎙 Voice-Based Interview

* AI asks interview questions using text-to-speech.
* Users answer using their microphone.
* Speech is converted to text using Speech Recognition.

### 🤖 AI Interviewer

* Generates interview questions dynamically.
* Supports multiple interview domains:

  * Software Development
  * Data Science
  * Artificial Intelligence / Machine Learning
  * HR / Behavioral Interviews
  * General Aptitude

### 📊 Intelligent Answer Evaluation

The AI evaluates answers based on:

* Communication clarity
* Technical correctness
* Confidence level
* Completeness of response

### 🧠 AI Feedback System

After each response, the system provides:

* Score out of 10
* Strengths in the answer
* Areas for improvement
* Suggested better answer

### 🔊 Voice Feedback

AI converts feedback into speech so the system behaves like a real interviewer.

### 📈 Interview Progress Tracking

* Question counter
* Interview progress
* Final performance summary

---

# 🛠 Tech Stack

### Backend

* Python
* Flask

### Frontend

* HTML
* CSS
* JavaScript
* Bootstrap

### AI & Voice Technologies

* OpenAI GPT API
* SpeechRecognition (Speech-to-Text)
* gTTS / pyttsx3 (Text-to-Speech)

### Deployment

* Replit

---

# 📂 Project Structure

```
AI-Interview-Voice-Bot
│
├── app.py
├── requirements.txt
├── .env
│
├── templates
│   └── index.html
│
├── static
│   ├── style.css
│   └── script.js
│
└── README.md
```

---

# ⚙️ Installation

## 1️⃣ Clone the Repository

```
git clone https://github.com/yourusername/AI-Interview-Voice-Bot.git
cd AI-Interview-Voice-Bot
```

---

## 2️⃣ Install Dependencies

```
pip install -r requirements.txt
```

---

## 3️⃣ Set Environment Variables

Create a `.env` file and add:

```
OPENAI_API_KEY=your_openai_api_key
```

---

## 4️⃣ Run the Application

```
python app.py
```

Open the browser:

```
http://localhost:5000
```
---





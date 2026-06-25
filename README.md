# GitHub Analyzer AI

GitHub Analyzer AI is an AI-powered developer portfolio analysis tool that evaluates GitHub profiles, detects stack and project signals, generates recruiter-style feedback, and includes a competitive **MOG Showdown** mode to compare two GitHub portfolios with certain metrics.

**Live Demo:** https://github-analyzer-ai-iota.vercel.app/ 

---

## Overview

GitHub profiles are often difficult to evaluate quickly. A developer may have multiple repositories, different languages, incomplete READMEs, missing deployment links, or unclear project descriptions.

GitHub Analyzer AI helps solve that problem by turning public GitHub profile data into useful portfolio insights. The app analyzes repositories, detects languages and tools, reviews project signals, and uses AI to generate feedback from the perspective of a technical recruiter.

The project also includes **MOG Showdown**, a competitive comparison mode where two GitHub profiles are compared side by side to determine which portfolio is stronger for a selected target role.

---

## Features

### GitHub Profile Analysis

* Search any public GitHub username
* View profile information, followers, repositories, and activity signals
* Display top repositories
* Analyze language distribution
* Detect visible stack/tools from repository data and README content

### AI Recruiter Feedback

* Generates recruiter-style feedback for a selected target role
* Identifies strengths, weaknesses, red flags, and missing signals
* Suggests role-specific improvements
* Provides practical next steps for improving a GitHub portfolio

### MOG Showdown

* Compare two GitHub profiles side by side
* Select a target role such as Software Engineering, AI Engineering, Machine Learning, Data Science, Frontend, Backend, or Full-Stack
* Generate scorecards for both profiles
* Compare project depth, stack strength, role fit, documentation, activity, and public signal
* Get an AI-powered MOG verdict explaining whose GitHub portfolio is stronger and why

### Deployment + Analytics

* Deployed publicly with Vercel
* Uses Vercel Analytics to track site visits and usage
* Environment variables used for API configuration

---

## Tech Stack

* **React**
* **Vite**
* **JavaScript**
* **GitHub REST API**
* **Groq API**
* **Recharts**
* **CSS**
* **Vercel**
* **Vercel Analytics**

---

## Screenshots


![Analyzer Dashboard](screenshots/analyzer.png)
![MOG Showdown](screenshots/mogshowdown.png)


---

## How It Works

1. The user enters a GitHub username.
2. The app fetches public GitHub profile and repository data.
3. Repository data is processed into languages, top repos, activity, and stack signals.
4. README and project metadata are used to detect additional frameworks/tools where available.
5. The app displays visual portfolio insights.
6. AI generates recruiter-style feedback based on the selected target role.
7. In MOG Showdown, two profiles are compared and scored.
8. The AI verdict explains which profile is stronger and how the weaker profile can improve.

---

## MOG Showdown Scoring Signals

The MOG score considers:

* Project depth
* Stack strength
* Role fit
* README/documentation quality
* Deployment and polish
* Recent activity
* Repository descriptions
* Language and framework variety
* Public signal such as stars/forks
* Top repository strength

The goal is not just to compare raw numbers. The goal is to estimate how strong each GitHub portfolio looks from a technical recruiting perspective.

---

## What I Learned

While building this project, I practiced:

* React component structure
* State management
* API fetching with async/await
* GitHub REST API integration
* AI API integration with Groq
* Processing and transforming repository data
* Building reusable UI components
* Chart rendering with Recharts
* Environment variables and deployment configuration
* Deploying a live React app with Vercel
* Adding analytics to a deployed project
* Debugging production deployment issues

---

## Run Locally

Clone the repository:

```bash
git clone https://github.com/Med-NCoding/Github-Analyzer.git
cd Github-Analyzer
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```bash
VITE_GROQ_API_KEY=your_groq_api_key_here
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Future Improvements

* Add deeper commit history analysis
* Improve project quality scoring using more repository files
* Add shareable MOG Challenge links
* Add exportable portfolio report cards
* Add more detailed usage analytics for profile searches and MOG battles
* Add backend/serverless API route for stronger API key protection

---

## Resume Bullet

Built and deployed an AI-powered GitHub portfolio analysis tool using React, Vite, GitHub REST API, Groq API, Recharts, and Vercel; analyzes repository data, detects stack signals, generates recruiter-style feedback, and compares developer profiles through an AI-powered MOG Showdown mode.

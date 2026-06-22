# 🧠 TestMind — AI-Native QA Intelligence Platform

> **Plug in your GitHub repo. Get risk scores, AI-generated tests, and defect explanations — in one command.**

[![CI](https://github.com/bkumars22/TestMind/actions/workflows/ci.yml/badge.svg)](https://github.com/bkumars22/TestMind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![Java 17](https://img.shields.io/badge/Java-17-orange?style=flat-square)](https://openjdk.org)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)

---

## What is TestMind?

TestMind is an AI-native QA layer you can plug into any live project without rewriting your stack.

It connects to your GitHub repo, reads changed files from every commit, scores risk using **IsolationForest ML**, generates missing Playwright tests, explains defects in plain language, and posts results to Jira and Slack — **fully autonomous**.

| Feature | How it works |
|---------|-------------|
| 🔴 **Risk Scoring** | IsolationForest ML — flags high-risk files with no labelled training data |
| 🤖 **AI Test Generation** | LangGraph agent generates Playwright TypeScript tests for untested high-risk files |
| 💡 **Defect Explanation** | Groq Llama-3.3-70b explains every defect: what broke, why, root cause, fix |
| 📊 **Quality Score** | deepeval scores AI explanations — rejects hallucinations automatically |
| 🎫 **Jira Integration** | P0/P1 defects auto-create Jira tickets with AI explanation as description |
| 💬 **Slack Alerts** | Risk summary + defect counts posted to #qa-alerts after every run |
| 📡 **Live Dashboard** | React dashboard with WebSocket live progress during analysis |
| 🔐 **Enterprise Security** | JWT HS512, BCrypt-12, RBAC, OWASP headers, rate limiting |

---

## Quick Start

```bash
git clone https://github.com/bkumars22/TestMind.git
cd TestMind
cp .env.example .env
# Edit .env — minimum required: GROQ_API_KEY + GITHUB_TOKEN + POSTGRES_PASSWORD + JWT_SECRET
docker compose up --build
```

Open **http://localhost:3000**

Login: `admin@testmind.io` / `Admin@2026`

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      TestMind                            │
├──────────────┬─────────────────────┬─────────────────────┤
│  Frontend    │  Backend            │  AI Engine          │
│  React 18    │  Spring Boot 3.2    │  FastAPI + Python   │
│  TypeScript  │  Java 17 · 18 APIs  │  LangGraph 7 nodes  │
│  Tailwind    │  JWT · RBAC · AOP   │  Groq Llama-3.3-70b │
├──────────────┴─────────────────────┴─────────────────────┤
│                  MCP Layer (5 servers)                   │
│  Playwright · GitHub · Filesystem · Jira · Slack         │
├──────────────────────────────────────────────────────────┤
│  ML Layer: IsolationForest · deepeval · scikit-learn     │
├──────────────────────────────────────────────────────────┤
│  PostgreSQL 15 · Flyway migrations · Redis               │
└──────────────────────────────────────────────────────────┘
```

## LangGraph Agent — 7 Nodes

```
fetch_codebase → score_risk → identify_gaps → generate_tests
       → detect_defects → explain_and_score → dispatch_results
```

| Node | Action |
|------|--------|
| 1. fetch_codebase | Clone/fetch changed files from last commit via GitHub API |
| 2. score_risk | IsolationForest per file — flags anomalies with no training data |
| 3. identify_gaps | Map source → test files, find untested high-risk code |
| 4. generate_tests | Groq LLM generates Playwright TypeScript tests per gap |
| 5. detect_defects | Analyse test results, assign P0/P1/P2/P3 severity |
| 6. explain_and_score | Groq explains each defect + deepeval quality gate (≥ 0.85) |
| 7. dispatch_results | Parallel: Jira tickets + Slack message + JSON report + backend callback |

---

## API Reference

Swagger UI: **http://localhost:8080/swagger-ui.html**

18 REST endpoints — auth, projects, test runs, defects, risk, dashboard, MCP.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Free at [console.groq.com](https://console.groq.com) |
| `GITHUB_TOKEN` | ✅ | PAT with repo + issues scope |
| `POSTGRES_PASSWORD` | ✅ | Any strong password |
| `JWT_SECRET` | ✅ | 64-char random hex string |
| `JIRA_URL` | Optional | Auto-create defect tickets |
| `JIRA_EMAIL` | Optional | Your Atlassian email |
| `JIRA_API_TOKEN` | Optional | From Atlassian profile |
| `SLACK_BOT_TOKEN` | Optional | Post to #qa-alerts |

---

## Built by

**B KumaraSwamy** — [github.com/bkumars22](https://github.com/bkumars22) · Bangalore, India · 2026

*"89% of teams experiment with AI in QA. Only 15% reach enterprise scale. TestMind closes that gap."*

---

**MIT License** — free to use, modify, and distribute.

# Prelegal

A SaaS app for drafting legal agreements through AI-assisted chat. Users describe what they need in plain language, and the AI extracts the relevant details to populate and generate a ready-to-download legal document.

## Features

- **AI chat interface** — conversational document creation; the AI asks clarifying questions and confirms details before finalizing
- **12 document types** — Mutual NDA, Cloud Service Agreement, Design Partner Agreement, SLA, Professional Services Agreement, Data Processing Agreement, Software License Agreement, Partnership Agreement, Pilot Agreement, Business Associate Agreement, AI Addendum, and more
- **Live preview** — document preview updates in real time as the AI gathers information
- **PDF download** — export the completed document as a PDF
- **User accounts** — sign up, sign in, and save/manage your documents

## Tech Stack

- **Frontend**: Next.js (statically built, served by FastAPI)
- **Backend**: FastAPI (Python, via `uv`)
- **Database**: SQLite (created fresh on container start)
- **AI**: LiteLLM via OpenRouter with Cerebras inference (`openrouter/openai/gpt-oss-120b`)
- **Packaging**: Docker

## Getting Started

```bash
# Mac
./scripts/start-mac.sh

# Linux
./scripts/start-linux.sh

# Windows
./scripts/start-windows.ps1
```

The app runs at [http://localhost:8000](http://localhost:8000).

## Templates

Document templates are sourced from [Common Paper](https://github.com/CommonPaper) under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.

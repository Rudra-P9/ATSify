<div align="center">

# ATSify Intelligence — Beat the Algorithm

<p align="center">
	<a href="https://github.com/Rudra-P9/ATSify/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Rudra-P9/ATSify?style=social"></a>
	<a href="https://github.com/Rudra-P9/ATSify/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/Rudra-P9/ATSify?style=social"></a>
	<a href="#tech-stack"><img alt="Built with" src="https://img.shields.io/badge/Built%20with-Vite%20·%20React%20·%20Twin-915EFF"></a>
	<a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue"></a>
	<a href="https://ais-pre-xh2hzvdb4m432ksnz22ire-428353312043.us-east1.run.app"><img alt="Live" src="https://img.shields.io/badge/live-atsify--intel-00C853"></a>
</p>

<p align="center">
	<a href="https://github.com/Rudra-P9/ATSify/issues"><img alt="Issues" src="https://img.shields.io/github/issues/Rudra-P9/ATSify?color=%23915EFF"></a>
	<a href="https://github.com/Rudra-P9/ATSify/pulls"><img alt="PRs" src="https://img.shields.io/github/issues-pr/Rudra-P9/ATSify?color=%2300B8D9"></a>
	<img alt="Last commit" src="https://img.shields.io/github/last-commit/Rudra-P9/ATSify?color=%23A3E635">
	<img alt="Top language" src="https://img.shields.io/github/languages/top/Rudra-P9/ATSify?color=%23F59E0B">
	<img alt="Repo size" src="https://img.shields.io/github/repo-size/Rudra-P9/ATSify?color=%239999FF">
	<a href="#contributing"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg"></a>
</p>

</div>

<p align="center">
	<picture>
		<img src="public/assets/images/logo.jpeg" alt="ATSify Intelligence Logo" width="120" style="border-radius: 20px" />
	</picture>
</p>

**ATSify Intelligence** is an immersive, high-fidelity resume analysis engine designed to simulate enterprise Applicant Tracking Systems (ATS). Built with React 18, TypeScript, and powered by Google Gemini 1.5 Flash, it reverse-engineers the scoring logic of platforms like Workday, Taleo, and Greenhouse to give job seekers an unfair advantage.

<p align="center"><strong><a href="https://atsify-scanner.vercel.app/">Live Demo → Initializing System...</a></strong></p>

<details>
	<summary><b>Table of Contents</b></summary>

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [FAQ](#faq)
- [Maintainer](#maintainer)
- [License](#license)
- [Contact](#contact)

</details>

## Overview

Traditional resume checkers provide generic advice. **ATSify Intelligence** provides deterministic simulation. By analyzing resume depth, formatting risks, and keyword density against specific job descriptions, the engine generates parallel scores for 6 major enterprise ATS platforms simultaneously. It utilizes AI-driven "Intelligence Scanning" to identify future-dated entries, quantified achievement gaps, and formatting "poison" that stops recruiters from seeing your data.

## Features

- **Cinematic Startup**: A multi-phase holographic initialization sequence (Globe -> Data Extraction -> System Ready).
- **Multi-System Simulation**: Parallel scoring for Workday, Taleo, iCIMS, Greenhouse, Lever, and SuccessFactors.
- **Deep Skill Parsing**: Sophisticated keyword extraction with color-coded "Matched" vs "Missing" visual feedback.
- **Priority Focus Areas**: Interactive, expandable analysis of Formatting, Experience Quality, and Section Structure.
- **AI-Powered Insights**: Powered by Gemini 1.5 Flash for nuanced understanding of experience impact beyond simple keyword matching.
- **Persistence**: Firebase-backed user authentication and scan history tracking.
- **Export Capabilities**: High-fidelity PDF report generation for offline review.
- **Ultra-Wide Responsive**: Optimized for large displays (up to 1600px) and fully responsive for mobile candidates.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| AI Engine | Google Gemini 1.5 Flash SDK |
| Backend/DB | Firebase Auth, Firestore |
| Styling | Tailwind CSS v4, Motion (Framer) |
| Icons | Lucide React |
| Tooling | tsx, ESLint, PDF-lib |
| Deployment | Cloud Run / Google Hosting |

## Architecture

```mermaid
flowchart TD
  A["App Initialization"] --> B["IntroScreen (Cinematic)"]
  B --> C["Landing / Auth"]
  C --> D["ScannerSection"]
  D --> E["PDF/Text Parser"]
  E --> F["Gemini AI Pipeline"]
  F --> G["Platform Scorer System"]
  G --> H["Results Dashboard"]
  H --> I["Firestore Persistence"]
  H --> J["PDF Export Engine"]
```

## Quick Start

**Prerequisites**
- Node.js 20+
- Firebase Project
- Gemini API Key

**Install and run**

```bash
npm install
npm run dev
```

**Build and preview**

```bash
npm run build
npm run preview
```

## Environment Variables

The application requires a Gemini API key and Firebase configuration. Define these in your environment:

```dotenv
# Gemini AI
GEMINI_API_KEY=your_gemini_key_here

# Firebase (Client Side)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

## Scripts

| Script | Action |
|---|---|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Build production-ready assets |
| `npm run preview` | Run local preview of production build |
| `npm run lint` | Run TypeScript type-checking |

## Project Structure

```
ATSify/
├─ src/
│  ├─ components/
│  │  ├─ IntroScreen.tsx      # Multi-phase holographic entry
│  │  ├─ Loading.tsx          # "Reactor Core" animation for scanning
│  │  ├─ ScannerSection.tsx    # Resume/JD upload logic
│  │  └─ ScoreHeader.tsx       # Results visualization
│  ├─ lib/
│  │  ├─ gemini.ts           # AI Analysis pipeline
│  │  ├─ parser/             # PDF/Docx extraction
│  │  └─ platforms/          # ATS logic definitions
│  ├─ App.tsx                # Main state & route management
│  └─ index.css              # Tailwind + Custom Animations
├─ firestore.rules           # Hardened security policies
└─ firebase-blueprint.json   # Data structure IR
```

## Deployment

The app is optimized for Cloud Run or any static hosting service that supports environment variables. Firebase security rules are managed via `firestore.rules` and should be deployed alongside database changes.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git commit -m 'feat: add amazing feature'`)
5. Open a Pull Request

## Maintainer

<table>
	<tr>
		<td width="80">
			<img src="https://github.com/Rudra-P9.png" width="72" height="72" style="border-radius:50%" alt="Rudra Patel" />
		</td>
		<td>
			<b>Rudra Patel</b><br/>
			Computer Science — University of South Carolina<br/>
			<a href="mailto:Rudra.patel70@yahoo.com">Email</a> •
			<a href="https://www.linkedin.com/in/rudrap9/">LinkedIn</a> •
			<a href="https://github.com/Rudra-P9">GitHub</a>
		</td>
	</tr>
	<tr>
		<td colspan="2">
			⭐ If ATSify helped you land an interview, consider starring the repo!
		</td>
	</tr>
</table>

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

- **Email:** Rudra.patel70@yahoo.com
- **LinkedIn:** [linkedin.com/in/rudrap9/](https://www.linkedin.com/in/rudrap9/)
- **Instagram:** [@rudra_p9](https://www.instagram.com/rudra_p9/)

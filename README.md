# Queer Jewish Personals

A community-oriented personals website for queer Jewish people to connect, build relationships, and find meaningful connections. Built with Astro and designed with accessibility and inclusivity in mind.

## Features

- **Browse Personals**: View and search through personal ads with filtering options
- **Submit Ads**: Submit your own personal ad through Google Forms
- **Content Management**: Automated pipeline that syncs approved submissions from Google Sheets
- **Mobile-First Design**: Responsive design that works on all devices

## Tech Stack

- **Framework**: [Astro](https://astro.build/) - Static site generator
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Content Management**: Google Sheets + GitHub Actions
- **Deployment**: GitHub Pages

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud account
- GitHub repository

### Installation

1. Clone the repository:
```bash
git clone git@github.com:shirgoldbird/queerjews.com.git
cd queerjews.com
```

2. Install dependencies:
```bash
npm install
```

3. Set up Google Sheets API:
```bash
npm run setup
```

4. Create a `.env` file:
```bash
cp .env.example .env
# Edit .env with your spreadsheet ID and credentials
```

5. Start development:
```bash
npm run dev
npm run build    # Build for production
npm run preview  # Preview production build
```
```

## Content Management Setup

### 1. Google Sheets Structure

The script expects a Google Form to handle responses that's hooked up to a Google Sheet.

The spreadsheet should have a "Mirror" tab with a formula like `={'Form Responses 1'!A:J }`. This is because otherwise form responses "push down" pre-entered formula data, and we have other scripts that do automation on form responses and write data to the sheet. We'll only pull data from the "Mirror" tab.

### 2. GitHub Secrets

Add these to your repository secrets:
- `GOOGLE_SPREADSHEET_ID`: Your spreadsheet ID
- `GOOGLE_SHEETS_CREDENTIALS`: Service account JSON (recommended) or OAuth2 credentials

### 3. Testing

```bash
# Test with sample data
npm run test-sync

# Validate sheet structure
npm run validate-sheet

# Test with real data, without updating personals.json
npm run test-real

# Run sync manually, updating personals.json
npm run sync
```

## Deployment

The site automatically deploys to GitHub Pages when:
- Content is synced from Google Sheets (daily at 2 AM UTC)
- Manual workflow is triggered
- Changes are pushed to main branch

## Project Structure

```
src/
├── components/         # Reusable components
├── layouts/            # Page layouts
├── pages/              # Astro pages
└── data/               # Generated from Google Sheets
    └── personals.json

scripts/                # Testing and validation scripts
.github/
└── workflows/          # GitHub Actions
    └── content-sync.yml

appscript/
└── Code.js              # Google Apps Script

```

## Content Pipeline

1. **User submits** → Google Form → Google Sheets
2. **Moderator reviews** → Marks "Approved?" as "Yes"
3. **Google Apps Script** → Automatically create a fresh Google response form + share it with submitter when a personal is approved 
3. **GitHub Actions** → Fetches approved submissions → Generates JSON
4. **Site rebuilds** → Deploys to GitHub Pages

## License

See LICENSE file for details.
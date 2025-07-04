# Queer Jewish Personals

A community-oriented personals website for queer Jewish people to connect, build relationships, and find meaningful connections. Built with Astro and designed with accessibility and inclusivity in mind.

## Features

- **Browse Personals**: View and search through personal ads with filtering options
- **Submit Ads**: Submit your own personal ad through Google Forms (or email)
- **Community Guidelines**: Clear guidelines for creating a safe, inclusive space
- **Mobile-First Design**: Responsive design that works on all devices
- **Client-Side Filtering**: Fast search and filtering without page reloads
- **Accessibility**: Built with semantic HTML and proper contrast ratios

## Tech Stack

- **Framework**: [Astro](https://astro.build/) - Static site generator
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Typography**: Google Fonts (Inter + Playfair Display)
- **Deployment**: GitHub Pages
- **Content**: JSON files (generated from Google Sheets via GitHub Actions)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/queer-jewish-personals.git
cd queer-jewish-personals
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:4321`

### Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Header.astro    # Site navigation
│   ├── Footer.astro    # Site footer
│   ├── PersonalCard.astro  # Individual personal ad card
│   └── SearchFilter.astro  # Search and filtering component
├── layouts/            # Page layouts
│   └── Layout.astro    # Main layout with SEO
├── pages/              # Astro pages
│   ├── index.astro     # Homepage with personals grid
│   ├── about.astro     # About page with guidelines
│   └── submit.astro    # Submit page with form
└── data/               # Sample data
    └── personals.json  # Personal ads data
```

## Content Management

### Adding Personal Ads

Personal ads are stored in JSON format. Each ad should include:

```json
{
  "id": "unique-id",
  "personal": "Long form description...",
  "contact": "link_to_google_form",
  "date_posted": "2025-01-15",
  "category": "dating|friendship|community|activity",
  "location": "nyc|la|chicago|online"
}
```

### Categories
- **dating**: Romantic connections
- **friendship**: Platonic friendships
- **community**: Community building and events
- **activity**: Activity partners and shared interests

### Locations
- **nyc**: New York City
- **la**: Los Angeles
- **chicago**: Chicago
- **online**: Online connections

## Deployment

### GitHub Pages

1. Update `astro.config.mjs` with your repository details:
```javascript
export default defineConfig({
  integrations: [tailwind()],
  site: 'https://yourusername.github.io',
  base: '/queer-jewish-personals'
});
```

2. Build the project:
```bash
npm run build
```

3. Deploy to GitHub Pages:
```bash
npm run deploy
```

### Custom Domain

To use a custom domain:

1. Add your domain to the `site` field in `astro.config.mjs`
2. Remove the `base` field if using a root domain
3. Configure your domain's DNS settings

## Content Integration

### Google Sheets Integration

The site is designed to work with content from Google Sheets via GitHub Actions:

1. Set up a Google Sheet with columns matching the JSON structure
2. Create a GitHub Action to fetch and convert the data to JSON
3. The JSON files will be automatically deployed with the site

### Manual Content Updates

For manual updates:

1. Edit the JSON files in `src/data/`
2. Rebuild and deploy the site
3. Content will be immediately available

## Customization

### Colors

Update the color scheme in `tailwind.config.mjs`:

```javascript
colors: {
  primary: {
    // Your primary color palette
  },
  secondary: {
    // Your secondary color palette
  }
}
```

### Typography

Change fonts in `tailwind.config.mjs`:

```javascript
fontFamily: {
  sans: ['Your Font', 'system-ui', 'sans-serif'],
  serif: ['Your Serif Font', 'serif'],
}
```

### Styling

- Global styles are in `src/layouts/Layout.astro`
- Component-specific styles use Tailwind classes
- Custom CSS can be added to the global style block

## Community Guidelines

This platform is built for the queer Jewish community with the following principles:

- **Inclusivity**: Welcoming all gender identities, sexual orientations, and Jewish backgrounds
- **Respect**: No discrimination, harassment, or hate speech
- **Authenticity**: Encouraging genuine connections and honest communication
- **Safety**: Protecting privacy and promoting safe interactions
- **Community**: Building meaningful relationships beyond just dating

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please contact us through the site's contact form or create an issue on GitHub.

---

Built with ❤️ for the queer Jewish community

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

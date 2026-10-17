# Jagannath Badi — ECE Portfolio

Personal portfolio for Jagannath Badi, an Electronics and Telecommunication Engineering student exploring electronics, intelligent software, and physical systems.

## Stack

- [Astro](https://astro.build/) for the statically rendered site
- TypeScript support through Astro
- Tailwind CSS v4 through the Astro Vite integration
- Locally bundled [Manrope Variable](https://fontsource.org/fonts/manrope) for headings and body text
- Locally bundled [IBM Plex Mono](https://fontsource.org/fonts/ibm-plex-mono) for technical labels and metadata

## Features

- Responsive mobile, tablet, and desktop layouts
- Engineering-themed circuit and system visuals
- Project showcases with accurate project-status labels
- Accessible skip-link and anchor navigation
- Visible keyboard focus states
- Reduced-motion support for animations and smooth scrolling
- Lightweight client-side enhancements without an animation library

## Engineering Case Studies

The portfolio features an administrative CMS and structured JSON case-study pipeline backed by Supabase. Case studies include interactive telemetry headers, 2×2 datasheet matrices, dynamic subsystem breakdowns, technical callout blocks, and responsive architecture views. Projects and drafts are managed dynamically through `/admin`.

## Prerequisites

- Node.js `22.12.0` or newer
- npm

## Local development

Install dependencies from the repository root:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

The site is available at `http://localhost:4321`.

Build the static site:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

GitHub Pages deployment is planned for a future step but is not configured yet.

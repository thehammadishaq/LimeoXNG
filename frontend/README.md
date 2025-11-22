# Vite + React + TypeScript + Tailwind CSS

A modern React application built with Vite, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## Tech Stack

- **Vite** - Next generation frontend tooling
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework

## Project Structure

```
FrontendVite/
├── public/          # Static assets
├── src/
│   ├── App.tsx      # Main App component
│   ├── main.tsx     # Entry point
│   ├── index.css    # Global styles with Tailwind directives
│   └── vite-env.d.ts # Vite type definitions
├── index.html       # HTML template
├── vite.config.ts   # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js # PostCSS configuration
└── tsconfig.json    # TypeScript configuration
```


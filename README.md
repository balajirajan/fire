# Wealth Tracker

A modern web application to track your financial assets, liabilities, and net worth.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

```bash
cd ~/downloads/fire
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features (Planned)

- Dashboard with net worth overview
- Asset tracking
- Liability tracking
- Financial goals
- Portfolio visualization
- Expense tracking

## Project Structure

```
fire/
├── src/
│   ├── main.tsx       # React entry point
│   ├── App.tsx        # Main app component
│   ├── App.css        # App styles
│   └── index.css      # Global styles
├── index.html         # HTML entry point
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config
├── vite.config.ts     # Vite config
├── tailwind.config.js # Tailwind config
└── postcss.config.js  # PostCSS config
```

## Development Notes

- Uses Tailwind CSS for utility-first styling
- Configured with TypeScript for type safety
- Vite for fast development and optimized builds

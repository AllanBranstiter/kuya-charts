# Kuya Charts

A modern stock charting application with real-time data visualization, built with React, TypeScript, and TradingView's Lightweight Charts.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TradingView Lightweight Charts** for professional charting
- **Tailwind CSS** for styling

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Axios** for API requests
- **Alpha Vantage API** for stock data

## 📁 Project Structure

```
kuya-charts/
├── frontend/           # React frontend application
│   ├── src/           # Source files
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
├── backend/           # Express backend API
│   ├── src/           # Source files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── shared/            # Shared types and utilities
├── package.json       # Root package.json (monorepo)
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Alpha Vantage API key (get it free at https://www.alphavantage.co/support/#api-key)

### Installation

1. **Clone the repository** (or navigate to the project directory)
   ```bash
   cd /Users/allanbranstiter/Documents/GitHub/kuya-charts
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies for monorepo (frontend + backend)
   npm install
   ```

3. **Set up environment variables**

   **Backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your Alpha Vantage API key
   ```

   **Frontend (optional):**
   ```bash
   cd frontend
   cp .env.example .env
   # Modify if needed (defaults should work)
   ```

4. **Run the development servers**

   From the root directory:
   ```bash
   # Run both frontend and backend
   npm run dev

   # Or run them separately:
   npm run dev:frontend    # Runs on http://localhost:3000
   npm run dev:backend     # Runs on http://localhost:5000
   ```

## 📝 Available Scripts

### Root Level (Monorepo)
- `npm run dev` - Run both frontend and backend in development mode
- `npm run dev:frontend` - Run only the frontend
- `npm run dev:backend` - Run only the backend
- `npm run build` - Build both frontend and backend for production
- `npm run build:frontend` - Build only the frontend
- `npm run build:backend` - Build only the backend

### Frontend (in `/frontend`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (in `/backend`)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled JavaScript (production)

## 🌟 Features (Planned)

- [ ] Real-time stock price charts
- [ ] Multiple chart types (candlestick, line, area)
- [ ] Technical indicators
- [ ] Stock search functionality
- [ ] Watchlist management
- [ ] Historical data analysis
- [ ] Responsive design for mobile and desktop

## 🔑 API Keys

This project uses the Alpha Vantage API for stock data. You'll need to:

1. Sign up for a free API key at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Add it to your `backend/.env` file:
   ```
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   ```

**Note:** The free tier has rate limits. Check [Alpha Vantage documentation](https://www.alphavantage.co/documentation/) for details.

## 🧪 Development Status

**Current Milestone:** 1.1 - Project Setup & Basic Structure ✅

This project is in early development. The basic structure, TypeScript configurations, and development environment have been set up.

## 📄 License

ISC

## 👤 Author

Your Name

---

Built with ❤️ using React, TypeScript, and TradingView Lightweight Charts

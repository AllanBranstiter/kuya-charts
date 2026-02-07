# Kuya Charts Frontend

Frontend application for displaying stock charts with TradingView Lightweight Charts.

## Features

- Stock symbol input with validation
- Timeframe selector (15min, 30min, 1hour, daily, weekly)
- Interactive candlestick charts
- Loading states
- Error handling
- Responsive design with Tailwind CSS

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Chart.tsx              # Lightweight Charts integration
│   │   ├── SymbolInput.tsx        # Stock symbol input component
│   │   └── TimeframeSelector.tsx  # Timeframe selection component
│   ├── services/
│   │   └── stockApi.ts            # API service for fetching stock data
│   ├── types/
│   │   └── stock.ts               # TypeScript interfaces and types
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles with Tailwind
├── .env                           # Environment variables
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Running the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file with:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Components

### Chart Component
- Integrates TradingView Lightweight Charts
- Displays candlestick series
- Handles responsive resizing
- Auto-cleanup on unmount

### SymbolInput Component
- Text input for stock symbols
- Real-time validation (1-5 uppercase letters)
- Submit via button or Enter key
- Displays validation errors

### TimeframeSelector Component
- Radio-style button group
- Options: 15min, 30min, 1hour, daily, weekly
- Visual indication of selected timeframe
- Disabled state during loading

### App Component
- Main layout and state management
- Coordinates data fetching
- Handles loading and error states
- Empty state when no data

## API Integration

The frontend connects to the backend API at `http://localhost:5000/api` and uses:

- `GET /stock/:symbol/daily` - Fetch daily stock data
- `GET /stock/:symbol/intraday?interval=<interval>` - Fetch intraday data

## User Flow

1. User enters a stock symbol (e.g., "AAPL")
2. User selects a timeframe (default: daily)
3. Application fetches data from backend
4. Chart displays candlestick data
5. User can change timeframe or symbol to refresh

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lightweight Charts** - Charting library

## Milestone 1.3 Completed

✅ React app with basic layout  
✅ Symbol input field with validation  
✅ Timeframe selector (15min, 30min, 1hour, daily, weekly)  
✅ Lightweight Charts integration  
✅ Display candlestick chart from API data  
✅ Loading states and error handling  
✅ Responsive design with Tailwind CSS

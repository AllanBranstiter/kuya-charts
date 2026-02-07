import { useState, FormEvent, ChangeEvent } from 'react';

interface SymbolInputProps {
  onSubmit: (symbol: string) => void;
  disabled?: boolean;
}

export default function SymbolInput({ onSubmit, disabled = false }: SymbolInputProps) {
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState('');

  const validateSymbol = (value: string): boolean => {
    // Validate: only letters, 1-5 characters typical for stock symbols
    const symbolRegex = /^[A-Z]{1,5}$/;
    return symbolRegex.test(value);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSymbol(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!symbol.trim()) {
      setError('Please enter a stock symbol');
      return;
    }

    if (!validateSymbol(symbol)) {
      setError('Invalid symbol. Use 1-5 uppercase letters (e.g., AAPL)');
      return;
    }

    setError('');
    onSubmit(symbol);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={symbol}
            onChange={handleChange}
            placeholder="Enter stock symbol (e.g., AAPL)"
            disabled={disabled}
            maxLength={5}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          Get Chart
        </button>
      </div>
    </form>
  );
}

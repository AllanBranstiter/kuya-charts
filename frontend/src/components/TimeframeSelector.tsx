import { Timeframe } from '../types/stock';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  disabled?: boolean;
}

const timeframes: { value: Timeframe; label: string }[] = [
  { value: '15min', label: '15min' },
  { value: '30min', label: '30min' },
  { value: '1hour', label: '1 hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export default function TimeframeSelector({ selected, onChange, disabled = false }: TimeframeSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Timeframe
      </label>
      <div className="flex flex-wrap gap-2">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe.value}
            type="button"
            onClick={() => onChange(timeframe.value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selected === timeframe.value
                ? 'bg-blue-600 text-white shadow-md'
                : disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            {timeframe.label}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { AnnotationStyle } from '../../types/drawings';

export interface AnnotationData {
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  style: AnnotationStyle;
}

interface AnnotationEditorProps {
  isOpen: boolean;
  initialData?: AnnotationData;
  position: { x: number; y: number };
  onSave: (data: AnnotationData) => void;
  onCancel: () => void;
}

export default function AnnotationEditor({
  isOpen,
  initialData,
  position,
  onSave,
  onCancel,
}: AnnotationEditorProps) {
  const [text, setText] = useState(initialData?.text || '');
  const [backgroundColor, setBackgroundColor] = useState(
    initialData?.backgroundColor || 'rgba(41, 98, 255, 0.9)'
  );
  const [textColor, setTextColor] = useState(initialData?.textColor || '#ffffff');
  const [fontSize, setFontSize] = useState(initialData?.fontSize || 14);
  const [style, setStyle] = useState(initialData?.style || AnnotationStyle.NOTE);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setText(initialData.text);
      setBackgroundColor(initialData.backgroundColor);
      setTextColor(initialData.textColor);
      setFontSize(initialData.fontSize);
      setStyle(initialData.style);
    }
  }, [initialData]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  const handleSave = () => {
    if (!text.trim()) {
      alert('Please enter annotation text');
      return;
    }

    onSave({
      text: text.trim(),
      backgroundColor,
      textColor,
      fontSize,
      style,
    });

    // Reset form
    setText('');
    setBackgroundColor('rgba(41, 98, 255, 0.9)');
    setTextColor('#ffffff');
    setFontSize(14);
    setStyle(AnnotationStyle.NOTE);
  };

  const predefinedBackgroundColors = [
    { color: 'rgba(41, 98, 255, 0.9)', label: 'Blue' },
    { color: 'rgba(34, 197, 94, 0.9)', label: 'Green' },
    { color: 'rgba(239, 68, 68, 0.9)', label: 'Red' },
    { color: 'rgba(245, 158, 11, 0.9)', label: 'Amber' },
    { color: 'rgba(147, 51, 234, 0.9)', label: 'Purple' },
    { color: 'rgba(20, 184, 166, 0.9)', label: 'Teal' },
  ];

  const predefinedTextColors = [
    { color: '#ffffff', label: 'White' },
    { color: '#000000', label: 'Black' },
    { color: '#fbbf24', label: 'Yellow' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onCancel}
      />

      {/* Editor Modal */}
      <div
        ref={editorRef}
        className="fixed z-50 rounded-lg shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '2px solid var(--border-primary)',
          left: `${Math.min(position.x, window.innerWidth - 350)}px`,
          top: `${Math.min(position.y, window.innerHeight - 450)}px`,
          width: '320px',
          maxHeight: '500px',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {initialData ? 'Edit Annotation' : 'Add Annotation'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '350px' }}>
          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Annotation Text *
            </label>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your note..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border resize-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setStyle(AnnotationStyle.NOTE)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  style === AnnotationStyle.NOTE ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    style === AnnotationStyle.NOTE ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: style === AnnotationStyle.NOTE ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                📝 Note
              </button>
              <button
                onClick={() => setStyle(AnnotationStyle.ALERT)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  style === AnnotationStyle.ALERT ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    style === AnnotationStyle.ALERT ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: style === AnnotationStyle.ALERT ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                ⚠️ Alert
              </button>
              <button
                onClick={() => setStyle(AnnotationStyle.INFO)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  style === AnnotationStyle.INFO ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor:
                    style === AnnotationStyle.INFO ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: style === AnnotationStyle.INFO ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                ℹ️ Info
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Font Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[12, 14, 16].map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    fontSize === size ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: fontSize === size ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: fontSize === size ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Background Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {predefinedBackgroundColors.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => setBackgroundColor(color)}
                  className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 ${
                    backgroundColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: backgroundColor === color ? color : 'transparent',
                  }}
                  title={label}
                />
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowBgPicker(!showBgPicker)}
                  className="w-8 h-8 rounded-md border-2 flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                  title="Custom color"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {showBgPicker && (
                  <div className="absolute top-10 left-0 z-10">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value + 'E6'); // Add alpha
                        setShowBgPicker(false);
                      }}
                      className="w-20 h-20 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Text Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {predefinedTextColors.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-110 ${
                    textColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: textColor === color ? color : 'var(--border-primary)',
                  }}
                  title={label}
                />
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowTextPicker(!showTextPicker)}
                  className="w-8 h-8 rounded-md border-2 flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                  title="Custom color"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {showTextPicker && (
                  <div className="absolute top-10 left-0 z-10">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => {
                        setTextColor(e.target.value);
                        setShowTextPicker(false);
                      }}
                      className="w-20 h-20 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Preview
            </label>
            <div
              className="p-3 rounded-md"
              style={{
                backgroundColor: backgroundColor,
                color: textColor,
                fontSize: `${fontSize}px`,
              }}
            >
              {text || 'Your annotation text will appear here...'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t flex gap-2"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-md font-medium transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
            }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-md font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

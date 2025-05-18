import React, { useState } from 'react';

interface FormMultiInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (fieldName: string, values: string[]) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  helpText?: string;
}

export default function FormMultiInput({
  id,
  label,
  values,
  onChange,
  placeholder,
  required = false,
  className = '',
  error,
  helpText,
}: FormMultiInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addValue();
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      // Remove the last value when backspace is pressed on an empty input
      const newValues = [...values];
      newValues.pop();
      onChange(id, newValues);
    }
  };

  const addValue = () => {
    if (inputValue.trim()) {
      const newValues = [...values, inputValue.trim()];
      onChange(id, newValues);
      setInputValue('');
    }
  };

  const removeValue = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(id, newValues);
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((value, index) => (
            <div 
              key={index} 
              className="flex items-center bg-indigo-100 text-gray-800 text-sm px-3 py-1 rounded-md"
            >
              <span>{value}</span>
              <button
                type="button"
                className="ml-2 text-indigo-500 hover:text-gray-800 focus:outline-none"
                onClick={() => removeValue(index)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            id={id}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || `Type and press Enter to add ${label.toLowerCase()}`}
            className={`flex-grow mt-1 block w-full px-3 py-2 bg-white border ${
              error ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-blue-800 sm:text-sm`}
          />
          <button
            type="button"
            onClick={addValue}
            className="ml-2 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add
          </button>
        </div>
      </div>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 
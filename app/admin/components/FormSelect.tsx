import React from 'react';

interface Option {
  id: string;
  name: string;
}

interface FormSelectProps {
  id: string;
  label: string;
  options: readonly Option[] | Option[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  helpText?: string;
}

export default function FormSelect({
  id,
  label,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  error,
  helpText,
}: FormSelectProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        } border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-blue-800 sm:text-sm`}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-600">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full mb-6">
      {label && (
        <label className="block text-cyan-400 text-base font-bold mb-3 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-gray-800 text-white text-lg border-2 border-gray-700 rounded-sm py-4 px-6 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-colors placeholder-gray-500 ${className}`}
        {...props}
      />
    </div>
  );
};
'use client';

import React from 'react';
import { focusRing } from '@/lib/design-tokens';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, description, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-semibold text-slate-900 dark:text-white">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`
              w-full px-3 py-2.5 ${icon ? 'pl-10' : ''} text-sm
              bg-white dark:bg-slate-800
              border border-slate-200 dark:border-slate-700
              rounded-lg
              text-slate-900 dark:text-white
              placeholder-slate-400 dark:placeholder-slate-500
              transition-all duration-200
              ${focusRing}
              hover:border-slate-300 dark:hover:border-slate-600
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500 dark:border-red-400' : ''}
              ${className}
            `}
            {...props}
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

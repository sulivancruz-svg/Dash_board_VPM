'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, description, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center h-6 mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              className="hidden peer"
              {...props}
            />
            <div className={`
              w-5 h-5 rounded border-2 transition-all duration-200
              flex items-center justify-center
              peer-checked:bg-blue-600 peer-checked:border-blue-600
              peer-checked:dark:bg-blue-600 peer-checked:dark:border-blue-600
              peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2
              peer-focus:dark:ring-offset-slate-900
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
              border-slate-300 dark:border-slate-600
              hover:peer-disabled:cursor-not-allowed
              cursor-pointer
              bg-white dark:bg-slate-800
              ${error ? 'border-red-500 dark:border-red-400' : ''}
            `}>
              <Check className="w-3 h-3 text-white hidden peer-checked:block" />
            </div>
          </div>

          <div className="flex-1">
            {label && (
              <label className="text-sm font-medium text-slate-900 dark:text-white cursor-pointer block">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-8">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

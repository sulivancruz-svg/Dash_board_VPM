'use client';

import React from 'react';

interface FormRadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const FormRadio = React.forwardRef<HTMLInputElement, FormRadioProps>(
  ({ label, description, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center h-6 mt-0.5">
            <input
              ref={ref}
              type="radio"
              className="hidden peer"
              {...props}
            />
            <div className={`
              w-5 h-5 rounded-full border-2 transition-all duration-200
              peer-checked:border-blue-600
              peer-checked:dark:border-blue-600
              peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2
              peer-focus:dark:ring-offset-slate-900
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
              border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-800
              relative
              cursor-pointer
              ${error ? 'border-red-500 dark:border-red-400' : ''}
            `}>
              <div className="hidden peer-checked:block absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
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

FormRadio.displayName = 'FormRadio';

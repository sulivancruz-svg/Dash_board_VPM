'use client';

import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { focusRing } from '@/lib/design-tokens';

interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  error?: string;
  disabled?: boolean;
}

export function FileUpload({
  label,
  description,
  accept,
  onFileSelect,
  selectedFile,
  error,
  disabled,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </label>
      )}

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' : ''}
        `}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="space-y-2">
          <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Clique ou arraste um arquivo
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {accept || 'Qualquer formato'}
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              ✓ {selectedFile.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

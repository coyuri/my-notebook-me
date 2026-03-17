'use client';

import { useState } from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function UrlInput({ value, onChange, disabled }: UrlInputProps) {
  const [pasteError, setPasteError] = useState('');

  async function handlePaste() {
    setPasteError('');
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
    } catch {
      setPasteError('クリップボードへのアクセスが許可されていません');
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        URL を入力してください
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="https://github.com/... や https://arxiv.org/... など"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-base
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={handlePaste}
          disabled={disabled}
          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium
                     rounded-xl border border-gray-300 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     whitespace-nowrap text-sm"
          title="クリップボードから貼り付け"
        >
          貼り付け
        </button>
      </div>
      {pasteError && (
        <p className="mt-1 text-sm text-red-500">{pasteError}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        対応: GitHub・arXiv・X(Twitter)・一般Webページ
      </p>
    </div>
  );
}

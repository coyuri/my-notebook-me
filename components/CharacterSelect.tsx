'use client';

import { useState } from 'react';
import { CHARACTER_OPTIONS } from '@/lib/voicevox';

interface CharacterSelectProps {
  hostSpeakerId: number;
  guestSpeakerId: number;
  onHostChange: (id: number) => void;
  onGuestChange: (id: number) => void;
  disabled?: boolean;
}

export default function CharacterSelect({
  hostSpeakerId,
  guestSpeakerId,
  onHostChange,
  onGuestChange,
  disabled,
}: CharacterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hostName = CHARACTER_OPTIONS.find((c) => c.speakerId === hostSpeakerId)?.name ?? '不明';
  const guestName = CHARACTER_OPTIONS.find((c) => c.speakerId === guestSpeakerId)?.name ?? '不明';

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl
                   text-sm font-medium text-gray-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>
          キャラクター設定
          <span className="ml-2 font-normal text-gray-500">
            ホスト: {hostName} / ゲスト: {guestName}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          {/* Host select */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              ホスト（驚き・質問担当）
            </label>
            <select
              value={hostSpeakerId}
              onChange={(e) => onHostChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CHARACTER_OPTIONS.map((c) => (
                <option key={c.speakerId} value={c.speakerId}>
                  {c.name}（ID: {c.speakerId}）
                </option>
              ))}
            </select>
          </div>

          {/* Guest select */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              ゲスト（解説担当）
            </label>
            <select
              value={guestSpeakerId}
              onChange={(e) => onGuestChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CHARACTER_OPTIONS.map((c) => (
                <option key={c.speakerId} value={c.speakerId}>
                  {c.name}（ID: {c.speakerId}）
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400">
            ※ 音声は VOICEVOX オンライン API を使用します
          </p>
        </div>
      )}
    </div>
  );
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { saveApiSettings, type ApiMode } from '@/lib/apiSettings'

interface ApiSetupModalProps {
  onDone: () => void
}

export default function ApiSetupModal({ onDone }: ApiSetupModalProps) {
  const [mode, setMode] = useState<ApiMode>('own')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    if (mode === 'own') {
      if (!apiKey.startsWith('sk-ant-')) {
        setError('Anthropic API 키는 sk-ant- 로 시작해야 합니다')
        return
      }
      saveApiSettings({ mode: 'own', apiKey })
    } else {
      saveApiSettings({ mode: 'service' })
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-border rounded-2xl p-8"
      >
        <div className="mb-6">
          <div className="tag text-accent mb-2">// AI_SETUP</div>
          <h2 className="text-xl font-black text-white mb-1">AI 설정</h2>
          <p className="text-muted text-sm">어떤 방식으로 AI와 배틀할까요? 나중에 설정에서 변경 가능합니다.</p>
        </div>

        <div className="space-y-3 mb-6">
          {/* 내 API 키 */}
          <label className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            mode === 'own' ? 'border-accent bg-accent/8' : 'border-border hover:border-white/20'
          }`}>
            <input
              type="radio"
              name="mode"
              value="own"
              checked={mode === 'own'}
              onChange={() => { setMode('own'); setError('') }}
              className="mt-0.5 accent-[#00FF88]"
            />
            <div className="flex-1">
              <div className="font-bold text-white text-sm">내 Anthropic API 키 사용</div>
              <div className="text-xs text-muted mt-0.5">무료 · 직접 API 비용 부담</div>
              {mode === 'own' && (
                <div className="mt-3">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setError('') }}
                    placeholder="sk-ant-api03-..."
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                    autoFocus
                  />
                  <p className="text-xs text-muted mt-1.5">
                    <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      console.anthropic.com
                    </a>
                    {' '}에서 발급
                  </p>
                </div>
              )}
            </div>
          </label>

          {/* 서비스 API */}
          <label className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
            mode === 'service' ? 'border-accent bg-accent/8' : 'border-border hover:border-white/20'
          }`}>
            <input
              type="radio"
              name="mode"
              value="service"
              checked={mode === 'service'}
              onChange={() => { setMode('service'); setError('') }}
              className="mt-0.5 accent-[#00FF88]"
            />
            <div>
              <div className="font-bold text-white text-sm">서비스 API 사용</div>
              <div className="text-xs text-muted mt-0.5">배틀당 소액 결제 · API 키 불필요</div>
              {mode === 'service' && (
                <div className="mt-2 text-xs text-accent font-mono">결제 기능 준비 중 🚧</div>
              )}
            </div>
          </label>
        </div>

        {error && <p className="text-xs text-down font-mono mb-4">{error}</p>}

        <button
          onClick={handleSave}
          disabled={mode === 'own' && !apiKey}
          className="w-full py-3 bg-accent text-bg font-bold rounded-xl hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          저장하고 배틀 시작 ⚔️
        </button>
      </motion.div>
    </div>
  )
}

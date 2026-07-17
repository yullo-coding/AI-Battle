'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { saveApiSettings, type ApiMode } from '@/lib/apiSettings'
import Button from '@vibe/design-system/components/ui/Button'
import Input from '@vibe/design-system/components/ui/Input'
import { useLocale } from '@/components/LocaleProvider'

interface ApiSetupModalProps {
  onDone: () => void
}

export default function ApiSetupModal({ onDone }: ApiSetupModalProps) {
  const { tr } = useLocale()
  const [mode, setMode] = useState<ApiMode>('own')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    if (mode === 'own') {
      if (!apiKey.startsWith('sk-ant-')) {
        setError(tr('Anthropic API 키는 sk-ant- 로 시작해야 합니다.', 'Anthropic API keys must start with sk-ant-.'))
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
          <h2 className="text-xl font-black text-white mb-1">{tr('AI 설정', 'AI settings')}</h2>
          <p className="text-muted text-sm">{tr('어떤 방식으로 AI와 배틀할까요? 나중에 설정에서 변경할 수 있습니다.', 'Choose how to access AI predictions. You can change this later in settings.')}</p>
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
              <div className="font-bold text-white text-sm">{tr('내 Anthropic API 키 사용', 'Use my Anthropic API key')}</div>
              <div className="text-xs text-muted mt-0.5">{tr('서비스 이용료 없음 · API 비용은 본인 부담', 'No service fee · API usage billed to you')}</div>
              {mode === 'own' && (
                <div className="mt-3">
                  <Input
                    label={tr('API 키', 'API key')}
                    type="password"
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setError('') }}
                    placeholder="sk-ant-api03-..."
                    mono
                    autoFocus
                  />
                  <p className="text-xs text-muted mt-1.5">
                    <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      console.anthropic.com
                    </a>
                    {' '}{tr('에서 발급', 'to create a key')}
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
              <div className="font-bold text-white text-sm">{tr('서비스 API 사용', 'Use service API')}</div>
              <div className="text-xs text-muted mt-0.5">{tr('배틀당 결제 · API 키 불필요', 'Pay per battle · no API key needed')}</div>
              {mode === 'service' && (
                <div className="mt-2 text-xs text-accent font-mono">{tr('결제 기능 준비 중 🚧', 'Payments coming soon 🚧')}</div>
              )}
            </div>
          </label>
        </div>

        {error && <p className="text-xs text-down font-mono mb-4">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={mode === 'own' && !apiKey}
          size="lg"
          className="w-full"
        >
          {tr('저장하고 배틀 시작', 'Save and start battle')} ⚔️
        </Button>
      </motion.div>
    </div>
  )
}

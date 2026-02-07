'use client'

import { useState, useEffect } from 'react'

interface CountdownProps {
  deadline: number // Unix timestamp
  label: string
}

export function Countdown({ deadline, label }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const diff = deadline - now
      
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      setTimeLeft({ hours, minutes, seconds })
      setIsUrgent(hours === 0 && minutes < 60)
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className={`text-center p-4 rounded-xl ${isUrgent ? 'bg-red-900/30 animate-pulse-slow' : 'bg-spell-dark/50'}`}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <span className="countdown-digit">{pad(timeLeft.hours)}</span>
        <span className="text-3xl text-gray-500">:</span>
        <span className="countdown-digit">{pad(timeLeft.minutes)}</span>
        <span className="text-3xl text-gray-500">:</span>
        <span className="countdown-digit">{pad(timeLeft.seconds)}</span>
      </div>
      {isUrgent && (
        <p className="text-red-400 text-sm mt-2 animate-pulse">⚡ Final Hour! ⚡</p>
      )}
    </div>
  )
}

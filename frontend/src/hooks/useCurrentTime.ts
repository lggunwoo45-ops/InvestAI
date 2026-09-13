import { useEffect, useState } from 'react'

export function useCurrentTime(intervalMs = 1_000): Date {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), intervalMs)
    return () => window.clearInterval(timerId)
  }, [intervalMs])

  return currentTime
}

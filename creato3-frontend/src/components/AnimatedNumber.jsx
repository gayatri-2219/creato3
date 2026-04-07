import { useEffect, useMemo, useState } from 'react'

export function AnimatedNumber({ value, decimals = 2, suffix = '' }) {
  const target = useMemo(() => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }, [value])
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame
    const duration = 800
    const start = performance.now()
    const from = display
    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return (
    <span className="font-mono">
      {display.toFixed(decimals)}{suffix}
    </span>
  )
}

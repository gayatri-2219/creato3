import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import guideMarkup from '../content/creato3_full_hackathon_guide.html?raw'

const guideDoc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Creato3 Hackathon Guide</title>
    <style>
      @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');

      :root {
        --font-sans: 'Satoshi', system-ui, sans-serif;
        --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        --border-radius-lg: 28px;
        --border-radius-md: 16px;
        --color-text-primary: #f8fafc;
        --color-text-secondary: #bfd2df;
        --color-text-tertiary: #7b95aa;
        --color-text-info: #8fd0ff;
        --color-text-success: #8bf0c0;
        --color-text-warning: #ffd27c;
        --color-text-danger: #ff9f8f;
        --color-background-primary: rgba(4, 9, 18, 0.96);
        --color-background-secondary: rgba(11, 24, 39, 0.92);
        --color-background-tertiary: rgba(16, 34, 54, 0.96);
        --color-background-info: rgba(24, 95, 165, 0.16);
        --color-background-success: rgba(15, 110, 86, 0.16);
        --color-background-warning: rgba(133, 79, 11, 0.18);
        --color-background-danger: rgba(153, 60, 29, 0.18);
        --color-border-secondary: rgba(143, 208, 255, 0.28);
        --color-border-tertiary: rgba(123, 149, 170, 0.28);
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(10, 161, 255, 0.15), transparent 38%),
          linear-gradient(180deg, #06111d 0%, #091827 52%, #040c15 100%);
      }

      a {
        color: inherit;
      }
    </style>
  </head>
  <body>
    ${guideMarkup}
  </body>
</html>`

const getGuideHeight = (frame) => {
  const doc = frame?.contentDocument

  if (!doc) {
    return 1600
  }

  return Math.max(
    doc.body?.scrollHeight ?? 0,
    doc.documentElement?.scrollHeight ?? 0,
    1600
  )
}

export function HackathonGuidePage() {
  const frameRef = useRef(null)
  const [frameHeight, setFrameHeight] = useState(1600)

  useEffect(() => {
    const frame = frameRef.current

    if (!frame) {
      return undefined
    }

    let resizeObserver
    let animationFrame

    const syncHeight = () => {
      setFrameHeight((currentHeight) => {
        const nextHeight = getGuideHeight(frame)
        return currentHeight === nextHeight ? currentHeight : nextHeight
      })
    }

    const attachObserver = () => {
      syncHeight()

      const body = frame.contentDocument?.body

      if (body && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => syncHeight())
        resizeObserver.observe(body)
      }
    }

    frame.addEventListener('load', attachObserver)
    window.addEventListener('resize', syncHeight)

    if (frame.contentDocument?.readyState === 'complete') {
      animationFrame = window.requestAnimationFrame(attachObserver)
    }

    return () => {
      frame.removeEventListener('load', attachObserver)
      window.removeEventListener('resize', syncHeight)
      resizeObserver?.disconnect()

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass overflow-hidden p-8 md:p-10"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="badge w-fit">Creato3 • Hackathon Guide</span>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              A working build guide for the full Creato3 sprint.
            </h1>
            <p className="text-lg text-slate-300">
              Your uploaded HTML guide now lives inside the product as an
              interactive reference page, complete with expandable phases,
              setup steps, prize map, and submission checklist.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="#guide" className="glow-btn">Open Guide</a>
            <Link to="/create-profile" className="btn-secondary">Go to Create Flow</Link>
          </div>
        </div>
      </motion.section>

      <motion.section
        id="guide"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="glass overflow-hidden p-2 md:p-3"
      >
        <iframe
          ref={frameRef}
          title="Creato3 Hackathon Guide"
          srcDoc={guideDoc}
          className="w-full rounded-[1.5rem] border border-white/10 bg-transparent"
          style={{ height: `${frameHeight}px` }}
        />
      </motion.section>
    </div>
  )
}

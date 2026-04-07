import { motion as Motion } from 'framer-motion'

export function AnimatedBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Motion.div
        className="absolute h-96 w-96 rounded-full bg-[#a7f3d0] opacity-20 blur-3xl"
        style={{ top: '10%', right: '10%' }}
        animate={{ x: [0, 30, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Motion.div
        className="absolute h-96 w-96 rounded-full bg-[#93c5fd] opacity-20 blur-3xl"
        style={{ bottom: '10%', left: '10%' }}
        animate={{ x: [0, -30, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Motion.div
        className="absolute h-72 w-72 rounded-full bg-[#ddd6fe] opacity-20 blur-3xl"
        style={{ top: '40%', left: '30%' }}
        animate={{ x: [0, 20, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

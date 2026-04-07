import { motion } from 'framer-motion'

export function AnimatedBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute h-80 w-80 rounded-full bg-[#a7f3d0] opacity-30 blur-3xl"
        style={{ top: '8%', right: '8%' }}
        animate={{ x: [0, 28, 0], y: [0, 42, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-96 w-96 rounded-full bg-[#93c5fd] opacity-25 blur-3xl"
        style={{ bottom: '8%', left: '6%' }}
        animate={{ x: [0, -26, 0], y: [0, -34, 0], scale: [1, 1.14, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-72 w-72 rounded-full bg-[#ddd6fe] opacity-30 blur-3xl"
        style={{ top: '34%', left: '28%' }}
        animate={{ x: [0, 20, 0], y: [0, -24, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

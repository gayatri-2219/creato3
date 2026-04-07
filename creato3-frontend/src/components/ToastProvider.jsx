import { createContext, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext({
  notify: () => {},
  success: () => {},
  error: () => {}
})

const iconMap = {
  success: '✓',
  error: '⚠',
  info: '•'
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const notify = ({ title, description, variant = 'info' }) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
    const toast = { id, title, description, variant }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => dismiss(id), 4200)
  }

  const value = useMemo(
    () => ({
      notify,
      success: (title, description) => notify({ title, description, variant: 'success' }),
      error: (title, description) => notify({ title, description, variant: 'error' })
    }),
    []
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex w-[320px] flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="glass-soft flex gap-3 p-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-sm dark:bg-white/10">
                {iconMap[toast.variant]}
              </div>
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{toast.description}</p>
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

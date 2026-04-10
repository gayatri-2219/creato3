import { createContext, useContext } from 'react'

export const ToastContext = createContext({
  notify: () => {},
  success: () => {},
  error: () => {}
})

export const useToast = () => useContext(ToastContext)

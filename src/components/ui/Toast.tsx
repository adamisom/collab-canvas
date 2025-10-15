import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 3000) // Auto-dismiss after 3 seconds

    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={onDismiss} className="toast-close">×</button>
    </div>
  )
}

export default Toast

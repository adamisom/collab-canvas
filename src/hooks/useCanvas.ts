import { useCanvas as useCanvasFromContext } from '../contexts/CanvasContext'

// Re-export the useCanvas hook from CanvasContext
export const useCanvas = useCanvasFromContext

// Export the hook as default as well
export default useCanvas

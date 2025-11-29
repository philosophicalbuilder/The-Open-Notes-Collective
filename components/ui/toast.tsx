import * as React from 'react'

// Minimal type definitions used by `hooks/use-toast.ts`.
// The project currently only imports the types from this module,
// so we don't need a full visual Toast implementation for the build to succeed.

export type ToastActionElement = React.ReactElement

export interface ToastProps {
  id?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}



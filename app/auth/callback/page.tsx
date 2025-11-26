"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [isSettingRole, setIsSettingRole] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()

        if (session?.user) {
          // Check if user needs role assignment
          const pendingRole = localStorage.getItem('pendingRole')
          const pendingStudentType = localStorage.getItem('pendingStudentType')

          if (pendingRole && !session.user.role) {
            // Set role in database
            setIsSettingRole(true)
            fetch('/api/auth/set-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: pendingRole,
                student_type: pendingStudentType,
              }),
            })
              .then((res) => res.json())
              .then(() => {
                localStorage.removeItem('pendingRole')
                localStorage.removeItem('pendingStudentType')
                // Refresh to get updated session
                window.location.reload()
              })
              .catch((error) => {
                console.error('Error setting role:', error)
                setIsSettingRole(false)
                setIsLoading(false)
              })
          } else if (session.user.role) {
            // User already has role, redirect to appropriate dashboard
            const redirectPath = session.user.role === 'instructor' ? '/dashboard/instructor' : '/dashboard'
            router.push(redirectPath)
          } else {
            setIsLoading(false)
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
        <p className="text-muted-foreground">
          {isSettingRole ? "Setting up your account..." : isLoading ? "Completing sign in..." : "Redirecting..."}
        </p>
      </div>
    </div>
  )
}


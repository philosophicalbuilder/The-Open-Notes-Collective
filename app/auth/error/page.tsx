"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Configuration Error",
          description: "Google OAuth is not properly configured. Please check your environment variables (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).",
        }
      case "AccessDenied":
        return {
          title: "Access Denied",
          description: "You don't have permission to sign in. Only @virginia.edu email addresses are allowed.",
        }
      case "Verification":
        return {
          title: "Verification Error",
          description: "The verification token has expired or is invalid. Please try signing in again.",
        }
      default:
        return {
          title: "Authentication Error",
          description: "An error occurred during authentication. Please try again.",
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errorInfo.title}</AlertTitle>
          <AlertDescription className="mt-2">{errorInfo.description}</AlertDescription>
        </Alert>

        {error === "Configuration" && (
          <div className="bg-neutral-100 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Setup Instructions:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Create a Google OAuth app in Google Cloud Console</li>
              <li>Add redirect URI: <code className="bg-white px-1 rounded">http://localhost:3000/api/auth/callback/google</code></li>
              <li>Add <code className="bg-white px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-white px-1 rounded">GOOGLE_CLIENT_SECRET</code> to your <code className="bg-white px-1 rounded">.env.local</code> file</li>
              <li>See <code className="bg-white px-1 rounded">OAUTH_SETUP.md</code> for detailed instructions</li>
            </ol>
          </div>
        )}

        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Go Back</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Try Again</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}


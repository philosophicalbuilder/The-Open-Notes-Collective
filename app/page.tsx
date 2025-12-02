"use client"

import { useState } from "react"
import { BookOpen, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [studentType, setStudentType] = useState<string>("")
  const [formData, setFormData] = useState({
    computing_id: "",
    email: "",
    password: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        // Login
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            computing_id: formData.computing_id,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Login failed")
          setIsLoading(false)
          return
        }

        // Store role from response or check session
        const role = data.user?.role || "student"
        if (role === "instructor") {
          router.push("/dashboard/instructor")
        } else {
          router.push("/dashboard")
        }
      } else {
        // Registration
        if (!selectedRole || (selectedRole === "student" && !studentType)) {
          setError("Please select your role")
          setIsLoading(false)
          return
        }

        if (!formData.computing_id || !formData.email || !formData.password || !formData.first_name || !formData.last_name) {
          setError("Please fill in all required fields")
          setIsLoading(false)
          return
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            computing_id: formData.computing_id,
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            last_name: formData.last_name,
            role: selectedRole,
            student_type: selectedRole === "student" ? studentType : null,
            phone: formData.phone,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Registration failed")
          setIsLoading(false)
          return
        }

        // Auto-login after registration
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            computing_id: formData.computing_id,
            password: formData.password,
          }),
        })

        const loginData = await loginResponse.json()

        if (loginResponse.ok) {
          if (selectedRole === "instructor") {
            router.push("/dashboard/instructor")
          } else {
            router.push("/dashboard")
          }
        } else {
          setError("Registration successful, but login failed. Please try logging in.")
          setIsLogin(true)
        }
      }
    } catch (error: any) {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md space-y-8 my-auto">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/open-notes-collective-logo.png"
              alt="The Open Notes Collective"
              width={280}
              height={280}
              className="h-64 w-auto"
              priority
            />
          </div>
          <p className="text-muted-foreground text-sm">Share knowledge, collaborate, and learn together</p>
        </div>

        {/* Toggle Login/Register */}
        <div className="flex gap-2 border-b border-neutral-200">
          <button
            onClick={() => {
              setIsLogin(true)
              setError("")
            }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${isLogin ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false)
              setError("")
            }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${!isLogin ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {/* Computing ID */}
          <div className="space-y-2">
            <Label htmlFor="computing_id">Computing ID *</Label>
            <Input
              id="computing_id"
              type="text"
              placeholder="e.g., abc2def"
              value={formData.computing_id}
              onChange={(e) => setFormData({ ...formData, computing_id: e.target.value })}
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          {/* Email - only for registration */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@virginia.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          )}

          {/* Registration-only fields */}
          {!isLogin && (
            <>
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="First"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Last"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name (optional)</Label>
                <Input
                  id="middle_name"
                  type="text"
                  placeholder="Middle"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (434) 555-0123"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h2 className="text-center text-sm font-medium text-foreground">I am a</h2>

                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => {
                    setSelectedRole(value)
                    if (value !== "student") {
                      setStudentType("")
                    }
                  }}
                  className="space-y-3"
                >
                  {/* Student Option */}
                  <div className="relative">
                    <RadioGroupItem value="student" id="student" className="peer sr-only" />
                    <Label
                      htmlFor="student"
                      className={`flex items-start gap-4 rounded-lg border-2 bg-white p-6 cursor-pointer transition-all hover:border-neutral-300 ${selectedRole === "student" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                        }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-foreground">Student</div>
                        <div className="text-sm text-muted-foreground">Access notes and study materials</div>
                      </div>
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedRole === "student" ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                          }`}
                      >
                        {selectedRole === "student" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </Label>
                  </div>

                  {selectedRole === "student" && (
                    <div className="space-y-3 py-2">
                      <h3 className="text-center text-sm font-medium text-foreground">Are you an SDAC student?</h3>
                      <RadioGroup value={studentType} onValueChange={setStudentType} className="space-y-2">
                        {/* SDAC Student */}
                        <div className="relative">
                          <RadioGroupItem value="sdac" id="sdac" className="peer sr-only" />
                          <Label
                            htmlFor="sdac"
                            className={`flex items-center justify-between rounded-lg border-2 bg-white p-4 cursor-pointer transition-all hover:border-neutral-300 ${studentType === "sdac" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                              }`}
                          >
                            <span className="text-sm font-medium text-foreground">SDAC Student</span>
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${studentType === "sdac" ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                                }`}
                            >
                              {studentType === "sdac" && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </Label>
                        </div>

                        {/* Non-SDAC Student */}
                        <div className="relative">
                          <RadioGroupItem value="non-sdac" id="non-sdac" className="peer sr-only" />
                          <Label
                            htmlFor="non-sdac"
                            className={`flex items-center justify-between rounded-lg border-2 bg-white p-4 cursor-pointer transition-all hover:border-neutral-300 ${studentType === "non-sdac" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                              }`}
                          >
                            <span className="text-sm font-medium text-foreground">Non-SDAC Student</span>
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${studentType === "non-sdac" ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                                }`}
                            >
                              {studentType === "non-sdac" && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Instructor Option */}
                  <div className="relative">
                    <RadioGroupItem value="instructor" id="instructor" className="peer sr-only" />
                    <Label
                      htmlFor="instructor"
                      className={`flex items-start gap-4 rounded-lg border-2 bg-white p-6 cursor-pointer transition-all hover:border-neutral-300 ${selectedRole === "instructor" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                        }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-foreground">Instructor</div>
                        <div className="text-sm text-muted-foreground">Share notes and manage content</div>
                      </div>
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedRole === "instructor" ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                          }`}
                      >
                        {selectedRole === "instructor" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || (!isLogin && (!selectedRole || (selectedRole === "student" && !studentType)))}
            className="w-full bg-neutral-600 hover:bg-neutral-700 text-white h-12 rounded-lg font-medium"
          >
            {isLoading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </Button>
        </form>

        {/* Continue as Guest */}
        <div className="pt-4 border-t border-neutral-200">
          <Button
            type="button"
            onClick={() => {
              localStorage.setItem('guest_mode', 'true')
              router.push('/dashboard')
            }}
            variant="outline"
            className="w-full h-12 rounded-lg font-medium"
          >
            Continue as Guest
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Browse notes and courses without signing in
          </p>
        </div>
      </div>
    </div>
  )
}

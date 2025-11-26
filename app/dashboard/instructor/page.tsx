"use client"

import { useRouter } from "next/navigation"
import { User, LogOut, Plus, Search, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Course = {
  id: number
  name: string
  code: string
  sectionId: string
  description: string
  semester: string
}

const availableCourses: Course[] = []

export default function InstructorDashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPublishCourseOpen, setIsPublishCourseOpen] = useState(false)
  const [courseName, setCourseName] = useState("")
  const [sectionId, setSectionId] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Load instructor's courses on mount
  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        // API automatically filters to instructor's courses when logged in as instructor
        const instructorCourses = (data.courses || []).map((c: any) => ({
          id: c.course_id,
          name: c.name,
          code: c.code,
          sectionId: c.section_id,
          description: c.description,
          semester: c.semester_name || 'Fall 2025',
        }))
        setCourses(instructorCourses)
        if (instructorCourses.length > 0 && !selectedCourse) {
          setSelectedCourse(instructorCourses[0])
        }
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const instructorProfile = {
    computing_id: "prof123",
    email: "instructor@virginia.edu",
    first_name: "Dr. Jane",
    last_name: "Smith",
    phone: "+1 (434) 555-0124",
    courses_taught: courses.length,
  }

  const handleLogout = () => {
    // Clear auth cookie
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push("/")
  }

  const handlePublishCourse = async () => {
    if (courseName.trim() && sectionId.trim() && courseDescription.trim()) {
      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: courseName.trim(),
            code: sectionId.trim(),
            section_id: sectionId.trim(),
            description: courseDescription.trim(),
          }),
        })

        if (response.ok) {
          // Reload courses
          await loadCourses()
          
          // Reset form
          setCourseName("")
          setSectionId("")
          setCourseDescription("")
          setIsPublishCourseOpen(false)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to publish course')
        }
      } catch (error) {
        console.error('Error publishing course:', error)
        alert('Failed to publish course')
      }
    }
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.sectionId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col">
        <div className="flex-1">
          <div className="p-4 pb-4 border-b border-neutral-200 flex justify-center">
            <Image
              src="/open-notes-collective-logo.png"
              alt="The Open Notes Collective"
              width={120}
              height={120}
              className="w-28 h-auto"
            />
          </div>

          <nav className="px-4 pt-6">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Courses I Teach</h2>
                  <Dialog open={isPublishCourseOpen} onOpenChange={setIsPublishCourseOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Publish Course</DialogTitle>
                        <DialogDescription>
                          Create a new course for students to enroll in. All fields are required.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-name">Course Name</Label>
                          <Input
                            id="course-name"
                            placeholder="e.g., Database Systems"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="section-id">Section ID</Label>
                          <Input
                            id="section-id"
                            placeholder="e.g., 00114"
                            value={sectionId}
                            onChange={(e) => setSectionId(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="course-description">Description</Label>
                          <Textarea
                            id="course-description"
                            placeholder="Describe the course content, topics covered, prerequisites..."
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value)}
                            className="min-h-[100px] resize-none"
                          />
                        </div>

                        <Button
                          onClick={handlePublishCourse}
                          disabled={!courseName.trim() || !sectionId.trim() || !courseDescription.trim()}
                          className="w-full"
                        >
                          Publish Course
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No courses published yet</p>
                  ) : (
                    courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourse(course)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedCourse?.id === course.id
                            ? "bg-neutral-100 text-foreground font-medium"
                            : "text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
                        }`}
                      >
                        <div className="font-medium">{course.name}</div>
                        <div className="text-xs opacity-70">[{course.code}]</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-200 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 relative">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Fall 2025</h1>
            <p className="text-sm text-muted-foreground">Current Semester</p>
          </div>

          {selectedCourse ? (
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">{selectedCourse.name}</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Section ID</h3>
                    <p className="text-sm text-foreground">{selectedCourse.code}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-sm text-foreground">{selectedCourse.description}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Semester</h3>
                    <p className="text-sm text-foreground">{selectedCourse.semester}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="text-center space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-muted-foreground mb-2">Welcome to your instructor dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    Publish your first course to get started. Students will be able to find and enroll in your courses.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Instructor Profile</DialogTitle>
            <DialogDescription>Your account information and statistics</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Name</h4>
                <p className="text-sm text-foreground">
                  {instructorProfile.first_name} {instructorProfile.last_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Computing ID</h4>
                  <p className="text-sm text-foreground">{instructorProfile.computing_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Role</h4>
                  <p className="text-sm text-foreground">Instructor</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                <p className="text-sm text-foreground">{instructorProfile.email}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone</h4>
                <p className="text-sm text-foreground">{instructorProfile.phone}</p>
              </div>
            </div>

            {/* Statistics */}
            <div className="pt-4 border-t border-neutral-200">
              <h3 className="text-sm font-semibold text-foreground mb-3">Statistics</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{instructorProfile.courses_taught}</div>
                  <div className="text-xs text-muted-foreground mt-1">Courses Published</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


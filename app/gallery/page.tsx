"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Search, MapPin, Square, Download } from 'lucide-react'
import { tasks } from '@/lib/tasks'
import ErrorBoundary from '@/components/ErrorBoundary'
import { TaskResult, Session } from '@/lib/storage'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'

// Dynamically import TaskMapDisplay with ssr disabled
const TaskMapDisplay = dynamic(
  () => import('@/components/TaskMapDisplay').then((mod) => mod.TaskMapDisplay),
  { ssr: false }
)

const DynamicSessionCard = dynamic(() => import('@/components/SessionCard'), { 
  ssr: false,
  loading: () => <p>Loading...</p>
})

const GalleryPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let storage: { getAllSessions: () => Promise<Session[]>, deleteSession: (id: string) => Promise<void> }
    let isSubscribed = true

    const initializeStorage = async () => {
      try {
        storage = await import('@/lib/storage')
        if (isSubscribed) {
          loadSessions()
        }
      } catch (error) {
        console.error('Error initializing storage:', error)
        setIsLoading(false)
      }
    }

    const loadSessions = async () => {
      try {
        const loadedSessions = await storage.getAllSessions()
        if (isSubscribed) {
          setSessions(loadedSessions)
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
      }
      if (isSubscribed) {
        setIsLoading(false)
      }
    }

    initializeStorage()

    // Only add event listener if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const handleStorageChange = () => {
        if (storage) {
          loadSessions()
        }
      }

      window.addEventListener('storage', handleStorageChange)
      
      return () => {
        isSubscribed = false
        window.removeEventListener('storage', handleStorageChange)
      }
    }

    return () => {
      isSubscribed = false
    }
  }, [])

  const handleDeleteSession = async (sessionId: string) => {
    const { deleteSession } = await import('@/lib/storage')
    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const filteredSessions = sessions
    .filter(session => 
      session.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Add this new function to handle the download
  const handleDownloadAllSessions = async () => {
    try {
      const zip = new JSZip()
      
      sessions.forEach((session) => {
        const sessionData = JSON.stringify(session, null, 2)
        zip.file(`${session.id}.json`, sessionData)
      })
      
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'all_sessions.zip')
    } catch (error) {
      console.error('Error downloading sessions:', error)
      // You might want to show an error message to the user here
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Загрузка сессий...
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              Галерея сохраненных результатов
            </h1>
            <Button
              onClick={handleDownloadAllSessions}
              disabled={sessions.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Скачать все
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Поиск по ID сессии..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Ничего не найдено' : 'Нет сохраненных сессий'}
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm 
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Начните выполнять задания, чтобы увидеть их результаты здесь'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredSessions.map((session) => (
              <DynamicSessionCard
                key={session.id}
                session={session}
                onDelete={handleDeleteSession}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default GalleryPage

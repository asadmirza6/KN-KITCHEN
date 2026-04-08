import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'KN KITCHEN - Catering Management',
  description: 'Professional catering order management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* GLOBAL WATERMARK - Injected at root level */}
        <div id="global-watermark"></div>

        <Navbar />
        {children}
      </body>
    </html>
  )
}

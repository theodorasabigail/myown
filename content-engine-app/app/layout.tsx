import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Content Creation Engine',
  description: 'Brand-aware marketing content generator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <nav className="bg-white border-b px-6 py-3 flex gap-6 text-sm font-medium">
          <a href="/" className="font-bold text-blue-600">ContentEngine</a>
          <a href="/content" className="hover:text-blue-600 transition-colors">New Content</a>
          <a href="/brands" className="hover:text-blue-600 transition-colors">Brands</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}

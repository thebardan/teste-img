import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/query-client'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multi AI Studio',
  description: 'Plataforma interna de geração de materiais comerciais com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}

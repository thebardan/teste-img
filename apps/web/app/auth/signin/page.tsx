'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const isDev = process.env.NODE_ENV === 'development'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: '#000000' }}
    >
      <div
        className="w-full max-w-[400px] text-center"
        style={{ padding: '0 20px' }}
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#0071e3" />
            <path
              d="M14 24.5L20 30.5L34 16.5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: '"SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: '40px',
            fontWeight: 600,
            lineHeight: 1.07,
            letterSpacing: '-0.022em',
            color: '#ffffff',
            marginBottom: '12px',
          }}
        >
          Multi AI Studio
        </h1>

        <p
          style={{
            fontFamily: '"SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: '17px',
            fontWeight: 400,
            lineHeight: 1.47,
            letterSpacing: '-0.022em',
            color: 'rgba(255, 255, 255, 0.72)',
            marginBottom: '40px',
          }}
        >
          Plataforma interna de marketing com IA
        </p>

        {/* CTA */}
        <button
          onClick={() => signIn('google', { callbackUrl })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: '#0071e3',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '17px',
            fontWeight: 400,
            fontFamily: '"SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
            letterSpacing: '-0.022em',
            cursor: 'pointer',
            transition: 'filter 0.15s ease',
            width: '100%',
            maxWidth: '280px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          onMouseDown={(e) => (e.currentTarget.style.filter = 'brightness(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
        >
          <GoogleIcon />
          Entrar com Google
        </button>

        {isDev && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '20px auto',
                maxWidth: '280px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span
                style={{
                  fontFamily: '"SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.28)',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                apenas em dev
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <button
              onClick={() => signIn('dev-test', { callbackUrl })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.64)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '15px',
                fontWeight: 400,
                fontFamily: '"SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                letterSpacing: '-0.022em',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
                width: '100%',
                maxWidth: '280px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.36)'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.64)'
              }}
            >
              Entrar como Dev User
            </button>
          </>
        )}

        <p
          style={{
            fontFamily: '"SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.32)',
            marginTop: '24px',
            letterSpacing: '-0.01em',
          }}
        >
          Acesso restrito a colaboradores Multilaser
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#fff"
        fillOpacity="0.9"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#fff"
        fillOpacity="0.8"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#fff"
        fillOpacity="0.7"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#fff"
        fillOpacity="0.6"
      />
    </svg>
  )
}

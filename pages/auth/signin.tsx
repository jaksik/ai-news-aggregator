import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function SignIn() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { error } = router.query

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { 
        callbackUrl: '/',
        redirect: true 
      })
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign In - News Aggregator Dashboard</title>
        <meta name="description" content="Sign in to access your News Aggregator Dashboard" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              News Aggregator Dashboard
            </h1>
            <h2 className="mt-2 text-center text-xl text-gray-600">
              Sign in to your account
            </h2>
          </div>
          
          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">
                  {error === 'AccessDenied' && 'Access denied. You are not authorized to access this application.'}
                  {error === 'Signin' && 'There was an error signing you in. Please try again.'}
                  {error === 'OAuthSignin' && 'There was an error with the OAuth provider. Please try again.'}
                  {error === 'OAuthCallback' && 'There was an error during the OAuth callback. Please try again.'}
                  {error === 'OAuthCreateAccount' && 'There was an error creating your account. Please try again.'}
                  {error === 'EmailCreateAccount' && 'There was an error creating your account. Please try again.'}
                  {error === 'Callback' && 'There was an error during authentication. Please try again.'}
                  {error === 'OAuthAccountNotLinked' && 'This account is not linked. Please use a different account.'}
                  {error === 'EmailSignin' && 'There was an error sending the email. Please try again.'}
                  {error === 'CredentialsSignin' && 'Invalid credentials. Please check your login details.'}
                  {error === 'SessionRequired' && 'You must be signed in to access this page.'}
                  {!['AccessDenied', 'Signin', 'OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired'].includes(error as string) && 'An error occurred during authentication.'}
                </div>
              </div>
            )}
            
            <div>
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg
                    className="h-5 w-5 text-blue-500 group-hover:text-blue-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </span>
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Only authorized users can access this dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

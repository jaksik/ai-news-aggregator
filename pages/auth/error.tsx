import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'

export default function AuthError() {
  const router = useRouter()
  const { error } = router.query

  const getErrorMessage = (error: string | string[] | undefined) => {
    if (!error || Array.isArray(error)) return 'An unknown error occurred'
    
    switch (error) {
      case 'AccessDenied':
        return 'Access denied. You are not authorized to access this application.'
      case 'Signin':
        return 'There was an error signing you in.'
      case 'OAuthSignin':
        return 'There was an error with the OAuth provider.'
      case 'OAuthCallback':
        return 'There was an error during the OAuth callback.'
      case 'OAuthCreateAccount':
        return 'There was an error creating your account with the OAuth provider.'
      case 'EmailCreateAccount':
        return 'There was an error creating your account.'
      case 'Callback':
        return 'There was an error during authentication callback.'
      case 'OAuthAccountNotLinked':
        return 'This account is not linked. Please use a different account or contact the administrator.'
      case 'EmailSignin':
        return 'There was an error sending the verification email.'
      case 'CredentialsSignin':
        return 'Invalid credentials provided.'
      case 'SessionRequired':
        return 'You must be signed in to access this page.'
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      default:
        return 'An unexpected authentication error occurred.'
    }
  }

  const getErrorTitle = (error: string | string[] | undefined) => {
    if (!error || Array.isArray(error)) return 'Authentication Error'
    
    switch (error) {
      case 'AccessDenied':
        return 'Access Denied'
      case 'Configuration':
        return 'Configuration Error'
      default:
        return 'Authentication Error'
    }
  }

  return (
    <>
      <Head>
        <title>Authentication Error - News Aggregator Dashboard</title>
        <meta name="description" content="Authentication error occurred" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
              {getErrorTitle(error)}
            </h1>
            
            <p className="mt-4 text-lg text-gray-600">
              {getErrorMessage(error)}
            </p>
            
            {error === 'AccessDenied' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  This dashboard is restricted to authorized users only. 
                  If you believe you should have access, please contact the administrator.
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-8 space-y-4">
            <Link
              href="/auth/signin"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Try signing in again
            </Link>
            
            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Go to home page
            </Link>
          </div>
          
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-600 font-mono">
                Debug: Error code &ldquo;{error}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

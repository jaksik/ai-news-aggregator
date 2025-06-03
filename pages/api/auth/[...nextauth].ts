import NextAuth, { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { auth } from '../../../lib/config'

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: auth.googleClientId,
      clientSecret: auth.googleClientSecret,
    })
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow your specific email
      if (user.email === auth.authorizedEmail) {
        return true
      }
      return false
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

export default NextAuth(authOptions)

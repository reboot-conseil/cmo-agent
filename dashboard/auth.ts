import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize(credentials) {
        if (credentials.password === process.env.ADMIN_PASSWORD) {
          return { id: 'jonathan', name: 'Jonathan BRAUN' }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
  },
})

import NextAuth from 'next-auth'

declare module 'next-auth' {
  /**
   * Returned by `getServerSession`
   */
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      id?: string | null
    }
    expires: ISODateString
  }
}

import NextAuth from 'next-auth'

declare module 'next-auth' {
  /**
   * Returned by `getServerSession`
   */
  interface Session {
    user?: Partial<User>
    expires: ISODateString
  }

  /** The OAuth profile returned from your provider */
  interface User {
    name: string
    image: string
    hashedUserId: string
  }
}

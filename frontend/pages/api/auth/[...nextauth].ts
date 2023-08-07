import NextAuth, { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    DiscordProvider({
      // @ts-ignore this should not be undefined
      clientId: process.env.DISCORD_ID,
      // @ts-ignore this should not be undefined
      clientSecret: process.env.DISCORD_SECRET,
    }),
    // ...add more providers here
  ],
}

export default NextAuth(authOptions)

import NextAuth, { NextAuthOptions, Session } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    DiscordProvider({
      // @ts-ignore this should not be undefined
      clientId: process.env.DISCORD_ID,
      // @ts-ignore this should not be undefined
      clientSecret: process.env.DISCORD_SECRET,
      authorization: 'https://discord.com/api/oauth2/authorize?scope=identify',
      profile(profile) {
        if (profile.avatar === null) {
          const defaultAvatarNumber = parseInt(profile.discriminator) % 5
          profile.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
        } else {
          const format = profile.avatar.startsWith('a_') ? 'gif' : 'png'
          profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`
        }
        return {
          id: profile.id,
          name: profile.username,
          image: profile.image_url,
        }
      },
    }),
    // ...add more providers here
  ],
  callbacks: {
    async session({
      session,
      token,
    }: {
      session: Session
      token: any
    }): Promise<Session> {
      return {
        user: { ...session.user, id: token.sub },
        expires: session.expires,
      }
    },
  },
}

export default NextAuth(authOptions)

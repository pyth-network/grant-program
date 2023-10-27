import NextAuth, { NextAuthOptions, Session } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { hashDiscordUserId } from 'utils/hashDiscord'

const DISCORD_HASH_SALT = Buffer.from(
  new Uint8Array(JSON.parse(process.env.DISCORD_HASH_SALT!))
)

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
          hashedUserId: hashDiscordUserId(DISCORD_HASH_SALT, profile.id),
        }
      },
      httpOptions: {
        // Receiving error on Discord when the default timeout - 3500ms is used
        timeout: 5000,
      },
    }),
    // ...add more providers here
  ],
  callbacks: {
    async jwt({ token, user }) {
      // as per next auth docs
      // The arguments user, account, profile and isNewUser are only passed the first time this
      // callback is called on a new session, after the user signs in. In subsequent calls, only token will be available.
      if (user !== undefined) {
        token.hashedUserId = user.hashedUserId
      }
      return token
    },
    async session({
      session,
      token,
    }: {
      session: Session
      token: any
    }): Promise<Session> {
      return {
        user: {
          ...session.user,
          hashedUserId: token.hashedUserId,
        },
        expires: session.expires,
      }
    },
  },
}

export default NextAuth(authOptions)

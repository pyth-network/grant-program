import type { NextApiRequest, NextApiResponse } from 'next'
import { hashDiscordUserId } from 'utils/hashDiscord'
import { getServerSession } from 'next-auth/next'
import { authOptions } from 'pages/api/auth/[...nextauth]'

const DISCORD_HASH_SALT = Buffer.from(
  new Uint8Array(JSON.parse(process.env.DISCORD_HASH_SALT!))
)

export default async function handlerHashDiscordUid(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  if (session && session.user && session.user.id) {
    res.status(200).json({
      hash: hashDiscordUserId(DISCORD_HASH_SALT, session.user.id),
    })
  } else {
    res.status(403).json({
      error: 'You must be logged in with Discord to access this endpoint',
    })
  }
}

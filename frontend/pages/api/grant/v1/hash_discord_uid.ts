import type { NextApiRequest, NextApiResponse } from 'next'
import { hashDiscordUserId } from 'utils/hashDiscord'

const DISCORD_HASH_SALT = Buffer.from(
  new Uint8Array(JSON.parse(process.env.DISCORD_HASH_SALT!))
)

export default async function handlerHashDiscordUid(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { uid } = req.query
  if (uid === undefined || typeof uid !== 'string') {
    return res.status(400).json({
      error: "Must provide the 'uid' query parameter",
    })
  }

  return res
    .status(200)
    .json({ hash: hashDiscordUserId(DISCORD_HASH_SALT, uid) })
}

import keccak256 from 'keccak256'

export function hashDiscordUserId(salt: Buffer, discordUserId: string): string {
  return keccak256(
    Buffer.concat([salt, Buffer.from(discordUserId, 'utf-8')])
  ).toString('hex')
}

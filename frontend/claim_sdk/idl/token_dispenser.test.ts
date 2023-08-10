import IDL from './token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'

test('Anchor sanity check', (done) => {
  const coder = new anchor.BorshCoder(IDL as any)

  let buffer = coder.types.encode('Identity', {
    discord: { username: '1234' },
  })
  expect(buffer).toStrictEqual(Buffer.from([0, 4, 0, 0, 0, 49, 50, 51, 52]))

  buffer = coder.types.encode('ClaimCertificate', {
    amount: new anchor.BN(1),
    proofOfIdentity: { discord: { username: '1234' } },
    proofOfInclusion: [Buffer.alloc(32, 1), Buffer.alloc(32, 2)],
  })

  expect(buffer).toStrictEqual(
    Buffer.concat([
      Buffer.from([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 49, 50, 51, 52, 0, 2, 0, 0, 0,
      ]),
      Buffer.alloc(32, 1),
      Buffer.alloc(32, 2),
    ])
  )
  done()
})

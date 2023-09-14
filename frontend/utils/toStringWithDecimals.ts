import BN from 'bn.js'

const TRAILING_ZEROS = new RegExp(/\.?0+$/)
const PYTH_DECIMALS = 6

export function toStringWithDecimals(amount: BN) {
  const padded = amount.toString().padStart(PYTH_DECIMALS + 1, '0')
  return (
    padded.slice(0, padded.length - PYTH_DECIMALS) +
    ('.' + padded.slice(padded.length - PYTH_DECIMALS)).replace(
      TRAILING_ZEROS,
      ''
    )
  )
}

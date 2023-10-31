// Block visitors from these countries
const BLOCKED_COUNTRIES = [
  'BY',
  'CF',
  'CD',
  'KP',
  'CU',
  'IR',
  'LY',
  'SO',
  'SD',
  'SY',
  'US',
  'GB',
  'YE',
  'ZW',
]

// Limit middleware pathname config
export const config = {
  matcher: '/',
}

export function middleware(req, res, next) {
  // Extract country
  const country = req.geo.country

  if (BLOCKED_COUNTRIES.includes(country)) {
    res.statusCode = 451 // Unavailable For Legal Reasons
    res.end()
  } else {
    next()
  }
}

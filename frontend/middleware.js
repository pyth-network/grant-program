import { NextResponse } from 'next/server'

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

export function middleware(req) {
  // Extract country
  const country = req.geo.country

  if (BLOCKED_COUNTRIES.includes(country)) {
    return NextResponse.redirect(new URL('/blocked', req.url))
  } else {
    // Continue with the request if the country is not blocked
    return NextResponse.next()
  }
}

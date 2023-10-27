import { NextResponse } from 'next/server'

// Block US visitors
const BLOCKED_COUNTRY = 'US'

// Limit middleware pathname config
export const config = {
  matcher: '/',
}

export function middleware(req) {
  // Extract country
  const country = req.geo.country

  // Specify the correct pathname
  if (country === BLOCKED_COUNTRY) {
    return NextResponse.error(451)
  } else {
    return NextResponse.rewrite(req.nextUrl)
  }
}

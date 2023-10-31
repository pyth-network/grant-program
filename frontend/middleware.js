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
    // Error 451: Unavailable For Legal Reasons
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/451
    const body = `
    <html>
      <body>
        <h1>Error 451: Unavailable For Legal Reasons</h1>
        <p>Access to this site is restricted for users accessing from the United States due to legal or regulatory requirements.</p>
      </body>
    </html>
    `

    // NextResponse object does not have a body property so we use Response instead
    // return new Response(body, {
    //   status: 451,
    //   headers: {
    //     'Content-Type': 'text/html',
    //   },
    // })
    return NextResponse.redirect(new URL('/_error', req.url))
  } else {
    // Continue with the request if the country is not blocked
    return NextResponse.next()
  }
}

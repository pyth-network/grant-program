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

  if (country === BLOCKED_COUNTRY) {
    // Error 451: Unavailable For Legal Reasons
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/451
    return new NextResponse(null, {
      status: 451,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
          <html>
            <body>
              <h1>Error 451: Unavailable For Legal Reasons</h1>
              <p>Access to this site is restricted for users accessing from the United States due to legal or regulatory requirements.</p>
            </body>
          </html>
        `,
    })
  } else {
    // Continue with the request if the country is not blocked
    return NextResponse.next()
  }
}

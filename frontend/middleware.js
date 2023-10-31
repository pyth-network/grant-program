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
      <head>
        <link
        href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@300;400;600&family=Red+Hat+Mono&family=Red+Hat+Text&display=swap"
        rel="stylesheet"
        />
        <style>
          h1 {
            font-family: "Red Hat Display", sans-serif;
            color: #E6DAFE;
          }
          p {
            font-family: "Red Hat Text", sans-serif;
            color: #E6DAFE;
          }
        </style>
      </head>
      <body style="background-color: #110F23;">
        <h1>Error 451: Unavailable For Legal Reasons</h1>
        <p>This Site is not available to residents of Belarus, the Central African Republic, The Democratic Republic of Congo, the Democratic People's Republic of Korea, the Crimea, Donetsk People's Republic, and Luhansk People's Republic regions of Ukraine, Cuba, Iran, Libya, Somalia, Sudan, South Sudan, Syria, the USA, the United Kingdom, Yemen, Zimbabwe and any other jurisdiction in which accessing or using the Site is prohibited (the “Prohibited Jurisdictions”).</p>
      </body>
    </html>
    `

    // NextResponse object does not have a body property so we use Response instead
    return new Response(body, {
      status: 451,
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } else {
    // Continue with the request if the country is not blocked
    return NextResponse.next()
  }
}

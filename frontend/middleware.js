// Limit middleware pathname config
export const config = {
  matcher: '/(.*)',
}

export function middleware(req) {
  const body = `
    <html>
      <head>
        <link
        href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@300;400;600&family=Red+Hat+Mono&family=Red+Hat+Text&display=swap"
        rel="stylesheet"
        />
        <style>
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #110F23;
            height: 100vh;
            text-align: center;
          }
          h1 {
            font-family: "Red Hat Display", sans-serif;
            color: #E6DAFE;
          }
          p {
            font-family: "Red Hat Text", sans-serif;
            color: #E6DAFE;
            max-width: 900px;
          }
          a {
            color: #C792EA; /* Light purple, for better visibility */
            text-decoration: none; /* Optional: removes underline */
          }
          a:hover {
            color: #FFCB6B; /* Changes color on hover for interactivity */
            text-decoration: underline; /* Optional: adds underline on hover */
          }
        </style>
      </head>
      <body>
        <h1>The airdrop claim period has ended</h1>
        <p>To stay in touch with future Pyth community initiatives head over to our <a href="https://discord.gg/invite/PythNetwork">Discord</a></p>
      </body>
    </html>
    `

  // NextResponse object does not have a body property so we use Response instead
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

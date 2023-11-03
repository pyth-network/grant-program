import Document, { Head, Html, Main, NextScript } from 'next/document'
import Script from 'next/script'

class CustomDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link
            href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;600;700&family=Urbanist:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@300;400;600&family=Red+Hat+Mono&family=Red+Hat+Text&display=swap"
            rel="stylesheet"
          />
          <link href="favicon.png" rel="icon" id="faviconTag" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#242235" />
          <meta name="msapplication-TileColor" content="#242235" />
          <meta name="theme-color" content="#242235"></meta>
          <Script id="show-banner" strategy="beforeInteractive">
            {`const faviconTag = document.getElementById("faviconTag");
            const isDark = window.matchMedia("(prefers-color-scheme: dark)");
            const changeFavicon = () => {
              if (isDark.matches) faviconTag.href = "/favicon.png";
              else faviconTag.href = "/favicon-dark.png";
            };
            changeFavicon();
            setInterval(changeFavicon, 1000);`}
          </Script>
        </Head>
        <body className="min-h-screen">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default CustomDocument

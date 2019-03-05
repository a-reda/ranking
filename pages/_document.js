/* eslint-disable react/no-danger */
import React from 'react'
import JssProvider from 'react-jss/lib/JssProvider'
import Document, { Head, Main, NextScript } from 'next/document'
import getContext from '../lib/context'
import getRootUrl from '../lib/api/getRootUrl'

class MyDocument extends Document {
  static async getInitialProps (ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    const pageContext = getContext()
    const page = ctx.renderPage(Component => props => (
      <JssProvider
        registry={pageContext.sheetsRegistry}
        generateClassName={pageContext.generateClassName}
      >
        <Component pageContext={pageContext} {...initialProps} {...props} />
      </JssProvider>
    ))

    return {
      ...page,
      pageContext,
      styles: (
        <style
          id="jss-server-side"
          dangerouslySetInnerHTML={{ __html: pageContext.sheetsRegistry.toString() }}
        />
      ),
    }
  }

  render() {
    return (
      <html
        lang="en"
        style={{
          height: '100%',
        }}
      >
        <Head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="google" content="notranslate" />
          <meta name="theme-color" content="#1976D2" />

          <link
            rel="shortcut icon"
            href={`${getRootUrl()}/scoreza.png`}
            type="image/png"
          />
          <link
            href="https://fonts.googleapis.com/css?family=Roboto"
            rel="stylesheet"
          />

          <style>
            {`
              a, a:focus {
                font-weight: 400;
                color: #1565C0;
                text-decoration: none;
                outline: none
              }
              a:hover, button:hover {
                opacity: 0.75;
                cursor: pointer
              }
              blockquote {
                padding: 0 1em;
                color: #555;
                border-left: 0.25em solid #dfe2e5;
              }
              pre {
                display:block;
                overflow-x:auto;
                padding:0.5em;
                background:#FFF;
                color: #000;
                border: 1px solid #ddd;
                font-size: 14px;
              }
              code {
                font-size: 14px;
                background: #FFF;
              }
            `}
          </style>
        </Head>
        <body
          style={{
            font: '16px Roboto, Helvetica, Arial, sans-serif',
            color: '#222',
            margin: '0px auto',
            fontWeight: '400',
            lineHeight: '1.5em',
            backgroundColor: '#F7F9FC',
            minHeight: '100%',
          }}
        >
          <Main />
          <NextScript />
        </body>
      </html>
    )
  }
}

// MyDocument.getInitialProps = (ctx) => {
//   const pageContext = getContext()
//   const page = ctx.renderPage(Component => props => (
//     <JssProvider
//       registry={pageContext.sheetsRegistry}
//       generateClassName={pageContext.generateClassName}
//     >
//       <Component pageContext={pageContext} {...props} />
//     </JssProvider>
//   ))

//   return {
//     ...page,
//     pageContext,
//     styles: (
//       <style
//         id="jss-server-side"
//         dangerouslySetInnerHTML={{ __html: pageContext.sheetsRegistry.toString() }}
//       />
//     ),
//   }
// }

export default MyDocument

import { NextPage, NextPageContext } from 'next'

interface ErrorProps {
  statusCode: number | undefined
}

const ErrorPage: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on serverrrrr`
        : 'An error occurred on clientttt'}
    </p>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default ErrorPage

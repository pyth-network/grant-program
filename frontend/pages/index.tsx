import type { NextPage } from 'next'
import Layout from '../components/Layout'
import SEO from '../components/SEO'

const Home: NextPage = () => {
  return (
    <Layout>
      <SEO title={'App'} />
    </Layout>
  )
}

export default Home

import * as React from "react"
// import { Link } from "gatsby"
// import { StaticImage } from "gatsby-plugin-image"

import Seo from "../components/seo"
import Home from '../components/test'
import Providers from '../components/providers'

const IndexPage = () => {
  return (
    <>
      <Seo title="Home" />
      <Providers>
        <Home />
      </Providers>
    </>
  )
}

export default IndexPage

module.exports = {
  /*
    this proxy doesn't work with websocket requests, so currently the solutions is
    to open cors in the backend for localhost:8000 when running in development mode
  */
  /* proxy: { */
  /*   prefix: "/api/v1", */
  /*   url: "http://localhost:5000", */
  /* }, */
  siteMetadata: {
    title: `Morsechat`,
    description: `A live internet morse radio`,
    author: `robalb - halb.it`,
    siteUrl: `https://halb.it/`,
  },
  //https://www.gatsbyjs.com/docs/how-to/previews-deploys-hosting/asset-prefix/
  //gatsby build --prefix-paths
  assetPrefix: `static`,
  plugins: [
    `@wardpeet/gatsby-plugin-static-site`,
    'gatsby-plugin-top-layout',
    `gatsby-plugin-react-helmet`,
    'gatsby-plugin-mui-emotion',
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `gatsby-starter-default`,
        short_name: `starter`,
        start_url: `/`,
        background_color: `#663399`,
        // This will impact how browsers show your PWA/website
        // https://css-tricks.com/meta-theme-color-and-trickery/
        // theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/gatsby-icon.png`, // This path is relative to the root of the site.
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ],
}

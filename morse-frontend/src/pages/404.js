import * as React from "react"
import Providers from '../components/providers/providers'

import Seo from "../components/seo"
import {Typography} from "@mui/material";
import Link from "../components/link";

const NotFoundPage = () => (
  <>
    <Seo title="404: Not found" />
    <Providers>
        <Typography variant="h5" color="primary" >
            404 - page not found
        </Typography>
        <Typography variant="p" color="primary" >
            -
        </Typography>
      <a href={"/index"} >home</a>
    </Providers>
  </>
)

export default NotFoundPage

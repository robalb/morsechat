// import { red } from '@mui/material/colors';
import { createTheme } from '@mui/material/styles';

// A custom theme for this app
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: '#fafafa',
      dark: '#9e9e9e',
      light: '#eeeeee',
    },
    secondary: {
      main: '#0ccaeb',
    },
    opposite_text: {
      main: '#121212',
    },
    // error: {
    //   main: '#ff336c',
    // },
    background: {
      default: "#303030",
      paper: "#282b2d",//--gray-70
      /* paper: "#202224",//--gray-60 */
    }
  },
  components: {
    MuiUseMediaQuery: {
      defaultProps: {
        noSsr: true,
      },
    },
  },
});

export default theme;

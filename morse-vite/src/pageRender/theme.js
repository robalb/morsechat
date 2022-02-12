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
      main: '#f50057',
    },
    opposite_text: {
      main: '#121212',
    },
    // error: {
    //   main: red.A400,
    // },
    background: {
      default: "#303030",
      // paper: "#424242"
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

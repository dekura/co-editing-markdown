import * as React from "react";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
// import { blue, grey } from "@material-ui/core/colors";
import CssBaseline from "@material-ui/core/CssBaseline";

const theme = createMuiTheme({
  palette: {
    // primary: blue,
    // secondary: grey,
    type: "dark"
  }
});

function withRoot<T>(Component: React.ComponentType<T>) {
  function WithRoot(props: T) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...props} />
      </MuiThemeProvider>
    );
  }

  return WithRoot;
}

export default withRoot;

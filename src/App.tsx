import React from "react";
import classNames from "classnames";
import { withStyles } from "@material-ui/core/styles";
import withRoot from "./style/withRoot";
import { Theme } from "@material-ui/core/styles/createMuiTheme";

import Drawer from "@material-ui/core/Drawer";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import List from "@material-ui/core/List";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";

import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";

import { mailFolderListItems, otherMailFolderListItems } from "./tileData";
import Editor from "./Components/Editor";
import Preview from "./Components/Preview";
import styles from "./style/jss";

class MiniDrawer extends React.Component<
  { classes: { [key: string]: string }; theme: Theme },
  { open: boolean }
> {
  state = {
    open: false
  };

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  handleChange = (doc: CodeMirror.Doc) => {
    this.updatePreviewContent(doc.getValue());
  };

  updatePreviewContent = (_: string) => {};

  render() {
    const { classes, theme } = this.props;

    return (
      <div className={classes.root}>
        <AppBar
          position="absolute"
          className={classNames(
            classes.appBar,
            this.state.open && classes.appBarShift
          )}
        >
          <Toolbar disableGutters={!this.state.open}>
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              onClick={this.handleDrawerOpen}
              className={classNames(
                classes.menuButton,
                this.state.open && classes.hide
              )}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="title" color="inherit" noWrap>
              Co-Editing Markdown (Demo)
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          classes={{
            paper: classNames(
              classes.drawerPaper,
              !this.state.open && classes.drawerPaperClose
            )
          }}
          open={this.state.open}
        >
          <div className={classes.toolbar}>
            <IconButton onClick={this.handleDrawerClose}>
              {theme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </div>
          <Divider />
          <List>{mailFolderListItems}</List>
          <Divider />
          <List>{otherMailFolderListItems}</List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          <Grid container spacing={24} style={{ flex: 1 }}>
            <Grid item xs>
              <Editor onChange={this.handleChange} />
            </Grid>
            <Grid item xs>
              <Preview
                action={setContent => {
                  this.updatePreviewContent = setContent;
                }}
              />
            </Grid>
          </Grid>
        </main>
      </div>
    );
  }
}

export default withRoot(withStyles(styles, { withTheme: true })(MiniDrawer));

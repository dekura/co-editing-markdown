import * as React from "react";

import "codemirror/mode/clike/clike";
import "codemirror/mode/gfm/gfm";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/css/css";

import CodeMirror from "codemirror";

export default class AceEditor extends React.Component {
  editorContainerRef: HTMLDivElement | null = null;

  state = {
    editor: null
  };
  render() {
    return (
      <div
        ref={ele => {
          this.editorContainerRef = ele;
        }}
        style={{ flex: 1 }}
      />
    );
  }

  componentDidMount() {
    if (this.editorContainerRef) {
      const editor = CodeMirror(this.editorContainerRef, {
        mode: "gfm",
        theme: "monokai",
        lineNumbers: true
      });

      this.setState({
        editor
      });
    }
  }
}

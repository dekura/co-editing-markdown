import * as React from "react";

import "codemirror/mode/clike/clike";
import "codemirror/mode/gfm/gfm";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/markdown/markdown";
import "codemirror/mode/css/css";

import CodeMirror from "codemirror";

export default class AceEditor extends React.Component<{
  onChange: (text: CodeMirror.Doc) => void;
}> {
  editorContainerRef: HTMLDivElement | null = null;

  state = {
    editor: null
  };
  render() {
    return (
      <div
        style={{
          flex: 1,
          height: "100%",
          overflow: "auto",
          position: "relative"
        }}
      >
        <div
          ref={ele => {
            this.editorContainerRef = ele;
          }}
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            overflow: "auto"
          }}
          className="codemirror-wrapper"
        />
      </div>
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

      CodeMirror.on(editor.getDoc(), "change", doc => {
        this.props.onChange(doc);
      });
    }
  }
}

import * as React from "react";

import "codemirror/mode/clike/clike";
import "codemirror/mode/gfm/gfm";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/markdown/markdown";
import "codemirror/mode/python/python";
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
        indentUnit: 4,
        lineNumbers: true,
        indentWithTabs: false,
        extraKeys: {
          Tab: function(cm: any) {
            if (cm.somethingSelected()) {
              cm.indentSelection("add");
            } else {
              cm.replaceSelection(
                cm.getOption("indentWithTabs")
                  ? "\t"
                  : Array(cm.getOption("indentUnit") + 1).join(" "),
                "end",
                "+input"
              );
            }
          },
          "Shift+Tab": function(cm: any) {
            cm.indentSelection("subtract");
          }
        }
      });

      this.setState({
        editor
      });

      editor.on("changes", _ => {
        this.props.onChange(editor.getDoc());
      });

      let h = 0;
      CodeMirror.on(editor.getDoc(), "beforeSelectionChange", () => {
        window.clearTimeout(h);
        h = window.setTimeout(() => {
          console.log(`selected: ${editor.getDoc().getSelection().length}`);
        }, 100);
      });

      let h = 0;
      CodeMirror.on(editor.getDoc(), "beforeSelectionChange", () => {
        window.clearTimeout(h);
        h = window.setTimeout(() => {
          console.log(`selected: ${editor.getDoc().getSelection().length}`);
        }, 100);
      });
    }
  }
}

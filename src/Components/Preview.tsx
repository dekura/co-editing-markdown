import * as React from "react";
import marked from "marked";
// import { markdown } from "./text";
import mdVirtualize from "../utils/virtualize";

export default class Preview extends React.Component<{
  action: (setContent: (md: string) => void) => void;
}> {
  state = {
    content: ""
  };

  previewContainer: HTMLDivElement | null = null;

  render() {
    marked.setOptions({
      renderer: new marked.Renderer(),
      // highlight: function(code) {
      //   return hljs.highlightAuto(code).value;
      // },
      pedantic: false,
      gfm: true,
      tables: true,
      breaks: false,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: false
    });

    const html = marked(this.state.content);
    const doc = document.createElement("div");
    doc.innerHTML = html;

    return (
      <div
        className="preview-wrapper"
        style={{ position: "relative", height: "100%" }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            overflow: "auto"
          }}
          className="preview-area"
          ref={ele => {
            ele && (this.previewContainer = ele);
          }}
        >
          {mdVirtualize(doc)}
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.props.action(content => {
      this.setState({ content });
    });
  }
}

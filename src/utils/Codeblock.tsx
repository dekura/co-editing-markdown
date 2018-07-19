import * as React from "react";
import { highlightBlock } from "highlight.js";
import { codeVirtualize } from "./virtualize";

interface CodeblockProps {
  code: string;
  langClass: string;
}

export default class extends React.Component<CodeblockProps> {
  render() {
    const { langClass, code } = this.props;
    const codeblockEle = document.createElement("PRE");
    codeblockEle.innerHTML = `<code class="${langClass}">${code}</code>`;

    highlightBlock(codeblockEle);

    console.log(codeblockEle);
    return codeVirtualize(codeblockEle);
  }

  shouldComponentUpdate(nextProps: CodeblockProps) {
    return (
      nextProps.langClass !== this.props.langClass ||
      nextProps.code !== this.props.code
    );
  }
}

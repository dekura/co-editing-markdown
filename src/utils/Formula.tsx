import * as React from "react";

export default class extends React.Component<{ source: string }> {
  render() {
    return this.props.source;
  }

  componentDidMount() {}

  shouldComponentUpdate() {
    return false;
  }
}

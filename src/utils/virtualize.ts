import * as React from "react";

/**
 * @author Faraway
 * @description Convert a HTML node to a ReactNode.
 * @param root
 * @param key
 */
function virtualize(root: Node, key: string = ""): React.ReactNode {
  const children = Array.from(root.childNodes)
    .map((node, i) => {
      if (node.nodeType === node.TEXT_NODE) {
        return node.textContent;
      } else if (node.nodeType === node.ELEMENT_NODE) {
        return virtualize(node, i + "");
      }
      return node.textContent;
    })
    .filter(node => node !== "\n");

  const attrs: { [k: string]: string } = {};
  if (root instanceof Element) {
    Array.from(root.attributes).forEach(attr => {
      attrs[attr.name === "class" ? "className" : attr.name] = attr.value;
    });
  }
  const props =
    children.length > 0 ? { children, key, ...attrs } : { key, ...attrs };
  return React.createElement(root.nodeName.toLowerCase(), props);
}

export default virtualize;

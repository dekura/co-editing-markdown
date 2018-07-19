import * as React from "react";
import Codeblock from "./Codeblock";

/**
 * @author Faraway
 * @description Convert a HTML node to a ReactNode, but with some markdown specified modify.
 * @param root
 * @param key
 */
function mdVirtualize(root: Node, key: string = ""): React.ReactNode {
  if (root.nodeName === "PRE" && root.childNodes.length === 1) {
    const preChild = root.childNodes[0];
    if (
      preChild.nodeType === root.ELEMENT_NODE &&
      preChild.nodeName === "CODE" &&
      preChild instanceof HTMLElement
    ) {
      return React.createElement(Codeblock, {
        code: preChild.innerHTML,
        langClass: preChild.className
      });
    }
  }

  const children = Array.from(root.childNodes)
    .map((node, i) => {
      if (node.nodeType === node.TEXT_NODE) {
        return node.textContent;
      } else if (node.nodeType === node.ELEMENT_NODE) {
        return mdVirtualize(node, i + "");
      }
      return node.textContent;
    })
    .filter(node => node !== "\n");

  const attrs: { [k: string]: string | boolean } = {};
  if (root instanceof Element) {
    Array.from(root.attributes).forEach(attr => {
      attrs[attr.name === "class" ? "className" : attr.name] =
        attr.value === "" ? true : attr.value;
    });
  }
  const props =
    children.length > 0 ? { children, key, ...attrs } : { key, ...attrs };
  return React.createElement(root.nodeName.toLowerCase(), props);
}

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

  const attrs: { [k: string]: string | boolean } = {};
  if (root instanceof Element) {
    Array.from(root.attributes).forEach(attr => {
      attrs[attr.name === "class" ? "className" : attr.name] =
        attr.value === "" ? true : attr.value;
    });
  }
  const props =
    children.length > 0 ? { children, key, ...attrs } : { key, ...attrs };
  return React.createElement(root.nodeName.toLowerCase(), props);
}

function codeVirtualize(root: Node, key: string = ""): React.ReactNode {
  const children = Array.from(root.childNodes).map((node, i) => {
    if (node.nodeType === node.TEXT_NODE) {
      return node.textContent;
    } else if (node.nodeType === node.ELEMENT_NODE) {
      return codeVirtualize(node, i + "");
    }
    return node.textContent;
  });
  // .filter(node => node !== "\n");

  const attrs: { [k: string]: string | boolean } = {};
  if (root instanceof Element) {
    Array.from(root.attributes).forEach(attr => {
      attrs[attr.name === "class" ? "className" : attr.name] =
        attr.value === "" ? true : attr.value;
    });
  }
  const props =
    children.length > 0 ? { children, key, ...attrs } : { key, ...attrs };
  return React.createElement(root.nodeName.toLowerCase(), props);
}

export default mdVirtualize;

export { virtualize, codeVirtualize };

namespace Tokens {
  interface Base {
    startPos: number;
    length: number;
  }

  export interface Space extends Base {
    type: "space";
  }

  export interface Code extends Base {
    type: "code";
    lang?: string;
    text: string;
  }

  export interface Heading extends Base {
    type: "heading";
    depth: number;
    text: string;
  }

  export interface Table extends Base {
    type: "table";
    header: string[];
    align: Array<"center" | "left" | "right" | null>;
    cells: string[][];
  }

  export interface Hr extends Base {
    type: "hr";
  }

  export interface BlockquoteStart extends Base {
    type: "blockquote_start";
  }

  export interface BlockquoteEnd extends Base {
    type: "blockquote_end";
  }

  export interface ListStart extends Partial<Base> {
    type: "list_start";
    ordered: boolean;
    start: number | null;
  }

  export interface LooseItemStart {
    type: "loose_item_start";
    task: boolean;
    checked: boolean;
  }

  export interface ListItemStart {
    type: "list_item_start";
    task: boolean;
    checked: boolean;
  }

  export interface ListItemEnd {
    type: "list_item_end";
  }

  export interface ListEnd extends Partial<Base> {
    type: "list_end";
  }

  export interface Paragraph extends Base {
    type: "paragraph";
    pre?: boolean;
    text: string;
  }

  export interface HTML extends Base {
    type: "html";
    pre: boolean;
    text: string;
  }

  export interface Text extends Base {
    type: "text";
    text: string;
  }

  export interface BlockFormula extends Base {
    type: "block_formula";
    text: string;
  }
}

type Token =
  | Tokens.Space
  | Tokens.Code
  | Tokens.Heading
  | Tokens.Table
  | Tokens.Hr
  | Tokens.BlockquoteStart
  | Tokens.BlockquoteEnd
  | Tokens.ListStart
  | Tokens.LooseItemStart
  | Tokens.ListItemStart
  | Tokens.ListItemEnd
  | Tokens.ListEnd
  | Tokens.Paragraph
  | Tokens.HTML
  | Tokens.BlockFormula
  | Tokens.Text;

type Links = { [k: string]: { href: string; title: string } };

function splitCells(tableRow: string, count: number = NaN) {
  var cells = tableRow.replace(/([^\\])\|/g, "$1 |").split(/ +\| */),
    i = 0;

  if (cells.length > count) {
    cells.splice(count);
  } else {
    while (cells.length < count) cells.push("");
  }

  for (; i < cells.length; i++) {
    cells[i] = cells[i].replace(/\\\|/g, "|");
  }
  return cells;
}

export default class MarkdownDocument {
  private _blockReg = {
    newline: /^\n+/,
    code: /^( {4}[^\n]+\n*)+/,
    fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\n? *\1 *(?:\n+|$)/,
    hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
    heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/,
    nptable: /^ *([^|\n ].*\|.*)\n *([-:]+ *\|[-| :]*)(?:\n((?:.*[^>\n ].*(?:\n|$))*)\n*|$)/,
    blockquote: /^( {0,3}> ?(([^\n]+(?:\n(?! {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)| *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)|([^\n]+)\n *(=|-){2,} *(?:\n+|$)| {0,3}>|<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\n|\/?>)|<(?:script|pre|style|!--))[^\n]+)*)|[^\n]*)(?:\n|$))+/,
    list: /^( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$))|\n+(?= {0,3}\[((?!\s*\])(?:\\[\[\]]|[^\[\]])+)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)((?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))))? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)/,
    html: /^ {0,3}(?:<(script|pre|style)[\s>][\s\S]*?(?:<\/\1>[^\n]*\n+|$)|<!--(?!-?>)[\s\S]*?-->[^\n]*(\n+|$)|<\?[\s\S]*?\?>\n*|<![A-Z][\s\S]*?>\n*|<!\[CDATA\[[\s\S]*?\]\]>\n*|<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\n|\/?>)[\s\S]*?(?:\n{2,}|$)|<(?!script|pre|style)([a-z][\w-]*)(?: +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?)*? *\/?>(?=\h*\n)[\s\S]*?(?:\n{2,}|$)|<\/(?!script|pre|style)[a-z][\w-]*\s*>(?=\h*\n)[\s\S]*?(?:\n{2,}|$))/i,
    def: /^ {0,3}\[((?!\s*\])(?:\\[\[\]]|[^\[\]])+)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)((?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))))? *(?:\n+|$)/,
    table: /^ *\|(.+)\n *\|?( *[-:]+[-| :]*)(?:\n((?: *[^>\n ].*(?:\n|$))*)\n*|$)/,
    lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
    paragraph: /^([^\n]+(?:\n(?! *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\n? *\2 *(?:\n+|$)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\3?(?:(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$))|\n+(?= {0,3}\[((?!\s*\])(?:\\[\[\]]|[^\[\]])+)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)((?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))))? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)| *(\${2}) *\n*([\s\S]*?) *\n* *\4 *(?:\n+|$)| {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)| *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)|([^\n]+)\n *(=|-){2,} *(?:\n+|$)| {0,3}>|<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\n|\/?>)|<(?:script|pre|style|!--))[^\n]+)*)/,
    text: /^[^\n]+/,
    bullet: /(?:[*+-]|\d+\.)/,
    item: /^( *)((?:[*+-]|\d+\.)) [^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm,
    formula: /^ *(\${2}) *\n*([\s\S]*?) *\n* *\1 *(?:\n+|$)/
  };

  private _inlineReg = {
    escape: /^\\([!"#$%&'()*+,\-.\/:;<=>?@\[\]\\^_`{|}~~|])/,
    autolink: /^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s\x00-\x1f<>]*|[a-zA-Z0-9.!#$%&'*+\/=?_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>/,
    url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^[a-zA-Z0-9.!#$%&'*+\/=?_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
    tag: /^<!--(?!-?>)[\s\S]*?-->|^<\/[a-zA-Z][\w:-]*\s*>|^<[a-zA-Z][\w-]*(?:\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?)*?\s*\/?>|^<\?[\s\S]*?\?>|^<![a-zA-Z]+\s[\s\S]*?>|^<!\[CDATA\[[\s\S]*?\]\]>/,
    link: /^!?\[((?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?)\]\(\s*(<(?:\\[<>]?|[^\s<>\\])*>|(?:\\[()]?|\([^\s\x00-\x1f()\\]*\)|[^\s\x00-\x1f()\\])*?)(?:\s+("(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)))?\s*\)/,
    reflink: /^!?\[((?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
    nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
    strong: /^__([^\s][\s\S]*?[^\s])__(?!_)|^\*\*([^\s][\s\S]*?[^\s])\*\*(?!\*)|^__([^\s])__(?!_)|^\*\*([^\s])\*\*(?!\*)/,
    em: /^_([^\s][\s\S]*?[^\s_])_(?!_)|^_([^\s_][\s\S]*?[^\s])_(?!_)|^\*([^\s][\s\S]*?[^\s*])\*(?!\*)|^\*([^\s*][\s\S]*?[^\s])\*(?!\*)|^_([^\s_])_(?!_)|^\*([^\s*])\*(?!\*)/,
    code: /^(`+)\s*([\s\S]*?[^`]?)\s*\1(?!`)/,
    formula: /^(\$+)\s*([\s\S]*?[^$]?)\s*\1(?!\$)/,
    br: /^ {2,}\n(?!\s*$)/,
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    text: /^[\s\S]+?(?=[\\<!\[`$*~]|https?:\/\/|ftp:\/\/|www\.|[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@|\b_| {2,}\n|$)/,
    _escapes: /\\([!"#$%&'()*+,\-.\/:;<=>?@\[\]\\^_`{|}~])/g,
    _scheme: /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/,
    _email: /[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
    _attribute: /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/,
    _label: /(?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?/,
    _href: /\s*(<(?:\\[<>]?|[^\s<>\\])*>|(?:\\[()]?|\([^\s\x00-\x1f()\\]*\)|[^\s\x00-\x1f()\\])*?)/,
    _title: /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/,
    _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/
  };

  private _document: [Token[], Links] = [[], {}];

  /**
   * constructor of this document
   * @param src
   */
  constructor(src: string) {
    let tokens: Token[] = [];
    let links: Links = {};
    let currentPos = 0;

    const blockReg = this._blockReg;
    const inlineReg = this._inlineReg;
    console.log(inlineReg);

    function markdown(
      src: string,
      top: boolean = true,
      countLine: boolean = false
    ): [Token[], Links] {
      const currentPosTemp = currentPos;
      src = src
        .replace(/\r\n|\r/g, "\n")
        .replace(/\t/g, "    ")
        .replace(/\u00a0/g, " ")
        .replace(/\u2424/g, "\n")
        .replace(/^ +$/gm, "");

      let cap;
      var next, bull, space, i, tag, l, isordered;

      while (src) {
        // newline
        if ((cap = blockReg.newline.exec(src))) {
          src = src.substring(cap[0].length);

          if (cap[0].length > 1) {
            tokens.push({
              type: "space",
              startPos: currentPos,
              length: cap[0].length
            });
          }
          currentPos += cap[0].length;
        }

        // code
        if ((cap = blockReg.code.exec(src))) {
          src = src.substring(cap[0].length);

          const length = cap[0].length;
          cap = cap[0].replace(/^ {4}/gm, "");
          tokens.push({
            type: "code",
            text: cap.replace(/\n+$/, ""),
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // fences (gfm)
        if ((cap = blockReg.fences.exec(src))) {
          src = src.substring(cap[0].length);

          const length = cap[0].length;
          tokens.push({
            type: "code",
            lang: cap[2],
            text: cap[3] || "",
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // formula
        if ((cap = blockReg.formula.exec(src))) {
          src = src.substring(cap[0].length);

          const length = cap[0].length;
          tokens.push({
            type: "block_formula",
            text: cap[2] || "",
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // heading
        if ((cap = blockReg.heading.exec(src))) {
          src = src.substring(cap[0].length);

          const length = cap[0].length;
          tokens.push({
            type: "heading",
            depth: cap[1].length,
            text: cap[2],
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // table no leading pipe (gfm)
        if (top && (cap = blockReg.nptable.exec(src))) {
          const item: Tokens.Table = {
            type: "table",
            header: splitCells(cap[1].replace(/^ *| *\| *$/g, "")),
            align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */) as any,
            cells: [],
            startPos: 0,
            length: 0
          };

          const cells = cap[3] ? cap[3].replace(/\n$/, "").split("\n") : [];

          if (item.header.length === item.align.length) {
            src = src.substring(cap[0].length);
            const length = cap[0].length;

            for (i = 0; i < item.align.length; i++) {
              if (/^ *-+: *$/.test(item.align[i] || "")) {
                item.align[i] = "right";
              } else if (/^ *:-+: *$/.test(item.align[i] || "")) {
                item.align[i] = "center";
              } else if (/^ *:-+ *$/.test(item.align[i] || "")) {
                item.align[i] = "left";
              } else {
                item.align[i] = null;
              }
            }

            for (let i = 0; i < item.cells.length; i++) {
              item.cells[i] = splitCells(cells[i], item.header.length);
            }

            tokens.push({ ...item, startPos: currentPos, length });

            currentPos += length;
            continue;
          }
        }

        // hr
        if ((cap = blockReg.hr.exec(src))) {
          src = src.substring(cap[0].length);

          const length = cap[0].length;
          tokens.push({
            type: "hr",
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // blockquote
        if ((cap = blockReg.blockquote.exec(src))) {
          src = src.substring(cap[0].length);

          const length = cap[0].length;
          tokens.push({
            type: "blockquote_start",
            startPos: currentPos,
            length
          });

          currentPos += length;

          cap = cap[0].replace(/^ *> ?/gm, "");

          // Pass `top` to keep the current
          // "toplevel" state. This is exactly
          // how markdown.pl works.
          markdown(cap, top);

          tokens.push({
            type: "blockquote_end",
            startPos: currentPos,
            length: 0
          });

          continue;
        }

        // list
        if ((cap = blockReg.list.exec(src))) {
          src = src.substring(cap[0].length);
          const length = cap[0].length;

          bull = cap[2];
          isordered = bull.length > 1;

          tokens.push({
            type: "list_start",
            ordered: isordered,
            start: isordered ? +bull : null,
            ...(top
              ? {
                  startPos: currentPos,
                  length
                }
              : {})
          });

          // Get each top-level item.
          cap = cap[0].match(blockReg.item);

          next = false;
          l = cap!.length;
          i = 0;

          for (; i < l; i++) {
            let item = cap![i];

            // Remove the list item's bullet
            // so it is seen as the next token.
            space = item.length;
            item = item.replace(/^ *([*+-]|\d+\.) +/, "");

            // Outdent whatever the
            // list item contains. Hacky.
            if (~item.indexOf("\n ")) {
              space -= item.length;
              item = item.replace(new RegExp("^ {1," + space + "}", "gm"), "");
            }

            // Determine whether item is loose or not.
            // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
            // for discount behavior.
            let loose = next || /\n\n(?!\s*$)/.test(item);
            if (i !== l - 1) {
              next = item.charAt(item.length - 1) === "\n";
              if (!loose) loose = next;
            }

            // Check for task list items
            let istask = /^\[[ xX]\] /.test(item);
            let ischecked = undefined;
            if (istask) {
              ischecked = item[1] !== " ";
              item = item.replace(/^\[[ xX]\] +/, "");
            }

            if (loose) {
              tokens.push({
                type: "loose_item_start",
                task: istask,
                checked: !!ischecked
              });
            } else {
              tokens.push({
                type: "list_item_start",
                task: istask,
                checked: !!ischecked
              });
            }

            // Recurse.
            markdown(item, false, false);

            tokens.push({
              type: "list_item_end"
            });
          }

          currentPos += length;
          tokens.push({
            type: "list_end",
            ...(top
              ? {
                  startPos: currentPos,
                  length: 0
                }
              : {})
          });

          continue;
        }

        // html
        if ((cap = blockReg.html.exec(src))) {
          src = src.substring(cap[0].length);
          const length = cap[0].length;

          tokens.push({
            type: "html",
            pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
            text: cap[0],

            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // def
        if (top && (cap = blockReg.def.exec(src))) {
          src = src.substring(cap[0].length);
          currentPos += cap[0].length;

          if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
          tag = cap[1].toLowerCase().replace(/\s+/g, " ");
          if (!links[tag]) {
            links[tag] = {
              href: cap[2],
              title: cap[3]
            };
          }

          continue;
        }

        // table (gfm)
        if (top && (cap = blockReg.table.exec(src))) {
          const item: Tokens.Table = {
            type: "table",
            header: splitCells(cap[1].replace(/^ *| *\| *$/g, "")),
            align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */) as any,
            cells: [],
            length: 0,
            startPos: 0
          };

          const cells = cap[3]
            ? cap[3].replace(/(?: *\| *)?\n$/, "").split("\n")
            : [];

          if (item.header.length === item.align.length) {
            src = src.substring(cap[0].length);
            const length = cap[0].length;

            for (i = 0; i < item.align.length; i++) {
              if (/^ *-+: *$/.test(item.align[i] || "")) {
                item.align[i] = "right";
              } else if (/^ *:-+: *$/.test(item.align[i] || "")) {
                item.align[i] = "center";
              } else if (/^ *:-+ *$/.test(item.align[i] || "")) {
                item.align[i] = "left";
              } else {
                item.align[i] = null;
              }
            }

            for (i = 0; i < cells.length; i++) {
              item.cells[i] = splitCells(
                cells[i].replace(/^ *\| *| *\| *$/g, ""),
                item.header.length
              );
            }

            tokens.push({ ...item, length, startPos: currentPos });

            currentPos += length;
            continue;
          }
        }

        // lheading
        if ((cap = blockReg.lheading.exec(src))) {
          src = src.substring(cap[0].length);
          const length = cap[0].length;

          tokens.push({
            type: "heading",
            depth: cap[2] === "=" ? 1 : 2,
            text: cap[1],
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // top-level paragraph
        if (top && (cap = blockReg.paragraph.exec(src))) {
          src = src.substring(cap[0].length);
          const length = cap[0].length;

          tokens.push({
            type: "paragraph",
            text:
              cap[1].charAt(cap[1].length - 1) === "\n"
                ? cap[1].slice(0, -1)
                : cap[1],
            startPos: currentPos,
            length
          });

          currentPos += length;
          continue;
        }

        // text
        if ((cap = blockReg.text.exec(src))) {
          // Top-level should never reach here.
          src = src.substring(cap[0].length);
          const length = cap[0].length;

          tokens.push({
            type: "text",
            text: cap[0],
            startPos: currentPos,
            length
          });
          continue;
        }

        if (src) {
          throw new Error("Infinite loop on byte: " + src.charCodeAt(0));
        }
      }

      if (!countLine) {
        currentPos = currentPosTemp;
      }
      return [tokens, links];
    }

    src && (this._document = markdown(src, true, false));
  }

  /**
   * update this document
   * @param src whole text
   * @param cursorPos cursor position before some text are inserted or deleted
   */
  update(src: string, cursorPos?: number) {
    // if cursorPos is provided, fast update can be applied.
    console.log(src, cursorPos);
  }

  toVirtualDOM() {
    return this._document;
  }
}

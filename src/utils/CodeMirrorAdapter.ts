import CodeMirror, { Editor, Doc } from "codemirror";
import TextOperation from "./TextOperation";
import Selection, { Range } from "./Selection";

// var TextOperation = ot.TextOperation;
// var Selection = ot.Selection;

export default class CodeMirrorAdapter {
  ignoreNextChange = false;
  changeInProgress = false;
  selectionChanged = false;

  callbacks: any;
  constructor(private cm: Editor) {
    bind(this, "onChanges");
    bind(this, "onChange");
    bind(this, "onCursorActivity");
    bind(this, "onFocus");
    bind(this, "onBlur");

    cm.on("changes", this.onChanges);
    cm.on("change", this.onChange);
    cm.on("cursorActivity", this.onCursorActivity);
    cm.on("focus", this.onFocus);
    cm.on("blur", this.onBlur);
  }

  // Removes all event listeners from the CodeMirror instance.
  detach() {
    this.cm.off("changes", this.onChanges);
    this.cm.off("change", this.onChange);
    this.cm.off("cursorActivity", this.onCursorActivity);
    this.cm.off("focus", this.onFocus);
    this.cm.off("blur", this.onBlur);
  }

  // Converts a CodeMirror change array (as obtained from the 'changes' event
  // in CodeMirror v4) or single change or linked list of changes (as returned
  // by the 'change' event in CodeMirror prior to version 4) into a
  // TextOperation and its inverse and returns them as a two-element array.
  static operationFromCodeMirrorChanges(
    changes: CodeMirror.EditorChange[],
    doc: Doc
  ) {
    // Approach: Replay the changes, beginning with the most recent one, and
    // construct the operation and its inverse. We have to convert the position
    // in the pre-change coordinate system to an index. We have a method to
    // convert a position in the coordinate system after all changes to an index,
    // namely CodeMirror's `indexFromPos` method. We can use the information of
    // a single change object to convert a post-change coordinate system to a
    // pre-change coordinate system. We can now proceed inductively to get a
    // pre-change coordinate system for all changes in the linked list.
    // A disadvantage of this approach is its complexity `O(n^2)` in the length
    // of the linked list of changes.
    var docEndLength = codemirrorDocLength(doc);
    var operation = new TextOperation().retain(docEndLength);
    var inverse = new TextOperation().retain(docEndLength);

    var indexFromPos = function(pos: CodeMirror.Position) {
      return doc.indexFromPos(pos);
    };

    function last(arr: Array<any>) {
      return arr[arr.length - 1];
    }

    function sumLengths(strArr: Array<string>) {
      if (strArr.length === 0) {
        return 0;
      }
      var sum = 0;
      for (var i = 0; i < strArr.length; i++) {
        sum += strArr[i].length;
      }
      return sum + strArr.length - 1;
    }

    function updateIndexFromPos(
      indexFromPos: (pos: CodeMirror.Position) => number,
      change: CodeMirror.EditorChange
    ) {
      return function(pos: CodeMirror.Position) {
        if (posLe(pos, change.from)) {
          return indexFromPos(pos);
        }
        if (posLe(change.to, pos)) {
          return (
            indexFromPos({
              line:
                pos.line +
                change.text.length -
                1 -
                (change.to.line - change.from.line),
              ch:
                change.to.line < pos.line
                  ? pos.ch
                  : change.text.length <= 1
                    ? pos.ch -
                      (change.to.ch - change.from.ch) +
                      sumLengths(change.text)
                    : pos.ch - change.to.ch + last(change.text).length
            }) +
            sumLengths(change.removed) -
            sumLengths(change.text)
          );
        }
        if (change.from.line === pos.line) {
          return indexFromPos(change.from) + pos.ch - change.from.ch;
        }
        return (
          indexFromPos(change.from) +
          sumLengths(change.removed.slice(0, pos.line - change.from.line)) +
          1 +
          pos.ch
        );
      };
    }

    for (var i = changes.length - 1; i >= 0; i--) {
      var change = changes[i];
      indexFromPos = updateIndexFromPos(indexFromPos, change);

      var fromIndex = indexFromPos(change.from);
      var restLength = docEndLength - fromIndex - sumLengths(change.text);

      operation = new TextOperation()
        .retain(fromIndex)
        .del(sumLengths(change.removed))
        .insert(change.text.join("\n"))
        .retain(restLength)
        .compose(operation);

      inverse = inverse.compose(
        new TextOperation()
          .retain(fromIndex)
          .del(sumLengths(change.text))
          .insert(change.removed.join("\n"))
          .retain(restLength)
      );

      docEndLength += sumLengths(change.removed) - sumLengths(change.text);
    }

    return [operation, inverse];
  }

  // Singular form for backwards compatibility.
  static operationFromCodeMirrorChange =
    CodeMirrorAdapter.operationFromCodeMirrorChanges;

  // Apply an operation to a CodeMirror instance.
  static applyOperationToCodeMirror(operation: TextOperation, cm: Editor) {
    cm.operation(function() {
      const doc = cm.getDoc();
      var ops = operation.ops;
      var index = 0; // holds the current index into CodeMirror's content
      for (var i = 0, l = ops.length; i < l; i++) {
        var op = ops[i];
        if (TextOperation.isRetain(op)) {
          index += op as number;
        } else if (TextOperation.isInsert(op)) {
          doc.replaceRange(op, doc.posFromIndex(index));
          index += op.length;
        } else if (TextOperation.isDel(op)) {
          var from = doc.posFromIndex(index);
          var to = doc.posFromIndex(index - op);
          doc.replaceRange("", from, to);
        }
      }
    });
  }

  getValue() {
    return this.cm.getValue();
  }

  registerCallbacks(cb: any) {
    this.callbacks = cb;
  }

  trigger(event: string, ...args: any[]) {
    var action = this.callbacks && this.callbacks[event];
    if (action) {
      action.call(this, ...args);
    }
  }

  onChange() {
    // By default, CodeMirror's event order is the following:
    // 1. 'change', 2. 'cursorActivity', 3. 'changes'.
    // We want to fire the 'selectionChange' event after the 'change' event,
    // but need the information from the 'changes' event. Therefore, we detect
    // when a change is in progress by listening to the change event, setting
    // a flag that makes this adapter defer all 'cursorActivity' events.
    this.changeInProgress = true;
  }

  onChanges(_: any, changes: CodeMirror.EditorChange[]) {
    if (!this.ignoreNextChange) {
      var pair = CodeMirrorAdapter.operationFromCodeMirrorChanges(
        changes,
        this.cm.getDoc()
      );
      this.trigger("change", pair[0], pair[1]);
    }
    if (this.selectionChanged) {
      this.trigger("selectionChange");
    }
    this.changeInProgress = false;
    this.ignoreNextChange = false;
  }

  onFocus() {
    if (this.changeInProgress) {
      this.selectionChanged = true;
    } else {
      this.trigger("selectionChange");
    }
  }

  onCursorActivity() {
    if (this.changeInProgress) {
      this.selectionChanged = true;
    } else {
      this.trigger("selectionChange");
    }
  }

  onBlur() {
    if (!this.cm.getDoc().somethingSelected()) {
      this.trigger("blur");
    }
  }

  getSelection() {
    var doc = this.cm.getDoc();

    var selectionList = doc.listSelections();
    var ranges = [];
    for (var i = 0; i < selectionList.length; i++) {
      ranges[i] = new Selection.Range(
        doc.indexFromPos(selectionList[i].anchor),
        doc.indexFromPos(selectionList[i].head)
      );
    }

    return new Selection(ranges);
  }

  setOtherCursor(position: number, color: string, clientId: string) {
    var cursorPos = this.cm.getDoc().posFromIndex(position);
    var cursorCoords = this.cm.cursorCoords(cursorPos);
    var cursorEl = document.createElement("span");
    cursorEl.className = "other-client";
    cursorEl.style.display = "inline-block";
    cursorEl.style.padding = "0";
    cursorEl.style.marginLeft = cursorEl.style.marginRight = "-1px";
    cursorEl.style.borderLeftWidth = "2px";
    cursorEl.style.borderLeftStyle = "solid";
    cursorEl.style.borderLeftColor = color;
    cursorEl.style.height =
      (cursorCoords.bottom - cursorCoords.top) * 0.9 + "px";
    cursorEl.style.zIndex = "0";
    cursorEl.setAttribute("data-clientid", clientId);
    return this.cm.getDoc().setBookmark(cursorPos, {
      widget: cursorEl,
      insertLeft: true
    });
  }

  setOtherSelectionRange(range: Range, color: string) {
    var match = /^#([0-9a-fA-F]{6})$/.exec(color);
    if (!match) {
      throw new Error("only six-digit hex colors are allowed.");
    }
    var selectionClassName = "selection-" + match[1];
    var rule = "." + selectionClassName + " { background: " + color + "; }";
    addStyleRule(rule);

    const doc = this.cm.getDoc();
    var anchorPos = doc.posFromIndex(range.anchor);
    var headPos = doc.posFromIndex(range.head);

    return doc.markText(
      minPos(anchorPos, headPos),
      maxPos(anchorPos, headPos),
      { className: selectionClassName }
    );
  }

  setOtherSelection(selection: Selection, color: string, clientId: string) {
    var selectionObjects: CodeMirror.TextMarker[] = [];
    for (var i = 0; i < selection.ranges.length; i++) {
      var range = selection.ranges[i];
      if (range.isEmpty()) {
        selectionObjects[i] = this.setOtherCursor(range.head, color, clientId);
      } else {
        selectionObjects[i] = this.setOtherSelectionRange(
          range,
          color
          // clientId
        );
      }
    }
    return {
      clear: function() {
        for (var i = 0; i < selectionObjects.length; i++) {
          selectionObjects[i].clear();
        }
      }
    };
  }

  applyOperation(operation: TextOperation) {
    this.ignoreNextChange = true;
    CodeMirrorAdapter.applyOperationToCodeMirror(operation, this.cm);
  }

  registerUndo(undoFn: () => void) {
    this.cm.getDoc().undo = undoFn;
  }

  registerRedo(redoFn: () => void) {
    this.cm.getDoc().redo = redoFn;
  }
}

const addStyleRule = (function() {
  const added: { [k: string]: boolean } = {};
  const styleElement = document.createElement("style");
  document.documentElement
    .getElementsByTagName("head")[0]
    .appendChild(styleElement);
  var styleSheet = styleElement.sheet as CSSStyleSheet;

  return function(css: string) {
    if (added[css]) {
      return;
    }
    added[css] = true;
    styleSheet.insertRule(
      css,
      (styleSheet.cssRules || styleSheet.rules).length
    );
  };
})();

// Bind a method to an object, so it doesn't matter whether you call
// object.method() directly or pass object.method as a reference to another
// function.
function bind(obj: any, method: string) {
  var fn = obj[method];
  obj[method] = function() {
    fn.apply(obj, arguments);
  };
}

function cmpPos(a: CodeMirror.Position, b: CodeMirror.Position) {
  if (a.line < b.line) {
    return -1;
  }
  if (a.line > b.line) {
    return 1;
  }
  if (a.ch < b.ch) {
    return -1;
  }
  if (a.ch > b.ch) {
    return 1;
  }
  return 0;
}
// function posEq(a: CodeMirror.Position, b: CodeMirror.Position) {
//   return cmpPos(a, b) === 0;
// }
function posLe(a: CodeMirror.Position, b: CodeMirror.Position) {
  return cmpPos(a, b) <= 0;
}

function minPos(a: CodeMirror.Position, b: CodeMirror.Position) {
  return posLe(a, b) ? a : b;
}
function maxPos(a: CodeMirror.Position, b: CodeMirror.Position) {
  return posLe(a, b) ? b : a;
}

function codemirrorDocLength(doc: Doc) {
  return (
    doc.indexFromPos({ line: doc.lastLine(), ch: 0 }) +
    doc.getLine(doc.lastLine()).length
  );
}

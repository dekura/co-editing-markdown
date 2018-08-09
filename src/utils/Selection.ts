import TextOperation from "./TextOperation";

// Range has `anchor` and `head` properties, which are zero-based indices into
// the document. The `anchor` is the side of the selection that stays fixed,
// `head` is the side of the selection where the cursor is. When both are
// equal, the range represents a cursor.
// function Range(anchor, head) {
//   this.anchor = anchor;
//   this.head = head;
// }
export class Range {
  constructor(public anchor: number, public head: number) {}

  static fromJSON(obj: Range) {
    return new Range(obj.anchor, obj.head);
  }

  equals(other: Range) {
    return this.anchor === other.anchor && this.head === other.head;
  }

  isEmpty() {
    return this.anchor === this.head;
  }

  transform(other: TextOperation) {
    function transformIndex(index: number) {
      var newIndex = index;
      var ops = other.ops;
      for (var i = 0, l = other.ops.length; i < l; i++) {
        const op = ops[i];
        if (TextOperation.isRetain(op)) {
          index -= op as number;
        } else if (TextOperation.isInsert(op)) {
          newIndex += op.length;
        } else {
          newIndex -= Math.min(index, -op);
          index += op;
        }
        if (index < 0) {
          break;
        }
      }

      return newIndex;
    }

    var newAnchor = transformIndex(this.anchor);
    if (this.anchor === this.head) {
      return new Range(newAnchor, newAnchor);
    }
    return new Range(newAnchor, transformIndex(this.head));
  }
}

// A selection is basically an array of ranges. Every range represents a real
// selection or a cursor in the document (when the start position equals the
// end position of the range). The array must not be empty.
export default class Selection {
  constructor(public ranges: Range[] = []) {}

  static Range = Range;

  // Convenience method for creating selections only containing a single cursor
  // and no real selection range.
  static createCursor(position: number) {
    return new Selection([new Range(position, position)]);
  }

  static fromJSON(obj: Selection) {
    var objRanges = obj.ranges || obj;
    for (var i = 0, ranges = []; i < objRanges.length; i++) {
      ranges[i] = Range.fromJSON(objRanges[i]);
    }
    return new Selection(ranges);
  }

  equals(other: Selection) {
    // if (this.position !== other.position) {
    //   return false;
    // }
    if (this.ranges.length !== other.ranges.length) {
      return false;
    }
    // FIXME: Sort ranges before comparing them?
    for (var i = 0; i < this.ranges.length; i++) {
      if (!this.ranges[i].equals(other.ranges[i])) {
        return false;
      }
    }
    return true;
  }

  somethingSelected() {
    for (var i = 0; i < this.ranges.length; i++) {
      if (!this.ranges[i].isEmpty()) {
        return true;
      }
    }
    return false;
  }

  // Return the more current selection information.
  compose(other: Selection) {
    return other;
  }

  // Update the selection with respect to an operation.
  transform(other: TextOperation) {
    for (var i = 0, newRanges = []; i < this.ranges.length; i++) {
      newRanges[i] = this.ranges[i].transform(other);
    }
    return new Selection(newRanges);
  }
}

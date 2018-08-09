/**
 * [index1, index2] 指的是retain
 * string 指的是insert
 */
export type Changeset = Array<[number, number] | string>;

export class Text {
  private op: Changeset = [];

  static create() {
    return new Text();
  }

  retain(from: number, to: number) {
    const lastOne = this.op[this.op.length - 1];
    if (typeof lastOne !== "string") {
      if (lastOne[1] === from + 1) {
        lastOne[1] = to;
      }
    } else {
      this.op.push([from, to]);
    }

    return this;
  }

  insert(str: string) {
    if (typeof this.op[this.op.length - 1] === "string") {
      this.op[this.op.length - 1] += str;
    } else {
      this.op.push(str);
    }

    return this;
  }
}

/**
 * Utility wrapping a writeable stream, offering methods to fluidly write markdown content to it.
 */
class Writer {
  /**
   * @param {fs.WriteStream} writeStream The stream to wrap.
   */
  constructor(writeStream) {
    this.writeStream = writeStream;
    this.lastLineHadSpaceAround = true;
  }

  h(depth, line) {
    this.line(`${'#'.repeat(depth)} ${line}`, true);
  }

  /**
   * Writes cells for a table header.
   * @param {Array.<string>} cells Contents for each cell in this header.
   */
  tableHead(cells) {
    this.line(tableLine(cells));
    const underlines = cells.map((title) => '-'.repeat(title.length));
    this.line(tableLine(underlines));
  }

  /**
   * Writes cells for a line in a table body.
   * @param {Array.<string>} cellContents Contents for each cell in this body row.
   */
  tableBodyLine(cells) {
    this.line(tableLine(cells));
  }

  /**
   * Writes the given string plus a terminating newline character.
   * @param {string} line Contents for the line.
   * @param {boolean} spaceAround
   */
  line(line, spaceAround = false) {
    const prefix = (!this.lastLineHadSpaceAround && spaceAround ? '\n' : '');
    const suffix = spaceAround ? '\n' : '';
    this.writeStream.write(`${prefix}${line}\n${suffix}`);
    this.lastLineHadSpaceAround = spaceAround;
  }

  end() {
    this.writeStream.end();
  }
}

module.exports = {
  Writer,
};

function tableLine(cells) {
  const packed = cells.join(' | ');
  return `| ${packed} |`;
}

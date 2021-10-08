const fs = require('fs');

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
   *
   * @param {Array.<string>} cells Contents for each cell in this header.
   */
  tableHead(cells) {
    this.line(tableLine(cells));
    const underlines = cells.map((title) => '-'.repeat(title.length));
    this.line(tableLine(underlines));
  }

  /**
   * Writes cells for a line in a table body.
   *
   * @param {string[]} cells Contents for each cell in this body row.
   */
  tableBodyLine(cells) {
    this.line(tableLine(cells));
  }

  /**
   * Writes the given string plus a terminating newline character.
   *
   * @param {string} line Contents for the line.
   * @param {boolean} spaceAround Whether this line should have an empty line above and below it.
   */
  line(line, spaceAround = false) {
    const prefix = (!this.lastLineHadSpaceAround && spaceAround ? '\n' : '');
    const suffix = spaceAround ? '\n' : '';
    this.writeStream.write(`${prefix}${line}\n${suffix}`);
    this.lastLineHadSpaceAround = spaceAround;
  }

  async end() {
    const stream = this.writeStream;
    await new Promise((resolve) => {
      stream.on('finish', () => {
        resolve();
      });
      stream.end();
    });
  }
}

module.exports = {
  Writer,
};

/**
 * Encapsulate cells as markdown-formatted table row.
 *
 * @param {string[]} cells The contents for each cell in the row.
 * @returns {string} The markdown-formatted table row.
 */
function tableLine(cells) {
  const packed = cells.join(' | ');
  return `| ${packed} |`;
}

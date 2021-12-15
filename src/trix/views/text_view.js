/* eslint-disable
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import ObjectView from "trix/views/object_view"
import ObjectGroup from "trix/core/collections/object_group"
import PieceView from "trix/views/piece_view"

export default class TextView extends ObjectView {
  constructor() {
    super(...arguments)
    this.text = this.object
    this.textConfig = this.options.textConfig
  }

  createNodes() {
    const nodes = []
    const pieces = ObjectGroup.groupObjects(this.getPieces())
    const lastIndex = pieces.length - 1

    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index]
      const context = {}
      if (index === 0) {
        context.isFirst = true
      }
      if (index === lastIndex) {
        context.isLast = true
      }
      if (endsWithWhitespace(previousPiece)) {
        context.followsWhitespace = true
      }

      const view = this.findOrCreateCachedChildView(PieceView, piece, { textConfig: this.textConfig, context })
      nodes.push(...Array.from(view.getNodes() || []))

      var previousPiece = piece
    }
    return nodes
  }

  getPieces() {
    return Array.from(this.text.getPieces()).filter((piece) => !piece.hasAttribute("blockBreak"))
  }
}

var endsWithWhitespace = (piece) => /\s$/.test(piece?.toString())

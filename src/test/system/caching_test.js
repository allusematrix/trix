import { assert, clickToolbarButton, moveCursor, test, testGroup, typeCharacters } from "test/test_helper"

testGroup("View caching", { template: "editor_empty" }, () => {
  test("reparsing and rendering identical texts", (done) => {
    typeCharacters("a\nb\na", () => {
      moveCursor({ direction: "left", times: 2 }, () => {
        clickToolbarButton({ attribute: "quote" }, () => {
          const html = getEditorElement().innerHTML
          getEditorController().reparse()
          getEditorController().render()
          assert.equal(getEditorElement().innerHTML, html)
          done()
        })
      })
    })
  })

  test("reparsing and rendering identical blocks", (done) => {
    clickToolbarButton({ attribute: "bullet" }, () => {
      typeCharacters("a\na", () => {
        const html = getEditorElement().innerHTML
        getEditorController().reparse()
        getEditorController().render()
        assert.equal(getEditorElement().innerHTML, html)
        done()
      })
    })
  })
})

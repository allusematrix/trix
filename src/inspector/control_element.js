/* eslint-disable
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const KEY_EVENTS = "keydown keypress input".split(" ")
const COMPOSITION_EVENTS = "compositionstart compositionupdate compositionend textInput".split(" ")
const OBSERVER_OPTIONS = {
  attributes: true,
  childList: true,
  characterData: true,
  characterDataOldValue: true,
  subtree: true,
}

export default class ControlElement {
  constructor(editorElement) {
    this.didMutate = this.didMutate.bind(this)
    this.editorElement = editorElement
    this.install()
  }

  install() {
    this.createElement()
    this.logInputEvents()
    return this.logMutations()
  }

  uninstall() {
    this.observer.disconnect()
    return this.element.parentNode.removeChild(this.element)
  }

  createElement() {
    this.element = document.createElement("div")
    this.element.setAttribute("contenteditable", "")
    this.element.style.width = getComputedStyle(this.editorElement).width
    this.element.style.minHeight = "50px"
    this.element.style.border = "1px solid green"
    return this.editorElement.parentNode.insertBefore(this.element, this.editorElement.nextSibling)
  }

  logInputEvents() {
    KEY_EVENTS.forEach((eventName) => {
      this.element.addEventListener(eventName, (event) => console.log(`${event.type}: keyCode = ${event.keyCode}`))
    })

    COMPOSITION_EVENTS.forEach((eventName) => {
      this.element.addEventListener(eventName, (event) =>
        console.log(`${event.type}: data = ${JSON.stringify(event.data)}`)
      )
    })
  }

  logMutations() {
    this.observer = new window.MutationObserver(this.didMutate)
    return this.observer.observe(this.element, OBSERVER_OPTIONS)
  }

  didMutate(mutations) {
    console.log(`Mutations (${mutations.length}):`)
    for (let index = 0; index < mutations.length; index++) {
      var mutation = mutations[index]
      console.log(` ${index + 1}. ${mutation.type}:`)
      switch (mutation.type) {
        case "characterData":
          console.log(`  oldValue = ${JSON.stringify(mutation.oldValue)}, newValue = ${JSON.stringify(mutation.target.data)}`)
          break
        case "childList":
          Array.from(mutation.addedNodes).forEach((node) => {
            console.log(`  node added ${inspectNode(node)}`)
          })

          Array.from(mutation.removedNodes).forEach((node) => {
            console.log(`  node removed ${inspectNode(node)}`)
          })
      }
    }
  }
}

var inspectNode = function(node) {
  if (node.data != null) {
    return JSON.stringify(node.data)
  } else {
    return JSON.stringify(node.outerHTML)
  }
}

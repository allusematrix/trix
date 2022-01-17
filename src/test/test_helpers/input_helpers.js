import config from "trix/config"
import { defer } from "trix/core/helpers"
import { triggerEvent } from "./event_helpers"
import {
  collapseSelection,
  createDOMRangeFromPoint,
  deleteSelection,
  insertNode,
  selectNode,
  selectionIsCollapsed,
} from "./selection_helpers"

const keyCodes = {}

Object.keys(config.keyNames).forEach(code => {
  const name = config.keyNames[code]
  keyCodes[name] = code
})

const isIE = /Windows.*Trident/.test(navigator.userAgent)

export const triggerInputEvent = function (element, type, properties = {}) {
  if (config.input.getLevel() === 2) {
    let ranges
    if (properties.ranges) {
      ({ ranges } = properties)
      delete properties.ranges
    } else {
      ranges = []
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        ranges.push(selection.getRangeAt(0).cloneRange())
      }
    }
    properties.getTargetRanges = () => ranges
    triggerEvent(element, type, properties)
  }
}

export const pasteContent = function (contentType, value, callback) {
  let data

  if (typeof contentType === "object") {
    data = contentType
    callback = value
  } else {
    data = { [contentType]: value }
  }

  const testClipboardData = {
    getData: (type) => data[type],
    types: Object.keys(data),
    items: Object.values(data),
  }

  if (testClipboardData.types.includes("Files")) {
    testClipboardData.files = testClipboardData.items
  }

  triggerInputEvent(document.activeElement, "beforeinput", {
    inputType: "insertFromPaste",
    dataTransfer: testClipboardData,
  })

  triggerEvent(document.activeElement, "paste", { testClipboardData })

  if (callback) {
    requestAnimationFrame (callback)
  }
}

export const createFile = function (properties = {}) {
  const file = {
    getAsFile() {
      return {}
    },
  }
  for (const key in properties) {
    const value = properties[key]
    file[key] = value
  }
  return file
}

export const typeCharacters = function (string, callback) {
  let characters, typeNextCharacter
  if (Array.isArray(string)) {
    characters = string
  } else {
    characters = string.split("")
  }

  return (typeNextCharacter = () =>
    defer(function () {
      const character = characters.shift()
      if (character != null) {
        switch (character) {
          case "\n":
            return pressKey("return", typeNextCharacter)
          case "\b":
            return pressKey("backspace", typeNextCharacter)
          default:
            return typeCharacterInElement(character, document.activeElement, typeNextCharacter)
        }
      } else {
        return callback()
      }
    }))()
}

export const pressKey = function (keyName, callback) {
  const element = document.activeElement
  const code = keyCodes[keyName]
  const properties = { which: code, keyCode: code, charCode: 0, key: capitalize(keyName) }

  if (!triggerEvent(element, "keydown", properties)) {
    return callback()
  }

  return simulateKeypress(keyName, () => {
    defer(() => {
      triggerEvent(element, "keyup", properties)
      defer(callback)
    })
  })
}

export const startComposition = function (data, callback) {
  const element = document.activeElement
  triggerEvent(element, "compositionstart", { data: "" })
  triggerInputEvent(element, "beforeinput", { inputType: "insertCompositionText", data })
  triggerEvent(element, "compositionupdate", { data })
  triggerEvent(element, "input")

  const node = document.createTextNode(data)
  insertNode(node)
  selectNode(node, callback)
}

export const updateComposition = function (data, callback) {
  const element = document.activeElement
  triggerInputEvent(element, "beforeinput", { inputType: "insertCompositionText", data })
  triggerEvent(element, "compositionupdate", { data })
  triggerEvent(element, "input")

  const node = document.createTextNode(data)
  insertNode(node)
  selectNode(node, callback)
}

export const endComposition = function (data, callback) {
  const element = document.activeElement
  triggerInputEvent(element, "beforeinput", { inputType: "insertCompositionText", data })
  triggerEvent(element, "compositionupdate", { data })

  const node = document.createTextNode(data)
  insertNode(node)
  selectNode(node)
  collapseSelection("right", function () {
    triggerEvent(element, "input")
    triggerEvent(element, "compositionend", { data })
    requestAnimationFrame (callback)
  })
}

export const clickElement = function (element, callback) {
  if (triggerEvent(element, "mousedown")) {
    defer(function () {
      if (triggerEvent(element, "mouseup")) {
        defer(function () {
          triggerEvent(element, "click")
          defer(callback)
        })
      }
    })
  }
}

export const dragToCoordinates = function (coordinates, callback) {
  const element = document.activeElement

  // IE only allows writing "text" to DataTransfer
  // https://msdn.microsoft.com/en-us/library/ms536744(v=vs.85).aspx
  const dataTransfer = {
    files: [],
    data: {},
    getData(format) {
      if (isIE && format.toLowerCase() !== "text") {
        throw new Error("Invalid argument.")
      } else {
        this.data[format]
        return true
      }
    },
    setData(format, data) {
      if (isIE && format.toLowerCase() !== "text") {
        throw new Error("Unexpected call to method or property access.")
      } else {
        this.data[format] = data
      }
    },
  }

  triggerEvent(element, "mousemove")

  const dragstartData = { dataTransfer }
  triggerEvent(element, "dragstart", dragstartData)
  triggerInputEvent(element, "beforeinput", { inputType: "deleteByDrag" })

  const dropData = { dataTransfer }
  for (const key in coordinates) {
    const value = coordinates[key]
    dropData[key] = value
  }
  triggerEvent(element, "drop", dropData)

  const { clientX, clientY } = coordinates
  const domRange = createDOMRangeFromPoint(clientX, clientY)
  triggerInputEvent(element, "beforeinput", { inputType: "insertFromDrop", ranges: [ domRange ] })

  defer(callback)
}

export const mouseDownOnElementAndMove = function (element, distance, callback) {
  const coordinates = getElementCoordinates(element)
  triggerEvent(element, "mousedown", coordinates)

  const destination = (offset) => ({
    clientX: coordinates.clientX + offset,
    clientY: coordinates.clientY + offset,
  })

  const dragSpeed = 20

  return after(dragSpeed, function () {
    let drag
    let offset = 0
    return (drag = () => {
      if (++offset <= distance) {
        triggerEvent(element, "mousemove", destination(offset))
        return after(dragSpeed, drag)
      } else {
        triggerEvent(element, "mouseup", destination(distance))
        return after(dragSpeed, callback)
      }
    })()
  })
}

const typeCharacterInElement = function (character, element, callback) {
  const charCode = character.charCodeAt(0)
  const keyCode = character.toUpperCase().charCodeAt(0)

  if (!triggerEvent(element, "keydown", { keyCode, charCode: 0 })) {
    return callback()
  }

  defer(function () {
    if (!triggerEvent(element, "keypress", { keyCode: charCode, charCode })) {
      return callback()
    }
    triggerInputEvent(element, "beforeinput", { inputType: "insertText", data: character })
    return insertCharacter(character, function () {
      triggerEvent(element, "input")

      defer(function () {
        triggerEvent(element, "keyup", { keyCode, charCode: 0 })
        return callback()
      })
    })
  })
}

const insertCharacter = function (character, callback) {
  const node = document.createTextNode(character)
  return insertNode(node, callback)
}

const simulateKeypress = function (keyName, callback) {
  switch (keyName) {
    case "backspace":
      return deleteInDirection("left", callback)
    case "delete":
      return deleteInDirection("right", callback)
    case "return":
      defer(function () {
        triggerInputEvent(document.activeElement, "beforeinput", { inputType: "insertParagraph" })
        const node = document.createElement("br")
        return insertNode(node, callback)
      })
  }
}

const deleteInDirection = function (direction, callback) {
  if (selectionIsCollapsed()) {
    getComposition().expandSelectionInDirection(direction === "left" ? "backward" : "forward")
    defer(function () {
      const inputType = direction === "left" ? "deleteContentBackward" : "deleteContentForward"
      triggerInputEvent(document.activeElement, "beforeinput", { inputType })
      defer(function () {
        deleteSelection()
        return callback()
      })
    })
  } else {
    triggerInputEvent(document.activeElement, "beforeinput", { inputType: "deleteContentBackward" })
    deleteSelection()
    return callback()
  }
}

const getElementCoordinates = function (element) {
  const rect = element.getBoundingClientRect()
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }
}

const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1)

/* eslint-disable
    id-length,
    no-empty,
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
// This file is not included in the main Trix bundle and
// should be explicitly required to enable the debugger.

const DEBUG_METHODS = {
  AttachmentEditorController: "\
didClickRemoveButton \
uninstall\
",

  "Trix.CompositionController": "\
didClickAttachment\
",

  EditorController: "\
setEditor \
loadDocument\
",

  "Trix.Level0InputController":
    "\
elementDidMutate \
events.keydown \
events.keypress \
events.dragstart \
events.dragover \
events.dragend \
events.drop \
events.cut \
events.paste \
events.compositionstart \
events.compositionend\
",

  "Trix.Level2InputController": "\
elementDidMutate \
events.beforeinput \
events.input \
events.compositionend\
",

  "Trix.ToolbarController":
    "\
didClickActionButton \
didClickAttributeButton \
didClickDialogButton \
didKeyDownDialogInput\
",
}

import { findClosestElementFromNode } from "trix/core/helpers"

let errorListeners = []

Trix.Debugger = {
  addErrorListener(listener) {
    if (!Array.from(errorListeners).includes(listener)) {
      return errorListeners.push(listener)
    }
  },

  removeErrorListener(listener) {
    errorListeners = Array.from(errorListeners).filter((l) => l !== listener)
  },
}

const installMethodDebugger = function(className, methodName) {
  const [ objectName, ...constructorNames ] = className.split(".")

  const parts = methodName.split(".")
  const propertyNames = parts.slice(0, parts.length - 1)
  methodName = parts[parts.length - 1]

  let object = this[objectName]
  Array.from(constructorNames).forEach((constructorName) => {
    object = object[constructorName]
  })
  object = object.prototype
  Array.from(propertyNames).forEach((propertyName) => {
    object = object[propertyName]
  })

  if (typeof object?.[methodName] === "function") {
    object[methodName] = wrapFunctionWithErrorHandler(object[methodName])
  } else {
    throw new Error("Can't install on non-function")
  }
}

var wrapFunctionWithErrorHandler = function(fn) {
  const trixDebugWrapper = function() {
    try {
      return fn.apply(this, arguments)
    } catch (error) {
      reportError(error)
      throw error
    }
  }
  return trixDebugWrapper
}

var reportError = function(error) {
  Trix.Debugger.lastError = error

  console.error("Trix error!")
  console.log(error.stack)

  const { activeElement } = document
  const editorElement = findClosestElementFromNode(activeElement, { matchingSelector: "trix-editor" })

  if (editorElement) {
    return notifyErrorListeners(error, editorElement)
  } else {
    return console.warn("Can't find <trix-editor> element. document.activeElement =", activeElement)
  }
}

var notifyErrorListeners = (error, element) => {
  Array.from(errorListeners).forEach((listener) => {
    try {
      listener(error, element)
    } catch (error1) {}
  })
}

(function() {
  console.groupCollapsed("Trix debugger")

  for (const className in DEBUG_METHODS) {
    const methodNames = DEBUG_METHODS[className]

    Array.from(methodNames.split(/\s/)).forEach((methodName) => {
      try {
        installMethodDebugger(className, methodName)
        console.log(`✓ ${className}#${methodName}`)
      } catch (error) {
        console.warn(`✗ ${className}#${methodName}:`, error.message)
      }
    })
  }

  return console.groupEnd()
})()

#= require trix/controllers/input_controller

{dataTransferIsPlainText, keyEventIsKeyboardCommand} = Trix

class Trix.Level2InputController extends Trix.InputController
  elementDidMutate: (mutationSummary) ->
    if @scheduledRender
      @delegate?.inputControllerDidAllowUnhandledInput?() if @composing
    else
      console.log("unexpected mutation! #{JSON.stringify(mutationSummary)}")
      @handleInput(@requestReparse)

  scheduleRender: ->
    @scheduledRender ?= requestAnimationFrame(@render)

  render: =>
    cancelAnimationFrame(@scheduledRender)
    @scheduledRender = null
    @handleInput(@requestRender) unless @composing
    @afterRender?()
    @afterRender = null

  events:
    keydown: (event) ->
      if keyEventIsKeyboardCommand(event)
        command = keyboardCommandFromKeyEvent(event)
        if @delegate?.inputControllerDidReceiveKeyboardCommand(command)
          event.preventDefault()
      else
        if handler = @keys[event.key]
          unless event.altKey or event.shiftKey
            @withEvent(event, handler)

    beforeinput: (event) ->
      if handler = @inputTypes[event.inputType]
        @withEvent(event, handler)
        @scheduleRender()

    dragenter: (event) ->
      if dragEventHasFiles(event)
        event.preventDefault()

    drop: (event) ->
      if dragEventHasFiles(event)
        event.preventDefault()
        point = x: event.clientX, y: event.clientY
        @responder?.setLocationRangeFromPointRange(point)
        @attachFiles(event.dataTransfer.files)

    compositionend: (event) ->
      if @composing
        @composing = false
        @scheduleRender()

  keys:
    ArrowLeft: ->
      if @responder?.shouldManageMovingCursorInDirection("backward")
        @event.preventDefault()
        @responder?.moveCursorInDirection("backward")

    ArrowRight: ->
      if @responder?.shouldManageMovingCursorInDirection("forward")
        @event.preventDefault()
        @responder?.moveCursorInDirection("forward")

    Backspace: ->
      if @responder?.shouldManageDeletingInDirection("backward")
        @event.preventDefault()
        @delegate?.inputControllerWillPerformTyping()
        @responder?.deleteInDirection("backward")
        @render()

    Tab: ->
      if @responder?.canIncreaseNestingLevel()
        @event.preventDefault()
        @responder?.increaseNestingLevel()
        @render()

  inputTypes:
    deleteByComposition: ->
      @deleteInDirection("backward", recordUndoEntry: false)

    deleteByCut: ->
      @deleteInDirection("backward")

    deleteByDrag: ->
      @event.preventDefault()
      @withTargetDOMRange ->
        @draggedRange = @responder?.getSelectedRange()

    deleteCompositionText: ->
      @deleteInDirection("backward", recordUndoEntry: false)

    deleteContent: ->
      @deleteInDirection("backward")

    deleteContentBackward: ->
      @deleteInDirection("backward")

    deleteContentForward: ->
      @deleteInDirection("forward")

    deleteEntireSoftLine: ->
      @deleteInDirection("forward")

    deleteHardLineBackward: ->
      @deleteInDirection("backward")

    deleteHardLineForward: ->
      @deleteInDirection("forward")

    deleteSoftLineBackward: ->
      @deleteInDirection("backward")

    deleteSoftLineForward: ->
      @deleteInDirection("forward")

    deleteWordBackward: ->
      @deleteInDirection("backward")

    deleteWordForward: ->
      @deleteInDirection("forward")

    formatBackColor: ->
      @activateAttributeIfSupported("backgroundColor", @event.data)

    formatBold: ->
      @toggleAttributeIfSupported("bold")

    formatFontColor: ->
      @activateAttributeIfSupported("color", @event.data)

    formatFontName: ->
      @activateAttributeIfSupported("font", @event.data)

    formatIndent: ->
      if @responder?.canIncreaseNestingLevel()
        @withTargetDOMRange ->
          @responder?.increaseNestingLevel()

    formatItalic: ->
      @toggleAttributeIfSupported("italic")

    formatJustifyCenter: ->
      @toggleAttributeIfSupported("justifyCenter")

    formatJustifyFull: ->
      @toggleAttributeIfSupported("justifyFull")

    formatJustifyLeft: ->
      @toggleAttributeIfSupported("justifyLeft")

    formatJustifyRight: ->
      @toggleAttributeIfSupported("justifyRight")

    formatOutdent: ->
      if @responder?.canDecreaseNestingLevel()
        @withTargetDOMRange ->
          @responder?.decreaseNestingLevel()

    formatRemove: ->
      @withTargetDOMRange ->
        for attributeName of @responder?.getCurrentAttributes()
          @responder?.removeCurrentAttribute(attributeName)

    formatSetBlockTextDirection: ->
      @activateAttributeIfSupported("blockDir", @event.data)

    formatSetInlineTextDirection: ->
      @activateAttributeIfSupported("textDir", @event.data)

    formatStrikeThrough: ->
      @toggleAttributeIfSupported("strike")

    formatSubscript: ->
      @toggleAttributeIfSupported("sub")

    formatSuperscript: ->
      @toggleAttributeIfSupported("sup")

    formatUnderline: ->
      @toggleAttributeIfSupported("underline")

    historyRedo: ->
      @delegate?.inputControllerWillPerformRedo()

    historyUndo: ->
      @delegate?.inputControllerWillPerformUndo()

    insertCompositionText: ->
      @composing = true
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString(@event.data)

    insertFromComposition: ->
      @composing = false
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString(@event.data)

    insertFromDrop: ->
      if range = @draggedRange
        @draggedRange = null
        @delegate?.inputControllerWillMoveText()
        @withTargetDOMRange ->
          @responder?.moveTextFromRange(range)

    insertFromPaste: ->
      {dataTransfer} = @event
      paste = {dataTransfer}

      if href = dataTransfer.getData("URL")
        paste.type = "URL"
        paste.href = href
        if name = dataTransfer.getData("public.url-name")
          paste.string = Trix.squishBreakableWhitespace(name).trim()
        else
          paste.string = href
        @delegate?.inputControllerWillPaste(paste)
        @withTargetDOMRange ->
          @responder?.insertText(Trix.Text.textForStringWithAttributes(paste.string, href: paste.href))
        @afterRender = =>
          @delegate?.inputControllerDidPaste(paste)

      else if dataTransferIsPlainText(dataTransfer)
        paste.type = "text/plain"
        paste.string = dataTransfer.getData("text/plain")
        @delegate?.inputControllerWillPaste(paste)
        @withTargetDOMRange ->
          @responder?.insertString(paste.string)
        @afterRender = =>
          @delegate?.inputControllerDidPaste(paste)

      else if html = dataTransfer.getData("text/html")
        paste.type = "text/html"
        paste.html = html
        @delegate?.inputControllerWillPaste(paste)
        @withTargetDOMRange ->
          @responder?.insertHTML(paste.html)
        @afterRender = =>
          @delegate?.inputControllerDidPaste(paste)

      else if dataTransfer.files?.length
        paste.type = "File"
        paste.file = dataTransfer.files[0]
        @delegate?.inputControllerWillPaste(paste)
        @withTargetDOMRange ->
          @responder?.insertFile(paste.file)
        @afterRender = =>
          @delegate?.inputControllerDidPaste(paste)

    insertFromYank: ->
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString(@event.data)

    # insertHorizontalRule: ->

    insertLineBreak: ->
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString("\n")

    insertLink: ->
      @activateAttributeIfSupported("href", @event.data)

    insertOrderedList: ->
      @toggleAttributeIfSupported("number")

    insertParagraph: ->
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertLineBreak()

    insertReplacementText: ->
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString(@event.dataTransfer.getData("text/plain"), updatePosition: false)

    insertText: ->
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString(@event.data)

    insertTranspose: ->
      @delegate?.inputControllerWillPerformTyping()
      @withTargetDOMRange ->
        @responder?.insertString(@event.data)

    insertUnorderedList: ->
      @toggleAttributeIfSupported("bullet")

  # Responder helpers

  toggleAttributeIfSupported: (attributeName) ->
    if attributeName in Trix.getAllAttributeNames()
      @delegate?.inputControllerWillPerformFormatting()
      @withTargetDOMRange ->
        @responder?.toggleCurrentAttribute(attributeName)

  activateAttributeIfSupported: (attributeName, value) ->
    if attributeName in Trix.getAllAttributeNames()
      @delegate?.inputControllerWillPerformFormatting()
      @withTargetDOMRange ->
        @responder?.setCurrentAttribute(attributeName, value)

  deleteInDirection: (direction, {recordUndoEntry} = {recordUndoEntry: true}) ->
    @delegate?.inputControllerWillPerformTyping() if recordUndoEntry
    perform = => @responder?.deleteInDirection(direction)
    if domRange = @getTargetDOMRange(minLength: 2)
      @withTargetDOMRange(domRange, perform)
    else
      perform()

  # Selection helpers

  withTargetDOMRange: (domRange, fn) ->
    if typeof domRange is "function"
      fn = domRange
      domRange = @getTargetDOMRange()
    if domRange
      @responder?.withTargetDOMRange(domRange, fn.bind(this))
    else
      Trix.selectionChangeObserver.reset()
      fn.call(this)

  getTargetDOMRange: ({minLength} = {minLength: 0}) ->
    if targetRanges = @event.getTargetRanges?()
      if targetRanges.length
        domRange = staticRangeToRange(targetRanges[0])
        if minLength is 0 or domRange.toString().length >= minLength
          domRange

  staticRangeToRange = (staticRange) ->
    range = document.createRange()
    range.setStart(staticRange.startContainer, staticRange.startOffset)
    range.setEnd(staticRange.endContainer, staticRange.endOffset)
    range

  # Event helpers

  withEvent: (event, fn) ->
    @event = event
    try
      result = fn.call(this)
    finally
      @event = null
    result

  dragEventHasFiles = (event) ->
    "Files" in (event.dataTransfer?.types ? [])

  keyboardCommandFromKeyEvent = (event) ->
    command = []
    command.push("alt") if event.altKey
    command.push("shift") if event.shiftKey
    command.push(event.key)
    command

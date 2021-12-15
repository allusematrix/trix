// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import BasicObject from "trix/core/basic_object"
import ObjectGroup from "trix/core/collections/object_group"

export default class ObjectView extends BasicObject {
  constructor(object, options = {}) {
    super(...arguments)
    this.object = object
    this.options = options
    this.childViews = []
    this.rootView = this
  }

  getNodes() {
    if (this.nodes == null) {
      this.nodes = this.createNodes()
    }
    return Array.from(this.nodes).map((node) => node.cloneNode(true))
  }

  invalidate() {
    this.nodes = null
    this.childViews = []
    return this.parentView?.invalidate()
  }

  invalidateViewForObject(object) {
    return this.findViewForObject(object)?.invalidate()
  }

  findOrCreateCachedChildView(viewClass, object, options) {
    let view = this.getCachedViewForObject(object)
    if (view) {
      this.recordChildView(view)
    } else {
      view = this.createChildView(...arguments)
      this.cacheViewForObject(view, object)
    }
    return view
  }

  createChildView(viewClass, object, options = {}) {
    if (object instanceof ObjectGroup) {
      options.viewClass = viewClass
      viewClass = ObjectGroupView
    }

    const view = new viewClass(object, options)
    return this.recordChildView(view)
  }

  recordChildView(view) {
    view.parentView = this
    view.rootView = this.rootView
    this.childViews.push(view)
    return view
  }

  getAllChildViews() {
    let views = []

    Array.from(this.childViews).forEach((childView) => {
      views.push(childView)
      views = views.concat(childView.getAllChildViews())
    })

    return views
  }

  findElement() {
    return this.findElementForObject(this.object)
  }

  findElementForObject(object) {
    const id = object?.id
    if (id) {
      return this.rootView.element.querySelector(`[data-trix-id='${id}']`)
    }
  }

  findViewForObject(object) {
    for (const view of Array.from(this.getAllChildViews())) {
      if (view.object === object) {
        return view
      }
    }
  }

  getViewCache() {
    if (this.rootView === this) {
      if (this.isViewCachingEnabled()) {
        return this.viewCache != null ? this.viewCache : this.viewCache = {}
      }
    } else {
      return this.rootView.getViewCache()
    }
  }

  isViewCachingEnabled() {
    return this.shouldCacheViews !== false
  }

  enableViewCaching() {
    this.shouldCacheViews = true
  }

  disableViewCaching() {
    this.shouldCacheViews = false
  }

  getCachedViewForObject(object) {
    return this.getViewCache()?.[object.getCacheKey()]
  }

  cacheViewForObject(view, object) {
    const cache = this.getViewCache()
    if (cache) {
      cache[object.getCacheKey()] = view
    }
  }

  garbageCollectCachedViews() {
    const cache = this.getViewCache()
    if (cache) {
      const views = this.getAllChildViews().concat(this)
      const objectKeys = Array.from(views).map((view) => view.object.getCacheKey())
      for (const key in cache) {
        if (!Array.from(objectKeys).includes(key)) {
          delete cache[key]
        }
      }
    }
  }
}

export class ObjectGroupView extends ObjectView {
  constructor() {
    super(...arguments)
    this.objectGroup = this.object
    this.viewClass = this.options.viewClass
    delete this.options.viewClass
  }

  getChildViews() {
    if (!this.childViews.length) {
      Array.from(this.objectGroup.getObjects()).forEach((object) => {
        this.findOrCreateCachedChildView(this.viewClass, object, this.options)
      })
    }
    return this.childViews
  }

  createNodes() {
    const element = this.createContainerElement()

    Array.from(this.getChildViews()).forEach((view) => {
      Array.from(view.getNodes()).forEach((node) => {
        element.appendChild(node)
      })
    })

    return [ element ]
  }

  createContainerElement(depth = this.objectGroup.getDepth()) {
    return this.getChildViews()[0].createContainerElement(depth)
  }
}

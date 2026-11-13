export class Bardo {
  static async preservingPermanentElements(delegate, permanentElementMap, callback) {
    const bardo = new this(delegate, permanentElementMap)
    bardo.enter()
    const rendering = callback()

    // Only wait for a render that returns something to wait for. After a synchronous render
    // the permanent elements go back before anything else runs, so a MutationObserver never
    // finds them outside the document and sees them moved rather than removed.
    if (rendering !== undefined) {
      try {
        await rendering
      } catch (error) {
        // A failed render may not have swapped anything in, so only the permanent elements
        // whose placeholders reached the page go back.
        bardo.leave({ placedOnly: true })
        throw error
      }
    }

    bardo.leave()
  }

  constructor(delegate, permanentElementMap) {
    this.delegate = delegate
    this.permanentElementMap = permanentElementMap
  }

  enter() {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id]
      this.delegate.enteringBardo(currentPermanentElement, newPermanentElement)
      this.replaceNewPermanentElementWithPlaceholder(newPermanentElement)
    }
  }

  leave({ placedOnly = false } = {}) {
    for (const id in this.permanentElementMap) {
      const [currentPermanentElement] = this.permanentElementMap[id]
      if (!placedOnly || this.getPlaceholderById(currentPermanentElement.id)) {
        this.replaceCurrentPermanentElementWithClone(currentPermanentElement)
        this.replacePlaceholderWithPermanentElement(currentPermanentElement)
      }
      this.delegate.leavingBardo(currentPermanentElement)
    }
  }

  replaceNewPermanentElementWithPlaceholder(permanentElement) {
    const placeholder = createPlaceholderForPermanentElement(permanentElement)
    permanentElement.replaceWith(placeholder)
  }

  replaceCurrentPermanentElementWithClone(permanentElement) {
    const clone = permanentElement.cloneNode(true)
    permanentElement.replaceWith(clone)
  }

  replacePlaceholderWithPermanentElement(permanentElement) {
    const placeholder = this.getPlaceholderById(permanentElement.id)
    placeholder?.replaceWith(permanentElement)
  }

  getPlaceholderById(id) {
    return this.placeholders.find((element) => element.content == id)
  }

  get placeholders() {
    return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")]
  }
}

function createPlaceholderForPermanentElement(permanentElement) {
  const element = document.createElement("meta")
  element.setAttribute("name", "turbo-permanent-placeholder")
  element.setAttribute("content", permanentElement.id)
  return element
}

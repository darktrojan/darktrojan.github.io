{
  class CardList extends HTMLElement {
    static OVERFLOW_BUFFER = 10;

    _firstRow = 0;
    _lastRow = 0;
    _rows = new Map();
    _anchor = null;
    _current = null;

    connectedCallback() {
      this.inner = document.createElement("div");
      this.appendChild(this.inner);

      this.onmousedown = event => {
        let row = event.target.closest(this._rowElementName);
        if (!row) {
          return;
        }

        let index = row.index;

        if (event.ctrlKey) {
          this.toggleSelectionAtIndex(index);
          this.anchorIndex = index;
          this.currentIndex = index;
        } else if (event.shiftKey && this.anchorIndex) {
          let top = Math.min(this.anchorIndex, index);
          let bottom = Math.max(this.anchorIndex, index);

          this.setSelectionRange(top, bottom);
          this.currentIndex = index;
        } else {
          this.selectedIndex = index;
        }
      };
      this.onkeydown = event => {
        if (event.altKey || event.metaKey) {
          return;
        }

        let newIndex = this.currentIndex;
        switch (event.keyCode) {
          case KeyEvent.DOM_VK_UP:
            newIndex = this.currentIndex - 1;
            break;
          case KeyEvent.DOM_VK_DOWN:
            newIndex = this.currentIndex + 1;
            break;
          case KeyEvent.DOM_VK_HOME:
            newIndex = 0;
            break;
          case KeyEvent.DOM_VK_END:
            newIndex = this._view.rowCount - 1;
            break;
          case KeyEvent.DOM_VK_PAGE_UP:
            newIndex = Math.max(
              0,
              this.currentIndex -
                Math.floor(this.clientHeight / this._rowElementClass.ROW_HEIGHT)
            );
            break;
          case KeyEvent.DOM_VK_PAGE_DOWN:
            newIndex = Math.min(
              this._view.rowCount - 1,
              this.currentIndex +
                Math.floor(this.clientHeight / this._rowElementClass.ROW_HEIGHT)
            );
            break;

          case KeyEvent.DOM_VK_A:
            if (event.ctrlKey) {
              this.anchorIndex = 0;
              this.currentIndex = this._view.rowCount - 1;
              this.setSelectionRange(0, this.currentIndex);
              event.preventDefault();
            }
            return;

          case KeyEvent.DOM_VK_SPACE:
            if (event.originalTarget.closest("button")) {
              return;
            }
            break;

          case KeyEvent.DOM_VK_LEFT:
            this.getRowAtIndex(this.currentIndex)?.shiftFocus(
              document.dir == "rtl"
            );
            event.preventDefault();
            return;
          case KeyEvent.DOM_VK_RIGHT:
            this.getRowAtIndex(this.currentIndex)?.shiftFocus(
              document.dir != "rtl"
            );
            event.preventDefault();
            return;

          default:
            console.debug(event);
            return;
        }

        newIndex = this._clampIndex(newIndex);
        if (event.shiftKey) {
          this.setSelectionRange(this.anchorIndex, newIndex);
          this.currentIndex = newIndex;
        } else {
          this.selectedIndex = newIndex;
        }
        event.preventDefault();
      };

      let lastTime = 0;
      let timer = null;
      this.onscroll = () => {
        let now = Date.now();
        let diff = now - lastTime;

        if (diff > 100) {
          this.ensureVisibleRowsAreDisplayed();
          lastTime = now;
        } else if (!timer) {
          timer = setTimeout(() => {
            this.ensureVisibleRowsAreDisplayed();
            lastTime = now;
            timer = null;
          }, 100 - diff);
        }
      };
    }

    get view() {
      return this._view;
    }

    set view(view) {
      this._view = view;
      this._rowElementName = this.getAttribute("rows") || "card-row";
      this._rowElementClass = customElements.get(this._rowElementName);
      this.invalidate();
    }

    invalidate() {
      for (let row of this._rows.values()) {
        row.remove();
      }
      this._rows.clear();
      this._firstRow = 0;
      this._lastRow = 0;

      this.selectedIndicies = [];
      this.anchorIndex = 0;
      this.currentIndex = 0;

      this.inner.style.minHeight =
        this._view.rowCount * this._rowElementClass.ROW_HEIGHT + "px";
      this.ensureVisibleRowsAreDisplayed();
    }

    ensureVisibleRowsAreDisplayed() {
      if (this.view.rowCount == 0) {
        return;
      }

      let { clientHeight, scrollTop } = this;

      let first = Math.max(
        0,
        Math.floor(scrollTop / this._rowElementClass.ROW_HEIGHT) -
          this.constructor.OVERFLOW_BUFFER
      );
      let last = Math.min(
        this._view.rowCount - 1,
        Math.floor(
          (scrollTop + clientHeight) / this._rowElementClass.ROW_HEIGHT
        ) + this.constructor.OVERFLOW_BUFFER
      );

      console.debug(this._firstRow, first, last, this._lastRow);

      for (
        let i = this._firstRow - 1, iTo = Math.max(first, 0);
        i >= iTo;
        i--
      ) {
        this._addRowAtIndex(i, this.inner.firstElementChild);
      }
      if (this._lastRow == 0) {
        // Special case for first call.
        this._addRowAtIndex(0);
      }
      for (
        let i = this._lastRow + 1,
          iTo = Math.min(last + 1, this._view.rowCount);
        i < iTo;
        i++
      ) {
        this._addRowAtIndex(i);
      }

      let firstActualRow = this.getRowAtIndex(first);
      let row = firstActualRow.previousElementSibling;
      while (row) {
        row.remove();
        this._rows.delete(row.index);
        row = firstActualRow.previousElementSibling;
      }

      let lastActualRow = this.getRowAtIndex(last);
      row = lastActualRow.nextElementSibling;
      while (lastActualRow.nextElementSibling) {
        row.remove();
        this._rows.delete(row.index);
        row = lastActualRow.nextElementSibling;
      }

      this._firstRow = first;
      this._lastRow = last;
    }

    scrollToRow(index) {
      let top = this._rowElementClass.ROW_HEIGHT * index;
      let bottom = top + this._rowElementClass.ROW_HEIGHT;

      let { clientHeight, scrollTop } = this;
      if (top < scrollTop) {
        this.scrollTo(0, top);
      } else if (bottom > scrollTop + clientHeight) {
        this.scrollTo(0, bottom - clientHeight);
      }
    }

    rowCountChanged(index, delta) {
      let rowCount = this._view.rowCount;
      this.inner.style.minHeight =
        rowCount * this._rowElementClass.ROW_HEIGHT + "px";

      if (index > this._lastRow) {
        // Outside the environment.
        return;
      }

      this.invalidate();
    }

    _clampIndex(index) {
      if (index < 0) {
        return 0;
      }
      if (index >= this._view.rowCount) {
        return this._view.rowCount - 1;
      }
      return index;
    }

    _addRowAtIndex(index, before = null) {
      let row = this.inner.insertBefore(
        document.createElement(this._rowElementName),
        before
      );
      row.style.top = `${this._rowElementClass.ROW_HEIGHT * index}px`;
      if (this.selectedIndicies.includes(index)) {
        row.selected = true;
      }
      if (this.currentIndex === index) {
        row.classList.add("current");
      }
      row.index = index;
      this._rows.set(index, row);
    }

    getRowAtIndex(index) {
      return this._rows.get(index);
    }

    get anchorIndex() {
      return this._anchor;
    }

    set anchorIndex(index) {
      if (index < 0 || index > this._view.rowCount - 1) {
        return;
      }
      this._anchor = index;
      console.debug(`anchor = ${index}`);
    }

    get currentIndex() {
      return this._current;
    }

    set currentIndex(index) {
      if (index < 0 || index > this._view.rowCount - 1) {
        return;
      }
      for (let row of this.inner.querySelectorAll(
        `${this._rowElementName}.current`
      )) {
        row.classList.remove("current");
      }

      this._current = index;
      this.getRowAtIndex(index)?.classList.add("current");
      this.scrollToRow(index);
      console.debug(`current = ${index}`);
    }

    get selectedIndex() {
      return this.selectedIndicies.length ? this.selectedIndicies[0] : -1;
    }

    set selectedIndex(index) {
      if (this.selectedIndicies.length == 1 && this.selectedIndex == index) {
        return;
      }

      for (let row of this.inner.querySelectorAll(
        `${this._rowElementName}.selected`
      )) {
        row.selected = false;
      }
      this.selectedIndicies.length = 0;

      if (index < 0 || index > this._view.rowCount - 1) {
        this.anchorIndex = 0;
        this.currentIndex = 0;
        return;
      }

      this.anchorIndex = index;
      this.currentIndex = index;
      this.selectedIndicies.push(index);
      if (this.getRowAtIndex(index)) {
        this.getRowAtIndex(index).selected = true;
      }

      this.dispatchEvent(new CustomEvent("select"));
    }

    setSelectionRange(top, bottom) {
      if (top > bottom) {
        [top, bottom] = [bottom, top];
      }
      top = this._clampIndex(top);
      bottom = this._clampIndex(bottom);
      console.debug(`setSelectionRange ${top} - ${bottom}`);
      for (let i of this.selectedIndicies.slice()) {
        this.toggleSelectionAtIndex(i, false, true);
      }
      for (let i = top; i <= bottom; i++) {
        this.toggleSelectionAtIndex(i, true, true);
      }
      this.dispatchEvent(new CustomEvent("select"));
    }

    toggleSelectionAtIndex(index, selected, suppressEvent) {
      let i = this.selectedIndicies.indexOf(index);
      let wasSelected = i >= 0;

      let row = this.getRowAtIndex(index);
      if (row) {
        row.selected = selected;
      }

      if (wasSelected) {
        this.selectedIndicies.splice(i, 1);
      } else {
        this.selectedIndicies.push(index);
      }

      if (!suppressEvent) {
        this.dispatchEvent(new CustomEvent("select"));
      }

      return !wasSelected;
    }
  }
  customElements.define("card-list", CardList);

  class CardRow extends HTMLElement {
    static ROW_HEIGHT = 50;

    static styles = "";

    static get fragment() {
      if (!this.hasOwnProperty("_fragment")) {
        this._fragment = document.createElement("div");
        this._fragment.classList.add("d0");
      }
      return document.importNode(this._fragment, true);
    }

    constructor() {
      super();

      this.attachShadow({ mode: "open" });
      let style = document.createElement("style");
      style.type = "text/css";
      style.textContent = this.constructor.styles;
      this.shadowRoot.appendChild(style);

      this.shadowRoot.appendChild(this.constructor.fragment);
    }

    connectedCallback() {
      this.list = this.closest("card-list");
      this.view = this.closest("card-list").view;
    }

    get index() {
      return this._index;
    }

    set index(index) {
      this._index = index;
    }

    get selected() {
      return this.classList.contains("selected");
    }

    set selected(selected) {
      this.classList.toggle("selected", selected);
      if (!selected && document.activeElement == this) {
        this.list.focus();
      }
    }

    shiftFocus(forward) {
      let buttons = [...this.shadowRoot.querySelectorAll("button")]; // TODO exclude disabled
      if (!buttons.length) {
        return;
      }

      let next = buttons.indexOf(this.shadowRoot.activeElement);
      if (forward) {
        next++;
        if (next >= buttons.length) {
          return;
        }
      } else {
        next--;
        if (next < 0) {
          this.list.focus();
          return;
        }
      }

      buttons[next].focus();
    }
  }
  customElements.define("card-row", CardRow);
}

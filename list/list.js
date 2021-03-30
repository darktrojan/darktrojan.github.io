class TestCardRow extends customElements.get("card-row") {
  static ROW_HEIGHT = 46;

  static styles = `
    div.d0 {
      height: 36px;
      padding: 5px;
      display: flex;
      align-items: center;
    }
    div.d1 {
      flex: 1;
    }
    div.d1 > div.d2 {
      line-height: 18px;
    }
    div.d1 > div.d3 {
      line-height: 18px;
      font-size: 13.333px;
    }
    div.d4 > button {
      margin-inline: 2px;
      padding: 0;
    }
    :focus {
      outline: 3px solid orangered;
    }
  `;

  static get fragment() {
    if (!this.hasOwnProperty("_fragment")) {
      this._fragment = document.createElement("div");
      this._fragment.classList.add("d0");

      let d1 = document.createElement("div");
      d1.classList.add("d1");
      this._fragment.appendChild(d1);

      let d2 = document.createElement("div");
      d2.classList.add("d2");
      d1.appendChild(d2);

      let d3 = document.createElement("div");
      d3.classList.add("d3");
      d1.appendChild(d3);

      let d4 = document.createElement("div");
      d4.classList.add("d4");
      this._fragment.appendChild(d4);

      let b1 = document.createElement("button");
      b1.classList.add("b1");
      b1.tabIndex = -1;
      b1.textContent = "🔥";
      d4.appendChild(b1);

      let b2 = document.createElement("button");
      b2.classList.add("b2");
      b2.tabIndex = -1;
      b2.textContent = "💩";
      d4.appendChild(b2);
    }
    return document.importNode(this._fragment, true);
  }

  constructor() {
    super();
    this.d2 = this.shadowRoot.querySelector(".d2");
    this.d3 = this.shadowRoot.querySelector(".d3");
    this.b1 = this.shadowRoot.querySelector(".b1");
    this.b2 = this.shadowRoot.querySelector(".b2");
  }

  get index() {
    return super.index;
  }

  set index(index) {
    super.index = index;
    this.d2.textContent = this.view.getCellText(index, {
      id: "GeneratedName",
    });
    this.d3.textContent = this.view.getCellText(index, {
      id: "PrimaryEmail",
    });
  }
}
customElements.define("test-card-row", TestCardRow);

let cardsView = {
  values: [],
  get rowCount() {
    return this.values.length;
  },
  getCellText(index, column) {
    return `${column.id} ${this.values[index]}`;
  },
};
for (let i = 0; i < 50; i++) {
  cardsView.values.push(i);
}

let newCardsView = {
  values: [],
  get rowCount() {
    return this.values.length;
  },
  getCellText(index, column) {
    return `${column.id} ${this.values[index]}`;
  },
};
for (let i = 100; i < 110; i++) {
  newCardsView.values.push(i);
}

let cardsOuter = document.getElementById("cardsOuter");
cardsOuter.addEventListener("select", event => {
  console.log("select event, selected indicies:", cardsOuter.selectedIndicies);
});
window.addEventListener("load", () => {
  cardsOuter.view = cardsView;
});

// node_modules/@lit/reactive-element/css-tag.js
var t = window;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var n = /* @__PURE__ */ new WeakMap();
var o = class {
  constructor(t4, e7, n7) {
    if (this._$cssResult$ = true, n7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t4, this.t = e7;
  }
  get styleSheet() {
    let t4 = this.o;
    const s5 = this.t;
    if (e && void 0 === t4) {
      const e7 = void 0 !== s5 && 1 === s5.length;
      e7 && (t4 = n.get(s5)), void 0 === t4 && ((this.o = t4 = new CSSStyleSheet()).replaceSync(this.cssText), e7 && n.set(s5, t4));
    }
    return t4;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t4) => new o("string" == typeof t4 ? t4 : t4 + "", void 0, s);
var i = (t4, ...e7) => {
  const n7 = 1 === t4.length ? t4[0] : e7.reduce(((e8, s5, n8) => e8 + ((t5) => {
    if (true === t5._$cssResult$) return t5.cssText;
    if ("number" == typeof t5) return t5;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t5 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t4[n8 + 1]), t4[0]);
  return new o(n7, t4, s);
};
var S = (s5, n7) => {
  e ? s5.adoptedStyleSheets = n7.map(((t4) => t4 instanceof CSSStyleSheet ? t4 : t4.styleSheet)) : n7.forEach(((e7) => {
    const n8 = document.createElement("style"), o6 = t.litNonce;
    void 0 !== o6 && n8.setAttribute("nonce", o6), n8.textContent = e7.cssText, s5.appendChild(n8);
  }));
};
var c = e ? (t4) => t4 : (t4) => t4 instanceof CSSStyleSheet ? ((t5) => {
  let e7 = "";
  for (const s5 of t5.cssRules) e7 += s5.cssText;
  return r(e7);
})(t4) : t4;

// node_modules/@lit/reactive-element/reactive-element.js
var s2;
var e2 = window;
var r2 = e2.trustedTypes;
var h = r2 ? r2.emptyScript : "";
var o2 = e2.reactiveElementPolyfillSupport;
var n2 = { toAttribute(t4, i5) {
  switch (i5) {
    case Boolean:
      t4 = t4 ? h : null;
      break;
    case Object:
    case Array:
      t4 = null == t4 ? t4 : JSON.stringify(t4);
  }
  return t4;
}, fromAttribute(t4, i5) {
  let s5 = t4;
  switch (i5) {
    case Boolean:
      s5 = null !== t4;
      break;
    case Number:
      s5 = null === t4 ? null : Number(t4);
      break;
    case Object:
    case Array:
      try {
        s5 = JSON.parse(t4);
      } catch (t5) {
        s5 = null;
      }
  }
  return s5;
} };
var a = (t4, i5) => i5 !== t4 && (i5 == i5 || t4 == t4);
var l = { attribute: true, type: String, converter: n2, reflect: false, hasChanged: a };
var d = "finalized";
var u = class extends HTMLElement {
  constructor() {
    super(), this._$Ei = /* @__PURE__ */ new Map(), this.isUpdatePending = false, this.hasUpdated = false, this._$El = null, this._$Eu();
  }
  static addInitializer(t4) {
    var i5;
    this.finalize(), (null !== (i5 = this.h) && void 0 !== i5 ? i5 : this.h = []).push(t4);
  }
  static get observedAttributes() {
    this.finalize();
    const t4 = [];
    return this.elementProperties.forEach(((i5, s5) => {
      const e7 = this._$Ep(s5, i5);
      void 0 !== e7 && (this._$Ev.set(e7, s5), t4.push(e7));
    })), t4;
  }
  static createProperty(t4, i5 = l) {
    if (i5.state && (i5.attribute = false), this.finalize(), this.elementProperties.set(t4, i5), !i5.noAccessor && !this.prototype.hasOwnProperty(t4)) {
      const s5 = "symbol" == typeof t4 ? /* @__PURE__ */ Symbol() : "__" + t4, e7 = this.getPropertyDescriptor(t4, s5, i5);
      void 0 !== e7 && Object.defineProperty(this.prototype, t4, e7);
    }
  }
  static getPropertyDescriptor(t4, i5, s5) {
    return { get() {
      return this[i5];
    }, set(e7) {
      const r4 = this[t4];
      this[i5] = e7, this.requestUpdate(t4, r4, s5);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t4) {
    return this.elementProperties.get(t4) || l;
  }
  static finalize() {
    if (this.hasOwnProperty(d)) return false;
    this[d] = true;
    const t4 = Object.getPrototypeOf(this);
    if (t4.finalize(), void 0 !== t4.h && (this.h = [...t4.h]), this.elementProperties = new Map(t4.elementProperties), this._$Ev = /* @__PURE__ */ new Map(), this.hasOwnProperty("properties")) {
      const t5 = this.properties, i5 = [...Object.getOwnPropertyNames(t5), ...Object.getOwnPropertySymbols(t5)];
      for (const s5 of i5) this.createProperty(s5, t5[s5]);
    }
    return this.elementStyles = this.finalizeStyles(this.styles), true;
  }
  static finalizeStyles(i5) {
    const s5 = [];
    if (Array.isArray(i5)) {
      const e7 = new Set(i5.flat(1 / 0).reverse());
      for (const i6 of e7) s5.unshift(c(i6));
    } else void 0 !== i5 && s5.push(c(i5));
    return s5;
  }
  static _$Ep(t4, i5) {
    const s5 = i5.attribute;
    return false === s5 ? void 0 : "string" == typeof s5 ? s5 : "string" == typeof t4 ? t4.toLowerCase() : void 0;
  }
  _$Eu() {
    var t4;
    this._$E_ = new Promise(((t5) => this.enableUpdating = t5)), this._$AL = /* @__PURE__ */ new Map(), this._$Eg(), this.requestUpdate(), null === (t4 = this.constructor.h) || void 0 === t4 || t4.forEach(((t5) => t5(this)));
  }
  addController(t4) {
    var i5, s5;
    (null !== (i5 = this._$ES) && void 0 !== i5 ? i5 : this._$ES = []).push(t4), void 0 !== this.renderRoot && this.isConnected && (null === (s5 = t4.hostConnected) || void 0 === s5 || s5.call(t4));
  }
  removeController(t4) {
    var i5;
    null === (i5 = this._$ES) || void 0 === i5 || i5.splice(this._$ES.indexOf(t4) >>> 0, 1);
  }
  _$Eg() {
    this.constructor.elementProperties.forEach(((t4, i5) => {
      this.hasOwnProperty(i5) && (this._$Ei.set(i5, this[i5]), delete this[i5]);
    }));
  }
  createRenderRoot() {
    var t4;
    const s5 = null !== (t4 = this.shadowRoot) && void 0 !== t4 ? t4 : this.attachShadow(this.constructor.shadowRootOptions);
    return S(s5, this.constructor.elementStyles), s5;
  }
  connectedCallback() {
    var t4;
    void 0 === this.renderRoot && (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), null === (t4 = this._$ES) || void 0 === t4 || t4.forEach(((t5) => {
      var i5;
      return null === (i5 = t5.hostConnected) || void 0 === i5 ? void 0 : i5.call(t5);
    }));
  }
  enableUpdating(t4) {
  }
  disconnectedCallback() {
    var t4;
    null === (t4 = this._$ES) || void 0 === t4 || t4.forEach(((t5) => {
      var i5;
      return null === (i5 = t5.hostDisconnected) || void 0 === i5 ? void 0 : i5.call(t5);
    }));
  }
  attributeChangedCallback(t4, i5, s5) {
    this._$AK(t4, s5);
  }
  _$EO(t4, i5, s5 = l) {
    var e7;
    const r4 = this.constructor._$Ep(t4, s5);
    if (void 0 !== r4 && true === s5.reflect) {
      const h3 = (void 0 !== (null === (e7 = s5.converter) || void 0 === e7 ? void 0 : e7.toAttribute) ? s5.converter : n2).toAttribute(i5, s5.type);
      this._$El = t4, null == h3 ? this.removeAttribute(r4) : this.setAttribute(r4, h3), this._$El = null;
    }
  }
  _$AK(t4, i5) {
    var s5;
    const e7 = this.constructor, r4 = e7._$Ev.get(t4);
    if (void 0 !== r4 && this._$El !== r4) {
      const t5 = e7.getPropertyOptions(r4), h3 = "function" == typeof t5.converter ? { fromAttribute: t5.converter } : void 0 !== (null === (s5 = t5.converter) || void 0 === s5 ? void 0 : s5.fromAttribute) ? t5.converter : n2;
      this._$El = r4, this[r4] = h3.fromAttribute(i5, t5.type), this._$El = null;
    }
  }
  requestUpdate(t4, i5, s5) {
    let e7 = true;
    void 0 !== t4 && (((s5 = s5 || this.constructor.getPropertyOptions(t4)).hasChanged || a)(this[t4], i5) ? (this._$AL.has(t4) || this._$AL.set(t4, i5), true === s5.reflect && this._$El !== t4 && (void 0 === this._$EC && (this._$EC = /* @__PURE__ */ new Map()), this._$EC.set(t4, s5))) : e7 = false), !this.isUpdatePending && e7 && (this._$E_ = this._$Ej());
  }
  async _$Ej() {
    this.isUpdatePending = true;
    try {
      await this._$E_;
    } catch (t5) {
      Promise.reject(t5);
    }
    const t4 = this.scheduleUpdate();
    return null != t4 && await t4, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var t4;
    if (!this.isUpdatePending) return;
    this.hasUpdated, this._$Ei && (this._$Ei.forEach(((t5, i6) => this[i6] = t5)), this._$Ei = void 0);
    let i5 = false;
    const s5 = this._$AL;
    try {
      i5 = this.shouldUpdate(s5), i5 ? (this.willUpdate(s5), null === (t4 = this._$ES) || void 0 === t4 || t4.forEach(((t5) => {
        var i6;
        return null === (i6 = t5.hostUpdate) || void 0 === i6 ? void 0 : i6.call(t5);
      })), this.update(s5)) : this._$Ek();
    } catch (t5) {
      throw i5 = false, this._$Ek(), t5;
    }
    i5 && this._$AE(s5);
  }
  willUpdate(t4) {
  }
  _$AE(t4) {
    var i5;
    null === (i5 = this._$ES) || void 0 === i5 || i5.forEach(((t5) => {
      var i6;
      return null === (i6 = t5.hostUpdated) || void 0 === i6 ? void 0 : i6.call(t5);
    })), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t4)), this.updated(t4);
  }
  _$Ek() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$E_;
  }
  shouldUpdate(t4) {
    return true;
  }
  update(t4) {
    void 0 !== this._$EC && (this._$EC.forEach(((t5, i5) => this._$EO(i5, this[i5], t5))), this._$EC = void 0), this._$Ek();
  }
  updated(t4) {
  }
  firstUpdated(t4) {
  }
};
u[d] = true, u.elementProperties = /* @__PURE__ */ new Map(), u.elementStyles = [], u.shadowRootOptions = { mode: "open" }, null == o2 || o2({ ReactiveElement: u }), (null !== (s2 = e2.reactiveElementVersions) && void 0 !== s2 ? s2 : e2.reactiveElementVersions = []).push("1.6.3");

// node_modules/lit-html/lit-html.js
var t2;
var i2 = window;
var s3 = i2.trustedTypes;
var e3 = s3 ? s3.createPolicy("lit-html", { createHTML: (t4) => t4 }) : void 0;
var o3 = "$lit$";
var n3 = `lit$${(Math.random() + "").slice(9)}$`;
var l2 = "?" + n3;
var h2 = `<${l2}>`;
var r3 = document;
var u2 = () => r3.createComment("");
var d2 = (t4) => null === t4 || "object" != typeof t4 && "function" != typeof t4;
var c2 = Array.isArray;
var v = (t4) => c2(t4) || "function" == typeof (null == t4 ? void 0 : t4[Symbol.iterator]);
var a2 = "[ 	\n\f\r]";
var f = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p = RegExp(`>|${a2}(?:([^\\s"'>=/]+)(${a2}*=${a2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y = /^(?:script|style|textarea|title)$/i;
var w = (t4) => (i5, ...s5) => ({ _$litType$: t4, strings: i5, values: s5 });
var x = w(1);
var b = w(2);
var T = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var E = /* @__PURE__ */ new WeakMap();
var C = r3.createTreeWalker(r3, 129, null, false);
function P(t4, i5) {
  if (!Array.isArray(t4) || !t4.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i5) : i5;
}
var V = (t4, i5) => {
  const s5 = t4.length - 1, e7 = [];
  let l5, r4 = 2 === i5 ? "<svg>" : "", u3 = f;
  for (let i6 = 0; i6 < s5; i6++) {
    const s6 = t4[i6];
    let d3, c3, v2 = -1, a3 = 0;
    for (; a3 < s6.length && (u3.lastIndex = a3, c3 = u3.exec(s6), null !== c3); ) a3 = u3.lastIndex, u3 === f ? "!--" === c3[1] ? u3 = _ : void 0 !== c3[1] ? u3 = m : void 0 !== c3[2] ? (y.test(c3[2]) && (l5 = RegExp("</" + c3[2], "g")), u3 = p) : void 0 !== c3[3] && (u3 = p) : u3 === p ? ">" === c3[0] ? (u3 = null != l5 ? l5 : f, v2 = -1) : void 0 === c3[1] ? v2 = -2 : (v2 = u3.lastIndex - c3[2].length, d3 = c3[1], u3 = void 0 === c3[3] ? p : '"' === c3[3] ? $ : g) : u3 === $ || u3 === g ? u3 = p : u3 === _ || u3 === m ? u3 = f : (u3 = p, l5 = void 0);
    const w2 = u3 === p && t4[i6 + 1].startsWith("/>") ? " " : "";
    r4 += u3 === f ? s6 + h2 : v2 >= 0 ? (e7.push(d3), s6.slice(0, v2) + o3 + s6.slice(v2) + n3 + w2) : s6 + n3 + (-2 === v2 ? (e7.push(void 0), i6) : w2);
  }
  return [P(t4, r4 + (t4[s5] || "<?>") + (2 === i5 ? "</svg>" : "")), e7];
};
var N = class _N {
  constructor({ strings: t4, _$litType$: i5 }, e7) {
    let h3;
    this.parts = [];
    let r4 = 0, d3 = 0;
    const c3 = t4.length - 1, v2 = this.parts, [a3, f2] = V(t4, i5);
    if (this.el = _N.createElement(a3, e7), C.currentNode = this.el.content, 2 === i5) {
      const t5 = this.el.content, i6 = t5.firstChild;
      i6.remove(), t5.append(...i6.childNodes);
    }
    for (; null !== (h3 = C.nextNode()) && v2.length < c3; ) {
      if (1 === h3.nodeType) {
        if (h3.hasAttributes()) {
          const t5 = [];
          for (const i6 of h3.getAttributeNames()) if (i6.endsWith(o3) || i6.startsWith(n3)) {
            const s5 = f2[d3++];
            if (t5.push(i6), void 0 !== s5) {
              const t6 = h3.getAttribute(s5.toLowerCase() + o3).split(n3), i7 = /([.?@])?(.*)/.exec(s5);
              v2.push({ type: 1, index: r4, name: i7[2], strings: t6, ctor: "." === i7[1] ? H : "?" === i7[1] ? L : "@" === i7[1] ? z : k });
            } else v2.push({ type: 6, index: r4 });
          }
          for (const i6 of t5) h3.removeAttribute(i6);
        }
        if (y.test(h3.tagName)) {
          const t5 = h3.textContent.split(n3), i6 = t5.length - 1;
          if (i6 > 0) {
            h3.textContent = s3 ? s3.emptyScript : "";
            for (let s5 = 0; s5 < i6; s5++) h3.append(t5[s5], u2()), C.nextNode(), v2.push({ type: 2, index: ++r4 });
            h3.append(t5[i6], u2());
          }
        }
      } else if (8 === h3.nodeType) if (h3.data === l2) v2.push({ type: 2, index: r4 });
      else {
        let t5 = -1;
        for (; -1 !== (t5 = h3.data.indexOf(n3, t5 + 1)); ) v2.push({ type: 7, index: r4 }), t5 += n3.length - 1;
      }
      r4++;
    }
  }
  static createElement(t4, i5) {
    const s5 = r3.createElement("template");
    return s5.innerHTML = t4, s5;
  }
};
function S2(t4, i5, s5 = t4, e7) {
  var o6, n7, l5, h3;
  if (i5 === T) return i5;
  let r4 = void 0 !== e7 ? null === (o6 = s5._$Co) || void 0 === o6 ? void 0 : o6[e7] : s5._$Cl;
  const u3 = d2(i5) ? void 0 : i5._$litDirective$;
  return (null == r4 ? void 0 : r4.constructor) !== u3 && (null === (n7 = null == r4 ? void 0 : r4._$AO) || void 0 === n7 || n7.call(r4, false), void 0 === u3 ? r4 = void 0 : (r4 = new u3(t4), r4._$AT(t4, s5, e7)), void 0 !== e7 ? (null !== (l5 = (h3 = s5)._$Co) && void 0 !== l5 ? l5 : h3._$Co = [])[e7] = r4 : s5._$Cl = r4), void 0 !== r4 && (i5 = S2(t4, r4._$AS(t4, i5.values), r4, e7)), i5;
}
var M = class {
  constructor(t4, i5) {
    this._$AV = [], this._$AN = void 0, this._$AD = t4, this._$AM = i5;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t4) {
    var i5;
    const { el: { content: s5 }, parts: e7 } = this._$AD, o6 = (null !== (i5 = null == t4 ? void 0 : t4.creationScope) && void 0 !== i5 ? i5 : r3).importNode(s5, true);
    C.currentNode = o6;
    let n7 = C.nextNode(), l5 = 0, h3 = 0, u3 = e7[0];
    for (; void 0 !== u3; ) {
      if (l5 === u3.index) {
        let i6;
        2 === u3.type ? i6 = new R(n7, n7.nextSibling, this, t4) : 1 === u3.type ? i6 = new u3.ctor(n7, u3.name, u3.strings, this, t4) : 6 === u3.type && (i6 = new Z(n7, this, t4)), this._$AV.push(i6), u3 = e7[++h3];
      }
      l5 !== (null == u3 ? void 0 : u3.index) && (n7 = C.nextNode(), l5++);
    }
    return C.currentNode = r3, o6;
  }
  v(t4) {
    let i5 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t4, s5, i5), i5 += s5.strings.length - 2) : s5._$AI(t4[i5])), i5++;
  }
};
var R = class _R {
  constructor(t4, i5, s5, e7) {
    var o6;
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t4, this._$AB = i5, this._$AM = s5, this.options = e7, this._$Cp = null === (o6 = null == e7 ? void 0 : e7.isConnected) || void 0 === o6 || o6;
  }
  get _$AU() {
    var t4, i5;
    return null !== (i5 = null === (t4 = this._$AM) || void 0 === t4 ? void 0 : t4._$AU) && void 0 !== i5 ? i5 : this._$Cp;
  }
  get parentNode() {
    let t4 = this._$AA.parentNode;
    const i5 = this._$AM;
    return void 0 !== i5 && 11 === (null == t4 ? void 0 : t4.nodeType) && (t4 = i5.parentNode), t4;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t4, i5 = this) {
    t4 = S2(this, t4, i5), d2(t4) ? t4 === A || null == t4 || "" === t4 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t4 !== this._$AH && t4 !== T && this._(t4) : void 0 !== t4._$litType$ ? this.g(t4) : void 0 !== t4.nodeType ? this.$(t4) : v(t4) ? this.T(t4) : this._(t4);
  }
  k(t4) {
    return this._$AA.parentNode.insertBefore(t4, this._$AB);
  }
  $(t4) {
    this._$AH !== t4 && (this._$AR(), this._$AH = this.k(t4));
  }
  _(t4) {
    this._$AH !== A && d2(this._$AH) ? this._$AA.nextSibling.data = t4 : this.$(r3.createTextNode(t4)), this._$AH = t4;
  }
  g(t4) {
    var i5;
    const { values: s5, _$litType$: e7 } = t4, o6 = "number" == typeof e7 ? this._$AC(t4) : (void 0 === e7.el && (e7.el = N.createElement(P(e7.h, e7.h[0]), this.options)), e7);
    if ((null === (i5 = this._$AH) || void 0 === i5 ? void 0 : i5._$AD) === o6) this._$AH.v(s5);
    else {
      const t5 = new M(o6, this), i6 = t5.u(this.options);
      t5.v(s5), this.$(i6), this._$AH = t5;
    }
  }
  _$AC(t4) {
    let i5 = E.get(t4.strings);
    return void 0 === i5 && E.set(t4.strings, i5 = new N(t4)), i5;
  }
  T(t4) {
    c2(this._$AH) || (this._$AH = [], this._$AR());
    const i5 = this._$AH;
    let s5, e7 = 0;
    for (const o6 of t4) e7 === i5.length ? i5.push(s5 = new _R(this.k(u2()), this.k(u2()), this, this.options)) : s5 = i5[e7], s5._$AI(o6), e7++;
    e7 < i5.length && (this._$AR(s5 && s5._$AB.nextSibling, e7), i5.length = e7);
  }
  _$AR(t4 = this._$AA.nextSibling, i5) {
    var s5;
    for (null === (s5 = this._$AP) || void 0 === s5 || s5.call(this, false, true, i5); t4 && t4 !== this._$AB; ) {
      const i6 = t4.nextSibling;
      t4.remove(), t4 = i6;
    }
  }
  setConnected(t4) {
    var i5;
    void 0 === this._$AM && (this._$Cp = t4, null === (i5 = this._$AP) || void 0 === i5 || i5.call(this, t4));
  }
};
var k = class {
  constructor(t4, i5, s5, e7, o6) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t4, this.name = i5, this._$AM = e7, this.options = o6, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t4, i5 = this, s5, e7) {
    const o6 = this.strings;
    let n7 = false;
    if (void 0 === o6) t4 = S2(this, t4, i5, 0), n7 = !d2(t4) || t4 !== this._$AH && t4 !== T, n7 && (this._$AH = t4);
    else {
      const e8 = t4;
      let l5, h3;
      for (t4 = o6[0], l5 = 0; l5 < o6.length - 1; l5++) h3 = S2(this, e8[s5 + l5], i5, l5), h3 === T && (h3 = this._$AH[l5]), n7 || (n7 = !d2(h3) || h3 !== this._$AH[l5]), h3 === A ? t4 = A : t4 !== A && (t4 += (null != h3 ? h3 : "") + o6[l5 + 1]), this._$AH[l5] = h3;
    }
    n7 && !e7 && this.j(t4);
  }
  j(t4) {
    t4 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, null != t4 ? t4 : "");
  }
};
var H = class extends k {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t4) {
    this.element[this.name] = t4 === A ? void 0 : t4;
  }
};
var I = s3 ? s3.emptyScript : "";
var L = class extends k {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t4) {
    t4 && t4 !== A ? this.element.setAttribute(this.name, I) : this.element.removeAttribute(this.name);
  }
};
var z = class extends k {
  constructor(t4, i5, s5, e7, o6) {
    super(t4, i5, s5, e7, o6), this.type = 5;
  }
  _$AI(t4, i5 = this) {
    var s5;
    if ((t4 = null !== (s5 = S2(this, t4, i5, 0)) && void 0 !== s5 ? s5 : A) === T) return;
    const e7 = this._$AH, o6 = t4 === A && e7 !== A || t4.capture !== e7.capture || t4.once !== e7.once || t4.passive !== e7.passive, n7 = t4 !== A && (e7 === A || o6);
    o6 && this.element.removeEventListener(this.name, this, e7), n7 && this.element.addEventListener(this.name, this, t4), this._$AH = t4;
  }
  handleEvent(t4) {
    var i5, s5;
    "function" == typeof this._$AH ? this._$AH.call(null !== (s5 = null === (i5 = this.options) || void 0 === i5 ? void 0 : i5.host) && void 0 !== s5 ? s5 : this.element, t4) : this._$AH.handleEvent(t4);
  }
};
var Z = class {
  constructor(t4, i5, s5) {
    this.element = t4, this.type = 6, this._$AN = void 0, this._$AM = i5, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t4) {
    S2(this, t4);
  }
};
var B = i2.litHtmlPolyfillSupport;
null == B || B(N, R), (null !== (t2 = i2.litHtmlVersions) && void 0 !== t2 ? t2 : i2.litHtmlVersions = []).push("2.8.0");
var D = (t4, i5, s5) => {
  var e7, o6;
  const n7 = null !== (e7 = null == s5 ? void 0 : s5.renderBefore) && void 0 !== e7 ? e7 : i5;
  let l5 = n7._$litPart$;
  if (void 0 === l5) {
    const t5 = null !== (o6 = null == s5 ? void 0 : s5.renderBefore) && void 0 !== o6 ? o6 : null;
    n7._$litPart$ = l5 = new R(i5.insertBefore(u2(), t5), t5, void 0, null != s5 ? s5 : {});
  }
  return l5._$AI(t4), l5;
};

// node_modules/lit-element/lit-element.js
var l3;
var o4;
var s4 = class extends u {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t4, e7;
    const i5 = super.createRenderRoot();
    return null !== (t4 = (e7 = this.renderOptions).renderBefore) && void 0 !== t4 || (e7.renderBefore = i5.firstChild), i5;
  }
  update(t4) {
    const i5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t4), this._$Do = D(i5, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t4;
    super.connectedCallback(), null === (t4 = this._$Do) || void 0 === t4 || t4.setConnected(true);
  }
  disconnectedCallback() {
    var t4;
    super.disconnectedCallback(), null === (t4 = this._$Do) || void 0 === t4 || t4.setConnected(false);
  }
  render() {
    return T;
  }
};
s4.finalized = true, s4._$litElement$ = true, null === (l3 = globalThis.litElementHydrateSupport) || void 0 === l3 || l3.call(globalThis, { LitElement: s4 });
var n4 = globalThis.litElementPolyfillSupport;
null == n4 || n4({ LitElement: s4 });
(null !== (o4 = globalThis.litElementVersions) && void 0 !== o4 ? o4 : globalThis.litElementVersions = []).push("3.3.3");

// node_modules/@lit/reactive-element/decorators/custom-element.js
var e4 = (e7) => (n7) => "function" == typeof n7 ? ((e8, n8) => (customElements.define(e8, n8), n8))(e7, n7) : ((e8, n8) => {
  const { kind: t4, elements: s5 } = n8;
  return { kind: t4, elements: s5, finisher(n9) {
    customElements.define(e8, n9);
  } };
})(e7, n7);

// node_modules/@lit/reactive-element/decorators/property.js
var i3 = (i5, e7) => "method" === e7.kind && e7.descriptor && !("value" in e7.descriptor) ? { ...e7, finisher(n7) {
  n7.createProperty(e7.key, i5);
} } : { kind: "field", key: /* @__PURE__ */ Symbol(), placement: "own", descriptor: {}, originalKey: e7.key, initializer() {
  "function" == typeof e7.initializer && (this[e7.key] = e7.initializer.call(this));
}, finisher(n7) {
  n7.createProperty(e7.key, i5);
} };
var e5 = (i5, e7, n7) => {
  e7.constructor.createProperty(n7, i5);
};
function n5(n7) {
  return (t4, o6) => void 0 !== o6 ? e5(n7, t4, o6) : i3(n7, t4);
}

// node_modules/@lit/reactive-element/decorators/state.js
function t3(t4) {
  return n5({ ...t4, state: true });
}

// node_modules/@lit/reactive-element/decorators/base.js
var o5 = ({ finisher: e7, descriptor: t4 }) => (o6, n7) => {
  var r4;
  if (void 0 === n7) {
    const n8 = null !== (r4 = o6.originalKey) && void 0 !== r4 ? r4 : o6.key, i5 = null != t4 ? { kind: "method", placement: "prototype", key: n8, descriptor: t4(o6.key) } : { ...o6, key: n8 };
    return null != e7 && (i5.finisher = function(t5) {
      e7(t5, n8);
    }), i5;
  }
  {
    const r5 = o6.constructor;
    void 0 !== t4 && Object.defineProperty(o6, n7, t4(n7)), null == e7 || e7(r5, n7);
  }
};

// node_modules/@lit/reactive-element/decorators/query.js
function i4(i5, n7) {
  return o5({ descriptor: (o6) => {
    const t4 = { get() {
      var o7, n8;
      return null !== (n8 = null === (o7 = this.renderRoot) || void 0 === o7 ? void 0 : o7.querySelector(i5)) && void 0 !== n8 ? n8 : null;
    }, enumerable: true, configurable: true };
    if (n7) {
      const n8 = "symbol" == typeof o6 ? /* @__PURE__ */ Symbol() : "__" + o6;
      t4.get = function() {
        var o7, t5;
        return void 0 === this[n8] && (this[n8] = null !== (t5 = null === (o7 = this.renderRoot) || void 0 === o7 ? void 0 : o7.querySelector(i5)) && void 0 !== t5 ? t5 : null), this[n8];
      };
    }
    return t4;
  } });
}

// node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
var n6;
var e6 = null != (null === (n6 = window.HTMLSlotElement) || void 0 === n6 ? void 0 : n6.prototype.assignedElements) ? (o6, n7) => o6.assignedElements(n7) : (o6, n7) => o6.assignedNodes(n7).filter(((o7) => o7.nodeType === Node.ELEMENT_NODE));

// node_modules/wired-elements/lib/wired-base.js
var __decorate = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var BaseCSS = i`
:host {
  opacity: 0;
}
:host(.wired-rendered) {
  opacity: 1;
}
#overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}
svg {
  display: block;
}
path {
  stroke: currentColor;
  stroke-width: 0.7;
  fill: transparent;
}
.hidden {
  display: none !important;
}
`;
var WiredBase = class extends s4 {
  constructor() {
    super(...arguments);
    this.lastSize = [0, 0];
    this.seed = Math.floor(Math.random() * 2 ** 31);
  }
  updated(_changed) {
    this.wiredRender();
  }
  wiredRender(force = false) {
    if (this.svg) {
      const size = this.canvasSize();
      if (!force && size[0] === this.lastSize[0] && size[1] === this.lastSize[1]) {
        return;
      }
      while (this.svg.hasChildNodes()) {
        this.svg.removeChild(this.svg.lastChild);
      }
      this.svg.setAttribute("width", `${size[0]}`);
      this.svg.setAttribute("height", `${size[1]}`);
      this.draw(this.svg, size);
      this.lastSize = size;
      this.classList.add("wired-rendered");
    }
  }
  fire(name, detail) {
    fireEvent(this, name, detail);
  }
};
__decorate([
  i4("svg"),
  __metadata("design:type", SVGSVGElement)
], WiredBase.prototype, "svg", void 0);
function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}
function fireEvent(e7, name, detail) {
  e7.dispatchEvent(new CustomEvent(name, {
    composed: true,
    bubbles: true,
    detail
  }));
}

// node_modules/hachure-fill/bin/hachure.js
function rotatePoints(points, center, degrees) {
  if (points && points.length) {
    const [cx, cy] = center;
    const angle = Math.PI / 180 * degrees;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const p2 of points) {
      const [x2, y2] = p2;
      p2[0] = (x2 - cx) * cos - (y2 - cy) * sin + cx;
      p2[1] = (x2 - cx) * sin + (y2 - cy) * cos + cy;
    }
  }
}
function rotateLines(lines, center, degrees) {
  const points = [];
  lines.forEach((line3) => points.push(...line3));
  rotatePoints(points, center, degrees);
}
function areSamePoints(p1, p2) {
  return p1[0] === p2[0] && p1[1] === p2[1];
}
function hachureLines(polygons, hachureGap, hachureAngle, hachureStepOffset = 1) {
  const angle = hachureAngle;
  const gap = Math.max(hachureGap, 0.1);
  const polygonList = polygons[0] && polygons[0][0] && typeof polygons[0][0] === "number" ? [polygons] : polygons;
  const rotationCenter = [0, 0];
  if (angle) {
    for (const polygon3 of polygonList) {
      rotatePoints(polygon3, rotationCenter, angle);
    }
  }
  const lines = straightHachureLines(polygonList, gap, hachureStepOffset);
  if (angle) {
    for (const polygon3 of polygonList) {
      rotatePoints(polygon3, rotationCenter, -angle);
    }
    rotateLines(lines, rotationCenter, -angle);
  }
  return lines;
}
function straightHachureLines(polygons, gap, hachureStepOffset) {
  const vertexArray = [];
  for (const polygon3 of polygons) {
    const vertices = [...polygon3];
    if (!areSamePoints(vertices[0], vertices[vertices.length - 1])) {
      vertices.push([vertices[0][0], vertices[0][1]]);
    }
    if (vertices.length > 2) {
      vertexArray.push(vertices);
    }
  }
  const lines = [];
  gap = Math.max(gap, 0.1);
  const edges = [];
  for (const vertices of vertexArray) {
    for (let i5 = 0; i5 < vertices.length - 1; i5++) {
      const p1 = vertices[i5];
      const p2 = vertices[i5 + 1];
      if (p1[1] !== p2[1]) {
        const ymin = Math.min(p1[1], p2[1]);
        edges.push({
          ymin,
          ymax: Math.max(p1[1], p2[1]),
          x: ymin === p1[1] ? p1[0] : p2[0],
          islope: (p2[0] - p1[0]) / (p2[1] - p1[1])
        });
      }
    }
  }
  edges.sort((e1, e22) => {
    if (e1.ymin < e22.ymin) {
      return -1;
    }
    if (e1.ymin > e22.ymin) {
      return 1;
    }
    if (e1.x < e22.x) {
      return -1;
    }
    if (e1.x > e22.x) {
      return 1;
    }
    if (e1.ymax === e22.ymax) {
      return 0;
    }
    return (e1.ymax - e22.ymax) / Math.abs(e1.ymax - e22.ymax);
  });
  if (!edges.length) {
    return lines;
  }
  let activeEdges = [];
  let y2 = edges[0].ymin;
  let iteration = 0;
  while (activeEdges.length || edges.length) {
    if (edges.length) {
      let ix = -1;
      for (let i5 = 0; i5 < edges.length; i5++) {
        if (edges[i5].ymin > y2) {
          break;
        }
        ix = i5;
      }
      const removed = edges.splice(0, ix + 1);
      removed.forEach((edge) => {
        activeEdges.push({ s: y2, edge });
      });
    }
    activeEdges = activeEdges.filter((ae) => {
      if (ae.edge.ymax <= y2) {
        return false;
      }
      return true;
    });
    activeEdges.sort((ae1, ae2) => {
      if (ae1.edge.x === ae2.edge.x) {
        return 0;
      }
      return (ae1.edge.x - ae2.edge.x) / Math.abs(ae1.edge.x - ae2.edge.x);
    });
    if (hachureStepOffset !== 1 || iteration % gap === 0) {
      if (activeEdges.length > 1) {
        for (let i5 = 0; i5 < activeEdges.length; i5 = i5 + 2) {
          const nexti = i5 + 1;
          if (nexti >= activeEdges.length) {
            break;
          }
          const ce = activeEdges[i5].edge;
          const ne = activeEdges[nexti].edge;
          lines.push([
            [Math.round(ce.x), y2],
            [Math.round(ne.x), y2]
          ]);
        }
      }
    }
    y2 += hachureStepOffset;
    activeEdges.forEach((ae) => {
      ae.edge.x = ae.edge.x + hachureStepOffset * ae.edge.islope;
    });
    iteration++;
  }
  return lines;
}

// node_modules/roughjs/bin/fillers/scan-line-hachure.js
function polygonHachureLines(polygonList, o6) {
  var _a;
  const angle = o6.hachureAngle + 90;
  let gap = o6.hachureGap;
  if (gap < 0) {
    gap = o6.strokeWidth * 4;
  }
  gap = Math.round(Math.max(gap, 0.1));
  let skipOffset = 1;
  if (o6.roughness >= 1) {
    if ((((_a = o6.randomizer) === null || _a === void 0 ? void 0 : _a.next()) || Math.random()) > 0.7) {
      skipOffset = gap;
    }
  }
  return hachureLines(polygonList, gap, angle, skipOffset || 1);
}

// node_modules/roughjs/bin/fillers/hachure-filler.js
var HachureFiller = class {
  constructor(helper) {
    this.helper = helper;
  }
  fillPolygons(polygonList, o6) {
    return this._fillPolygons(polygonList, o6);
  }
  _fillPolygons(polygonList, o6) {
    const lines = polygonHachureLines(polygonList, o6);
    const ops = this.renderLines(lines, o6);
    return { type: "fillSketch", ops };
  }
  renderLines(lines, o6) {
    const ops = [];
    for (const line3 of lines) {
      ops.push(...this.helper.doubleLineOps(line3[0][0], line3[0][1], line3[1][0], line3[1][1], o6));
    }
    return ops;
  }
};

// node_modules/roughjs/bin/geometry.js
function lineLength(line3) {
  const p1 = line3[0];
  const p2 = line3[1];
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

// node_modules/roughjs/bin/fillers/zigzag-filler.js
var ZigZagFiller = class extends HachureFiller {
  fillPolygons(polygonList, o6) {
    let gap = o6.hachureGap;
    if (gap < 0) {
      gap = o6.strokeWidth * 4;
    }
    gap = Math.max(gap, 0.1);
    const o22 = Object.assign({}, o6, { hachureGap: gap });
    const lines = polygonHachureLines(polygonList, o22);
    const zigZagAngle = Math.PI / 180 * o6.hachureAngle;
    const zigzagLines = [];
    const dgx = gap * 0.5 * Math.cos(zigZagAngle);
    const dgy = gap * 0.5 * Math.sin(zigZagAngle);
    for (const [p1, p2] of lines) {
      if (lineLength([p1, p2])) {
        zigzagLines.push([
          [p1[0] - dgx, p1[1] + dgy],
          [...p2]
        ], [
          [p1[0] + dgx, p1[1] - dgy],
          [...p2]
        ]);
      }
    }
    const ops = this.renderLines(zigzagLines, o6);
    return { type: "fillSketch", ops };
  }
};

// node_modules/roughjs/bin/math.js
var Random = class {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    if (this.seed) {
      return (2 ** 31 - 1 & (this.seed = Math.imul(48271, this.seed))) / 2 ** 31;
    } else {
      return Math.random();
    }
  }
};

// node_modules/roughjs/bin/renderer.js
function line(x1, y1, x2, y2, o6) {
  return { type: "path", ops: _doubleLine(x1, y1, x2, y2, o6) };
}
function linearPath(points, close, o6) {
  const len = (points || []).length;
  if (len > 2) {
    const ops = [];
    for (let i5 = 0; i5 < len - 1; i5++) {
      ops.push(..._doubleLine(points[i5][0], points[i5][1], points[i5 + 1][0], points[i5 + 1][1], o6));
    }
    if (close) {
      ops.push(..._doubleLine(points[len - 1][0], points[len - 1][1], points[0][0], points[0][1], o6));
    }
    return { type: "path", ops };
  } else if (len === 2) {
    return line(points[0][0], points[0][1], points[1][0], points[1][1], o6);
  }
  return { type: "path", ops: [] };
}
function polygon(points, o6) {
  return linearPath(points, true, o6);
}
function rectangle(x2, y2, width, height, o6) {
  const points = [
    [x2, y2],
    [x2 + width, y2],
    [x2 + width, y2 + height],
    [x2, y2 + height]
  ];
  return polygon(points, o6);
}
function ellipse(x2, y2, width, height, o6) {
  const params = generateEllipseParams(width, height, o6);
  return ellipseWithParams(x2, y2, o6, params).opset;
}
function generateEllipseParams(width, height, o6) {
  const psq = Math.sqrt(Math.PI * 2 * Math.sqrt((Math.pow(width / 2, 2) + Math.pow(height / 2, 2)) / 2));
  const stepCount = Math.ceil(Math.max(o6.curveStepCount, o6.curveStepCount / Math.sqrt(200) * psq));
  const increment = Math.PI * 2 / stepCount;
  let rx = Math.abs(width / 2);
  let ry = Math.abs(height / 2);
  const curveFitRandomness = 1 - o6.curveFitting;
  rx += _offsetOpt(rx * curveFitRandomness, o6);
  ry += _offsetOpt(ry * curveFitRandomness, o6);
  return { increment, rx, ry };
}
function ellipseWithParams(x2, y2, o6, ellipseParams) {
  const [ap1, cp1] = _computeEllipsePoints(ellipseParams.increment, x2, y2, ellipseParams.rx, ellipseParams.ry, 1, ellipseParams.increment * _offset(0.1, _offset(0.4, 1, o6), o6), o6);
  let o1 = _curve(ap1, null, o6);
  if (!o6.disableMultiStroke && o6.roughness !== 0) {
    const [ap2] = _computeEllipsePoints(ellipseParams.increment, x2, y2, ellipseParams.rx, ellipseParams.ry, 1.5, 0, o6);
    const o22 = _curve(ap2, null, o6);
    o1 = o1.concat(o22);
  }
  return {
    estimatedPoints: cp1,
    opset: { type: "path", ops: o1 }
  };
}
function doubleLineFillOps(x1, y1, x2, y2, o6) {
  return _doubleLine(x1, y1, x2, y2, o6, true);
}
function random(ops) {
  if (!ops.randomizer) {
    ops.randomizer = new Random(ops.seed || 0);
  }
  return ops.randomizer.next();
}
function _offset(min, max, ops, roughnessGain = 1) {
  return ops.roughness * roughnessGain * (random(ops) * (max - min) + min);
}
function _offsetOpt(x2, ops, roughnessGain = 1) {
  return _offset(-x2, x2, ops, roughnessGain);
}
function _doubleLine(x1, y1, x2, y2, o6, filling = false) {
  const singleStroke = filling ? o6.disableMultiStrokeFill : o6.disableMultiStroke;
  const o1 = _line(x1, y1, x2, y2, o6, true, false);
  if (singleStroke) {
    return o1;
  }
  const o22 = _line(x1, y1, x2, y2, o6, true, true);
  return o1.concat(o22);
}
function _line(x1, y1, x2, y2, o6, move, overlay) {
  const lengthSq = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
  const length = Math.sqrt(lengthSq);
  let roughnessGain = 1;
  if (length < 200) {
    roughnessGain = 1;
  } else if (length > 500) {
    roughnessGain = 0.4;
  } else {
    roughnessGain = -16668e-7 * length + 1.233334;
  }
  let offset = o6.maxRandomnessOffset || 0;
  if (offset * offset * 100 > lengthSq) {
    offset = length / 10;
  }
  const halfOffset = offset / 2;
  const divergePoint = 0.2 + random(o6) * 0.2;
  let midDispX = o6.bowing * o6.maxRandomnessOffset * (y2 - y1) / 200;
  let midDispY = o6.bowing * o6.maxRandomnessOffset * (x1 - x2) / 200;
  midDispX = _offsetOpt(midDispX, o6, roughnessGain);
  midDispY = _offsetOpt(midDispY, o6, roughnessGain);
  const ops = [];
  const randomHalf = () => _offsetOpt(halfOffset, o6, roughnessGain);
  const randomFull = () => _offsetOpt(offset, o6, roughnessGain);
  const preserveVertices = o6.preserveVertices;
  if (move) {
    if (overlay) {
      ops.push({
        op: "move",
        data: [
          x1 + (preserveVertices ? 0 : randomHalf()),
          y1 + (preserveVertices ? 0 : randomHalf())
        ]
      });
    } else {
      ops.push({
        op: "move",
        data: [
          x1 + (preserveVertices ? 0 : _offsetOpt(offset, o6, roughnessGain)),
          y1 + (preserveVertices ? 0 : _offsetOpt(offset, o6, roughnessGain))
        ]
      });
    }
  }
  if (overlay) {
    ops.push({
      op: "bcurveTo",
      data: [
        midDispX + x1 + (x2 - x1) * divergePoint + randomHalf(),
        midDispY + y1 + (y2 - y1) * divergePoint + randomHalf(),
        midDispX + x1 + 2 * (x2 - x1) * divergePoint + randomHalf(),
        midDispY + y1 + 2 * (y2 - y1) * divergePoint + randomHalf(),
        x2 + (preserveVertices ? 0 : randomHalf()),
        y2 + (preserveVertices ? 0 : randomHalf())
      ]
    });
  } else {
    ops.push({
      op: "bcurveTo",
      data: [
        midDispX + x1 + (x2 - x1) * divergePoint + randomFull(),
        midDispY + y1 + (y2 - y1) * divergePoint + randomFull(),
        midDispX + x1 + 2 * (x2 - x1) * divergePoint + randomFull(),
        midDispY + y1 + 2 * (y2 - y1) * divergePoint + randomFull(),
        x2 + (preserveVertices ? 0 : randomFull()),
        y2 + (preserveVertices ? 0 : randomFull())
      ]
    });
  }
  return ops;
}
function _curve(points, closePoint, o6) {
  const len = points.length;
  const ops = [];
  if (len > 3) {
    const b2 = [];
    const s5 = 1 - o6.curveTightness;
    ops.push({ op: "move", data: [points[1][0], points[1][1]] });
    for (let i5 = 1; i5 + 2 < len; i5++) {
      const cachedVertArray = points[i5];
      b2[0] = [cachedVertArray[0], cachedVertArray[1]];
      b2[1] = [cachedVertArray[0] + (s5 * points[i5 + 1][0] - s5 * points[i5 - 1][0]) / 6, cachedVertArray[1] + (s5 * points[i5 + 1][1] - s5 * points[i5 - 1][1]) / 6];
      b2[2] = [points[i5 + 1][0] + (s5 * points[i5][0] - s5 * points[i5 + 2][0]) / 6, points[i5 + 1][1] + (s5 * points[i5][1] - s5 * points[i5 + 2][1]) / 6];
      b2[3] = [points[i5 + 1][0], points[i5 + 1][1]];
      ops.push({ op: "bcurveTo", data: [b2[1][0], b2[1][1], b2[2][0], b2[2][1], b2[3][0], b2[3][1]] });
    }
    if (closePoint && closePoint.length === 2) {
      const ro = o6.maxRandomnessOffset;
      ops.push({ op: "lineTo", data: [closePoint[0] + _offsetOpt(ro, o6), closePoint[1] + _offsetOpt(ro, o6)] });
    }
  } else if (len === 3) {
    ops.push({ op: "move", data: [points[1][0], points[1][1]] });
    ops.push({
      op: "bcurveTo",
      data: [
        points[1][0],
        points[1][1],
        points[2][0],
        points[2][1],
        points[2][0],
        points[2][1]
      ]
    });
  } else if (len === 2) {
    ops.push(..._line(points[0][0], points[0][1], points[1][0], points[1][1], o6, true, true));
  }
  return ops;
}
function _computeEllipsePoints(increment, cx, cy, rx, ry, offset, overlap, o6) {
  const coreOnly = o6.roughness === 0;
  const corePoints = [];
  const allPoints = [];
  if (coreOnly) {
    increment = increment / 4;
    allPoints.push([
      cx + rx * Math.cos(-increment),
      cy + ry * Math.sin(-increment)
    ]);
    for (let angle = 0; angle <= Math.PI * 2; angle = angle + increment) {
      const p2 = [
        cx + rx * Math.cos(angle),
        cy + ry * Math.sin(angle)
      ];
      corePoints.push(p2);
      allPoints.push(p2);
    }
    allPoints.push([
      cx + rx * Math.cos(0),
      cy + ry * Math.sin(0)
    ]);
    allPoints.push([
      cx + rx * Math.cos(increment),
      cy + ry * Math.sin(increment)
    ]);
  } else {
    const radOffset = _offsetOpt(0.5, o6) - Math.PI / 2;
    allPoints.push([
      _offsetOpt(offset, o6) + cx + 0.9 * rx * Math.cos(radOffset - increment),
      _offsetOpt(offset, o6) + cy + 0.9 * ry * Math.sin(radOffset - increment)
    ]);
    const endAngle = Math.PI * 2 + radOffset - 0.01;
    for (let angle = radOffset; angle < endAngle; angle = angle + increment) {
      const p2 = [
        _offsetOpt(offset, o6) + cx + rx * Math.cos(angle),
        _offsetOpt(offset, o6) + cy + ry * Math.sin(angle)
      ];
      corePoints.push(p2);
      allPoints.push(p2);
    }
    allPoints.push([
      _offsetOpt(offset, o6) + cx + rx * Math.cos(radOffset + Math.PI * 2 + overlap * 0.5),
      _offsetOpt(offset, o6) + cy + ry * Math.sin(radOffset + Math.PI * 2 + overlap * 0.5)
    ]);
    allPoints.push([
      _offsetOpt(offset, o6) + cx + 0.98 * rx * Math.cos(radOffset + overlap),
      _offsetOpt(offset, o6) + cy + 0.98 * ry * Math.sin(radOffset + overlap)
    ]);
    allPoints.push([
      _offsetOpt(offset, o6) + cx + 0.9 * rx * Math.cos(radOffset + overlap * 0.5),
      _offsetOpt(offset, o6) + cy + 0.9 * ry * Math.sin(radOffset + overlap * 0.5)
    ]);
  }
  return [allPoints, corePoints];
}

// node_modules/wired-elements/lib/wired-lib.js
var fillHelper = {
  randOffset(x2, _o) {
    return x2;
  },
  randOffsetWithRange(min, max, _o) {
    return (min + max) / 2;
  },
  ellipse(x2, y2, width, height, o6) {
    return ellipse(x2, y2, width, height, o6);
  },
  doubleLineOps(x1, y1, x2, y2, o6) {
    return doubleLineFillOps(x1, y1, x2, y2, o6);
  }
};
function options(seed) {
  return {
    maxRandomnessOffset: 2,
    roughness: 1,
    bowing: 0.85,
    stroke: "#000",
    strokeWidth: 1.5,
    curveTightness: 0,
    curveFitting: 0.95,
    curveStepCount: 9,
    fillStyle: "hachure",
    fillWeight: 3.5,
    hachureAngle: -41,
    hachureGap: 5,
    dashOffset: -1,
    dashGap: -1,
    zigzagOffset: 0,
    combineNestedSvgPaths: false,
    disableMultiStroke: false,
    disableMultiStrokeFill: false,
    seed
  };
}
function opsToPath(drawing, joinPaths) {
  let path = "";
  for (const item of drawing.ops) {
    const data = item.data;
    switch (item.op) {
      case "move":
        if (joinPaths && path) {
          break;
        }
        path += `M${data[0]} ${data[1]} `;
        break;
      case "bcurveTo":
        path += `C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]} `;
        break;
      case "lineTo":
        path += `L${data[0]} ${data[1]} `;
        break;
    }
  }
  return path.trim();
}
function svgNode(tagName, attributes) {
  const n7 = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  if (attributes) {
    for (const p2 in attributes) {
      n7.setAttributeNS(null, p2, attributes[p2]);
    }
  }
  return n7;
}
function createPathNode(ops, parent, joinPaths = false) {
  const path = svgNode("path", { d: opsToPath(ops, joinPaths) });
  if (parent) {
    parent.appendChild(path);
  }
  return path;
}
function rectangle2(parent, x2, y2, width, height, seed) {
  return createPathNode(rectangle(x2 + 2, y2 + 2, width - 4, height - 4, options(seed)), parent);
}
function line2(parent, x1, y1, x2, y2, seed) {
  return createPathNode(line(x1, y1, x2, y2, options(seed)), parent);
}
function polygon2(parent, vertices, seed) {
  return createPathNode(polygon(vertices, options(seed)), parent, true);
}
function ellipse2(parent, x2, y2, width, height, seed) {
  width = Math.max(width > 10 ? width - 4 : width - 1, 1);
  height = Math.max(height > 10 ? height - 4 : height - 1, 1);
  return createPathNode(ellipse(x2, y2, width, height, options(seed)), parent);
}
function hachureFill(points, seed) {
  const hf = new ZigZagFiller(fillHelper);
  const ops = hf.fillPolygon(points, options(seed));
  return createPathNode(ops, null);
}
function hachureEllipseFill(cx, cy, width, height, seed) {
  const o6 = options(seed);
  const ep = generateEllipseParams(width, height, o6);
  const vertices = [];
  let angle = 0;
  while (angle <= Math.PI * 2) {
    vertices.push([
      cx + ep.rx * Math.cos(angle),
      cy + ep.ry * Math.sin(angle)
    ]);
    angle += ep.increment;
  }
  return hachureFill(vertices, seed);
}

// node_modules/wired-elements/lib/wired-button.js
var __decorate2 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata2 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredButton = class WiredButton2 extends WiredBase {
  constructor() {
    super();
    this.elevation = 1;
    this.disabled = false;
    this.roAttached = false;
    if (window.ResizeObserver) {
      this.ro = new window.ResizeObserver(() => {
        if (this.svg) {
          this.wiredRender(true);
        }
      });
    }
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          font-size: 14px;
        }
        path {
          transition: transform 0.05s ease;
        }
        button {
          position: relative;
          user-select: none;
          border: none;
          background: none;
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
          letter-spacing: 1.25px;
          text-transform: uppercase;
          text-align: center;
          padding: 10px;
          color: inherit;
          outline: none;
        }
        button[disabled] {
          opacity: 0.6 !important;
          background: rgba(0, 0, 0, 0.07);
          cursor: default;
          pointer-events: none;
        }
        button:active path {
          transform: scale(0.97) translate(1.5%, 1.5%);
        }
        button:focus path {
          stroke-width: 1.5;
        }
        button::-moz-focus-inner {
          border: 0;
        }
      `
    ];
  }
  render() {
    return x`
    <button ?disabled="${this.disabled}">
      <slot @slotchange="${this.wiredRender}"></slot>
      <div id="overlay">
        <svg></svg>
      </div>
    </button>
    `;
  }
  focus() {
    if (this.button) {
      this.button.focus();
    } else {
      super.focus();
    }
  }
  canvasSize() {
    if (this.button) {
      const size = this.button.getBoundingClientRect();
      const elev = Math.min(Math.max(1, this.elevation), 5);
      const w2 = size.width + (elev - 1) * 2;
      const h3 = size.height + (elev - 1) * 2;
      return [w2, h3];
    }
    return this.lastSize;
  }
  draw(svg, size) {
    const elev = Math.min(Math.max(1, this.elevation), 5);
    const s5 = {
      width: size[0] - (elev - 1) * 2,
      height: size[1] - (elev - 1) * 2
    };
    rectangle2(svg, 0, 0, s5.width, s5.height, this.seed);
    for (let i5 = 1; i5 < elev; i5++) {
      line2(svg, i5 * 2, s5.height + i5 * 2, s5.width + i5 * 2, s5.height + i5 * 2, this.seed).style.opacity = `${(75 - i5 * 10) / 100}`;
      line2(svg, s5.width + i5 * 2, s5.height + i5 * 2, s5.width + i5 * 2, i5 * 2, this.seed).style.opacity = `${(75 - i5 * 10) / 100}`;
      line2(svg, i5 * 2, s5.height + i5 * 2, s5.width + i5 * 2, s5.height + i5 * 2, this.seed).style.opacity = `${(75 - i5 * 10) / 100}`;
      line2(svg, s5.width + i5 * 2, s5.height + i5 * 2, s5.width + i5 * 2, i5 * 2, this.seed).style.opacity = `${(75 - i5 * 10) / 100}`;
    }
  }
  updated() {
    super.updated();
    if (!this.roAttached) {
      this.attachResizeListener();
    }
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (this.button && this.ro) {
      this.ro.observe(this.button);
      this.roAttached = true;
    }
  }
  detachResizeListener() {
    if (this.button && this.ro) {
      this.ro.unobserve(this.button);
    }
    this.roAttached = false;
  }
};
__decorate2([
  n5({ type: Number }),
  __metadata2("design:type", Object)
], WiredButton.prototype, "elevation", void 0);
__decorate2([
  n5({ type: Boolean, reflect: true }),
  __metadata2("design:type", Object)
], WiredButton.prototype, "disabled", void 0);
__decorate2([
  i4("button"),
  __metadata2("design:type", HTMLButtonElement)
], WiredButton.prototype, "button", void 0);
WiredButton = __decorate2([
  e4("wired-button"),
  __metadata2("design:paramtypes", [])
], WiredButton);

// node_modules/wired-elements/lib/wired-card.js
var __decorate3 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata3 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredCard = class WiredCard2 extends WiredBase {
  constructor() {
    super();
    this.elevation = 1;
    this.roAttached = false;
    if (window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => {
        if (this.svg) {
          this.wiredRender();
        }
      });
    }
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          padding: 10px;
        }
        path.cardFill {
          stroke-width: 3.5;
          stroke: var(--wired-card-background-fill);
        }
        path {
          stroke: var(--wired-card-background-fill, currentColor);
        }
      `
    ];
  }
  render() {
    return x`
    <div id="overlay"><svg></svg></div>
    <div style="position: relative;">
      <slot @slotchange="${this.wiredRender}"></slot>
    </div>
    `;
  }
  updated(changed) {
    const force = changed.has("fill");
    this.wiredRender(force);
    this.attachResizeListener();
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (!this.roAttached) {
      if (this.resizeObserver) {
        this.resizeObserver.observe(this);
      } else if (!this.windowResizeHandler) {
        this.windowResizeHandler = () => this.wiredRender();
        window.addEventListener("resize", this.windowResizeHandler, { passive: true });
      }
      this.roAttached = true;
    }
  }
  detachResizeListener() {
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(this);
    }
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
    this.roAttached = false;
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    const elev = Math.min(Math.max(1, this.elevation), 5);
    const w2 = s5.width + (elev - 1) * 2;
    const h3 = s5.height + (elev - 1) * 2;
    return [w2, h3];
  }
  draw(svg, size) {
    const elev = Math.min(Math.max(1, this.elevation), 5);
    const s5 = {
      width: size[0] - (elev - 1) * 2,
      height: size[1] - (elev - 1) * 2
    };
    if (this.fill && this.fill.trim()) {
      const fillNode = hachureFill([
        [2, 2],
        [s5.width - 4, 2],
        [s5.width - 2, s5.height - 4],
        [2, s5.height - 4]
      ], this.seed);
      fillNode.classList.add("cardFill");
      svg.style.setProperty("--wired-card-background-fill", this.fill.trim());
      svg.appendChild(fillNode);
    }
    rectangle2(svg, 2, 2, s5.width - 4, s5.height - 4, this.seed);
    for (let i5 = 1; i5 < elev; i5++) {
      line2(svg, i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
      line2(svg, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
      line2(svg, i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
      line2(svg, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
    }
  }
};
__decorate3([
  n5({ type: Number }),
  __metadata3("design:type", Object)
], WiredCard.prototype, "elevation", void 0);
__decorate3([
  n5({ type: String }),
  __metadata3("design:type", String)
], WiredCard.prototype, "fill", void 0);
WiredCard = __decorate3([
  e4("wired-card"),
  __metadata3("design:paramtypes", [])
], WiredCard);

// node_modules/wired-elements/lib/wired-checkbox.js
var __decorate4 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata4 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredCheckbox = class WiredCheckbox2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.checked = false;
    this.disabled = false;
    this.focused = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        font-family: inherit;
      }
      :host([disabled]) {
        opacity: 0.6 !important;
        cursor: default;
        pointer-events: none;
      }
      :host([disabled]) svg {
        background: rgba(0, 0, 0, 0.07);
      }

      #container {
        display: flex;
        flex-direction: row;
        position: relative;
        user-select: none;
        min-height: 24px;
        cursor: pointer;
      }
      span {
        margin-left: 1.5ex;
        line-height: 24px;
      }
      input {
        opacity: 0;
      }
      path {
        stroke: var(--wired-checkbox-icon-color, currentColor);
        stroke-width: var(--wired-checkbox-default-swidth, 0.7);
      }
      g path {
        stroke-width: 2.5;
      }
      #container.focused {
        --wired-checkbox-default-swidth: 1.5;
      }
      `
    ];
  }
  focus() {
    if (this.input) {
      this.input.focus();
    } else {
      super.focus();
    }
  }
  wiredRender(force = false) {
    super.wiredRender(force);
    this.refreshCheckVisibility();
  }
  render() {
    return x`
    <label id="container" class="${this.focused ? "focused" : ""}">
      <input type="checkbox" .checked="${this.checked}" ?disabled="${this.disabled}" 
        @change="${this.onChange}"
        @focus="${() => this.focused = true}"
        @blur="${() => this.focused = false}">
      <span><slot></slot></span>
      <div id="overlay"><svg></svg></div>
    </label>
    `;
  }
  onChange() {
    this.checked = this.input.checked;
    this.refreshCheckVisibility();
    this.fire("change", { checked: this.checked });
  }
  canvasSize() {
    return [24, 24];
  }
  draw(svg, size) {
    rectangle2(svg, 0, 0, size[0], size[1], this.seed);
    this.svgCheck = svgNode("g");
    svg.appendChild(this.svgCheck);
    line2(this.svgCheck, size[0] * 0.3, size[1] * 0.4, size[0] * 0.5, size[1] * 0.7, this.seed);
    line2(this.svgCheck, size[0] * 0.5, size[1] * 0.7, size[0] + 5, -5, this.seed);
  }
  refreshCheckVisibility() {
    if (this.svgCheck) {
      this.svgCheck.style.display = this.checked ? "" : "none";
    }
  }
};
__decorate4([
  n5({ type: Boolean }),
  __metadata4("design:type", Object)
], WiredCheckbox.prototype, "checked", void 0);
__decorate4([
  n5({ type: Boolean, reflect: true }),
  __metadata4("design:type", Object)
], WiredCheckbox.prototype, "disabled", void 0);
__decorate4([
  t3(),
  __metadata4("design:type", Object)
], WiredCheckbox.prototype, "focused", void 0);
__decorate4([
  i4("input"),
  __metadata4("design:type", HTMLInputElement)
], WiredCheckbox.prototype, "input", void 0);
WiredCheckbox = __decorate4([
  e4("wired-checkbox")
], WiredCheckbox);

// node_modules/wired-elements/lib/wired-item.js
var __decorate5 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata5 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredItem = class WiredItem2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.value = "";
    this.name = "";
    this.selected = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        font-size: 14px;
        text-align: left;
      }
      button {
        cursor: pointer;
        outline: none;
        overflow: hidden;
        color: inherit;
        user-select: none;
        position: relative;
        font-family: inherit;
        text-align: inherit;
        font-size: inherit;
        letter-spacing: 1.25px;
        padding: 1px 10px;
        min-height: 36px;
        text-transform: inherit;
        background: none;
        border: none;
        transition: background-color 0.3s ease, color 0.3s ease;
        width: 100%;
        box-sizing: border-box;
        white-space: nowrap;
      }
      button.selected {
        color: var(--wired-item-selected-color, #fff);
      }
      button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: currentColor;
        opacity: 0;
      }
      button span {
        display: inline-block;
        transition: transform 0.2s ease;
        position: relative;
      }
      button:active span {
        transform: scale(1.02);
      }
      #overlay {
        display: none;
      }
      button.selected #overlay {
        display: block;
      }
      svg path {
        stroke: var(--wired-item-selected-bg, #000);
        stroke-width: 2.75;
        fill: transparent;
        transition: transform 0.05s ease;
      }
      @media (hover: hover) {
        button:hover::before {
          opacity: 0.05;
        }
      }
      `
    ];
  }
  render() {
    return x`
    <button class="${this.selected ? "selected" : ""}">
      <div id="overlay"><svg></svg></div>
      <span><slot></slot></span>
    </button>`;
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    const g2 = hachureFill([
      [0, 0],
      [size[0], 0],
      [size[0], size[1]],
      [0, size[1]]
    ], this.seed);
    svg.appendChild(g2);
  }
};
__decorate5([
  n5(),
  __metadata5("design:type", Object)
], WiredItem.prototype, "value", void 0);
__decorate5([
  n5(),
  __metadata5("design:type", Object)
], WiredItem.prototype, "name", void 0);
__decorate5([
  n5({ type: Boolean }),
  __metadata5("design:type", Object)
], WiredItem.prototype, "selected", void 0);
WiredItem = __decorate5([
  e4("wired-item")
], WiredItem);

// node_modules/wired-elements/lib/wired-combo.js
var __decorate6 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata6 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredCombo = class WiredCombo2 extends s4 {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.seed = randomSeed();
    this.cardShowing = false;
    this.itemNodes = [];
  }
  static get styles() {
    return i`
      :host {
        display: inline-block;
        font-family: inherit;
        position: relative;
        outline: none;
        opacity: 0;
      }
    
      :host(.wired-disabled) {
        opacity: 0.5 !important;
        cursor: default;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.02);
      }
      
      :host(.wired-rendered) {
        opacity: 1;
      }
  
      :host(:focus) path {
        stroke-width: 1.5;
      }
    
      #container {
        white-space: nowrap;
        position: relative;
      }
    
      .inline {
        display: inline-block;
        vertical-align: top
      }
    
      #textPanel {
        min-width: 90px;
        min-height: 18px;
        padding: 8px;
      }
    
      #dropPanel {
        width: 34px;
        cursor: pointer;
      }
    
      .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }
    
      svg {
        display: block;
      }
    
      path {
        stroke: currentColor;
        stroke-width: 0.7;
        fill: transparent;
      }
    
      #card {
        display: block;
        position: absolute;
        background: var(--wired-combo-popup-bg, white);
        z-index: 1;
        box-shadow: 1px 5px 15px -6px rgba(0, 0, 0, 0.8);
        padding: 8px;
      }
  
      ::slotted(wired-item) {
        display: block;
      }
    `;
  }
  render() {
    return x`
    <div id="container" @click="${this.onCombo}">
      <div id="textPanel" class="inline">
        <span>${this.value && this.value.text}</span>
      </div>
      <div id="dropPanel" class="inline"></div>
      <div class="overlay">
        <svg></svg>
      </div>
    </div>
    <wired-card id="card" tabindex="-1" role="listbox" @mousedown="${this.onItemClick}" @touchstart="${this.onItemClick}" style="display: none;">
      <slot id="slot"></slot>
    </wired-card>
    `;
  }
  refreshDisabledState() {
    if (this.disabled) {
      this.classList.add("wired-disabled");
    } else {
      this.classList.remove("wired-disabled");
    }
    this.tabIndex = this.disabled ? -1 : +(this.getAttribute("tabindex") || 0);
  }
  firstUpdated() {
    this.setAttribute("role", "combobox");
    this.setAttribute("aria-haspopup", "listbox");
    this.refreshSelection();
    this.addEventListener("blur", () => {
      if (this.cardShowing) {
        this.setCardShowing(false);
      }
    });
    this.addEventListener("keydown", (event) => {
      switch (event.keyCode) {
        case 37:
        case 38:
          event.preventDefault();
          this.selectPrevious();
          break;
        case 39:
        case 40:
          event.preventDefault();
          this.selectNext();
          break;
        case 27:
          event.preventDefault();
          if (this.cardShowing) {
            this.setCardShowing(false);
          }
          break;
        case 13:
          event.preventDefault();
          this.setCardShowing(!this.cardShowing);
          break;
        case 32:
          event.preventDefault();
          if (!this.cardShowing) {
            this.setCardShowing(true);
          }
          break;
      }
    });
  }
  updated(changed) {
    if (changed.has("disabled")) {
      this.refreshDisabledState();
    }
    const svg = this.svg;
    while (svg.hasChildNodes()) {
      svg.removeChild(svg.lastChild);
    }
    const s5 = this.shadowRoot.getElementById("container").getBoundingClientRect();
    svg.setAttribute("width", `${s5.width}`);
    svg.setAttribute("height", `${s5.height}`);
    const textBounds = this.shadowRoot.getElementById("textPanel").getBoundingClientRect();
    this.shadowRoot.getElementById("dropPanel").style.minHeight = textBounds.height + "px";
    rectangle2(svg, 0, 0, textBounds.width, textBounds.height, this.seed);
    const dropx = textBounds.width - 4;
    rectangle2(svg, dropx, 0, 34, textBounds.height, this.seed);
    const dropOffset = Math.max(0, Math.abs((textBounds.height - 24) / 2));
    const poly = polygon2(svg, [
      [dropx + 8, 5 + dropOffset],
      [dropx + 26, 5 + dropOffset],
      [dropx + 17, dropOffset + Math.min(textBounds.height, 18)]
    ], this.seed);
    poly.style.fill = "currentColor";
    poly.style.pointerEvents = this.disabled ? "none" : "auto";
    poly.style.cursor = "pointer";
    this.classList.add("wired-rendered");
    this.setAttribute("aria-expanded", `${this.cardShowing}`);
    if (!this.itemNodes.length) {
      this.itemNodes = [];
      const nodes = this.shadowRoot.getElementById("slot").assignedNodes();
      if (nodes && nodes.length) {
        for (let i5 = 0; i5 < nodes.length; i5++) {
          const element = nodes[i5];
          if (element.tagName === "WIRED-ITEM") {
            element.setAttribute("role", "option");
            this.itemNodes.push(element);
          }
        }
      }
    }
  }
  refreshSelection() {
    if (this.lastSelectedItem) {
      this.lastSelectedItem.selected = false;
      this.lastSelectedItem.removeAttribute("aria-selected");
    }
    const slot = this.shadowRoot.getElementById("slot");
    const nodes = slot.assignedNodes();
    if (nodes) {
      let selectedItem = null;
      for (let i5 = 0; i5 < nodes.length; i5++) {
        const element = nodes[i5];
        if (element.tagName === "WIRED-ITEM") {
          const value = element.value || element.getAttribute("value") || "";
          if (this.selected && value === this.selected) {
            selectedItem = element;
            break;
          }
        }
      }
      this.lastSelectedItem = selectedItem || void 0;
      if (this.lastSelectedItem) {
        this.lastSelectedItem.selected = true;
        this.lastSelectedItem.setAttribute("aria-selected", "true");
      }
      if (selectedItem) {
        this.value = {
          value: selectedItem.value || "",
          text: selectedItem.textContent || ""
        };
      } else {
        this.value = void 0;
      }
    }
  }
  setCardShowing(showing) {
    if (this.card) {
      this.cardShowing = showing;
      this.card.style.display = showing ? "" : "none";
      if (showing) {
        setTimeout(() => {
          const nodes = this.shadowRoot.getElementById("slot").assignedNodes().filter((d3) => {
            return d3.nodeType === Node.ELEMENT_NODE;
          });
          nodes.forEach((n7) => {
            const e7 = n7;
            if (e7.requestUpdate) {
              e7.requestUpdate();
            }
          });
        }, 10);
      }
      this.setAttribute("aria-expanded", `${this.cardShowing}`);
    }
  }
  onItemClick(event) {
    event.stopPropagation();
    this.selected = event.target.value;
    this.refreshSelection();
    this.fireSelected();
    setTimeout(() => {
      this.setCardShowing(false);
    });
  }
  fireSelected() {
    fireEvent(this, "selected", { selected: this.selected });
  }
  selectPrevious() {
    const list = this.itemNodes;
    if (list.length) {
      let index = -1;
      for (let i5 = 0; i5 < list.length; i5++) {
        if (list[i5] === this.lastSelectedItem) {
          index = i5;
          break;
        }
      }
      if (index < 0) {
        index = 0;
      } else if (index === 0) {
        index = list.length - 1;
      } else {
        index--;
      }
      this.selected = list[index].value || "";
      this.refreshSelection();
      this.fireSelected();
    }
  }
  selectNext() {
    const list = this.itemNodes;
    if (list.length) {
      let index = -1;
      for (let i5 = 0; i5 < list.length; i5++) {
        if (list[i5] === this.lastSelectedItem) {
          index = i5;
          break;
        }
      }
      if (index < 0) {
        index = 0;
      } else if (index >= list.length - 1) {
        index = 0;
      } else {
        index++;
      }
      this.selected = list[index].value || "";
      this.refreshSelection();
      this.fireSelected();
    }
  }
  onCombo(event) {
    event.stopPropagation();
    this.setCardShowing(!this.cardShowing);
  }
};
__decorate6([
  n5({ type: Object }),
  __metadata6("design:type", Object)
], WiredCombo.prototype, "value", void 0);
__decorate6([
  n5({ type: String, reflect: true }),
  __metadata6("design:type", String)
], WiredCombo.prototype, "selected", void 0);
__decorate6([
  n5({ type: Boolean, reflect: true }),
  __metadata6("design:type", Object)
], WiredCombo.prototype, "disabled", void 0);
__decorate6([
  i4("svg"),
  __metadata6("design:type", SVGSVGElement)
], WiredCombo.prototype, "svg", void 0);
__decorate6([
  i4("#card"),
  __metadata6("design:type", HTMLDivElement)
], WiredCombo.prototype, "card", void 0);
WiredCombo = __decorate6([
  e4("wired-combo")
], WiredCombo);

// node_modules/wired-elements/lib/wired-dialog.js
var __decorate7 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata7 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredDialog = class WiredDialog2 extends s4 {
  constructor() {
    super(...arguments);
    this.elevation = 5;
    this.open = false;
  }
  static get styles() {
    return i`
      #container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: var(--wired-dialog-z-index, 100);
      }
      #container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.4);
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      #overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0;
        transform: translateY(150px);
        transition: transform 0.5s ease, opacity 0.5s ease;
      }
      .layout.vertical {
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        -ms-flex-direction: column;
        -webkit-flex-direction: column;
        flex-direction: column;
      }
      .flex {
        -ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
      }
      wired-card {
        display: inline-block;
        background: white;
        text-align: left;
      }

      :host([open]) #container {
        pointer-events: auto;
      }
      :host([open]) #container::before {
        opacity: 1;
      }
      :host([open]) #overlay {
        opacity: 1;
        transform: none;
      }
    `;
  }
  render() {
    return x`
    <div id="container">
      <div id="overlay" class="vertical layout">
        <div class="flex"></div>
        <div style="text-align: center; padding: 5px;">
          <wired-card .elevation="${this.elevation}"><slot></slot></wired-card>
        </div>
        <div class="flex"></div>
      </div>
    </div>
    `;
  }
  updated() {
    if (this.card) {
      this.card.wiredRender(true);
    }
  }
};
__decorate7([
  n5({ type: Number }),
  __metadata7("design:type", Object)
], WiredDialog.prototype, "elevation", void 0);
__decorate7([
  n5({ type: Boolean, reflect: true }),
  __metadata7("design:type", Object)
], WiredDialog.prototype, "open", void 0);
__decorate7([
  i4("wired-card"),
  __metadata7("design:type", WiredCard)
], WiredDialog.prototype, "card", void 0);
WiredDialog = __decorate7([
  e4("wired-dialog")
], WiredDialog);

// node_modules/wired-elements/lib/wired-divider.js
var __decorate8 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata8 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredDivider = class WiredDivider2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.elevation = 1;
    this.roAttached = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: block;
          position: relative;
        }
      `
    ];
  }
  render() {
    return x`<svg></svg>`;
  }
  canvasSize() {
    const size = this.getBoundingClientRect();
    const elev = Math.min(Math.max(1, this.elevation), 5);
    return [size.width, elev * 6];
  }
  draw(svg, size) {
    const elev = Math.min(Math.max(1, this.elevation), 5);
    for (let i5 = 0; i5 < elev; i5++) {
      line2(svg, 0, i5 * 6 + 3, size[0], i5 * 6 + 3, this.seed);
    }
  }
  updated() {
    super.updated();
    this.attachResizeListener();
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (!this.roAttached) {
      if (this.resizeObserver) {
        this.resizeObserver.observe(this);
      } else if (!this.windowResizeHandler) {
        this.windowResizeHandler = () => this.wiredRender();
        window.addEventListener("resize", this.windowResizeHandler, { passive: true });
      }
      this.roAttached = true;
    }
  }
  detachResizeListener() {
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(this);
    }
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
    this.roAttached = false;
  }
};
__decorate8([
  n5({ type: Number }),
  __metadata8("design:type", Object)
], WiredDivider.prototype, "elevation", void 0);
WiredDivider = __decorate8([
  e4("wired-divider")
], WiredDivider);

// node_modules/wired-elements/lib/wired-fab.js
var __decorate9 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata9 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredFab = class WiredFab2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.disabled = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          font-size: 14px;
          color: #fff;
        }
        button {
          position: relative;
          user-select: none;
          border: none;
          background: none;
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
          letter-spacing: 1.25px;
          text-transform: uppercase;
          text-align: center;
          padding: 16px;
          color: inherit;
          outline: none;
          border-radius: 50%;
        }
        button[disabled] {
          opacity: 0.6 !important;
          background: rgba(0, 0, 0, 0.07);
          cursor: default;
          pointer-events: none;
        }
        button::-moz-focus-inner {
          border: 0;
        }
        button ::slotted(*) {
          position: relative;
          font-size: var(--wired-icon-size, 24px);
          transition: transform 0.2s ease, opacity 0.2s ease;
          opacity: 0.85;
        }
        path {
          stroke: var(--wired-fab-bg-color, #018786);
          stroke-width: 3;
          fill: transparent;
        }

        button:focus ::slotted(*) {
          opacity: 1;
        }
        button:active ::slotted(*) {
          opacity: 1;
          transform: scale(1.15);
        }
      `
    ];
  }
  render() {
    return x`
    <button ?disabled="${this.disabled}">
      <div id="overlay">
        <svg></svg>
      </div>
      <slot @slotchange="${this.wiredRender}"></slot>
    </button>
    `;
  }
  canvasSize() {
    if (this.button) {
      const size = this.button.getBoundingClientRect();
      return [size.width, size.height];
    }
    return this.lastSize;
  }
  draw(svg, size) {
    const min = Math.min(size[0], size[1]);
    const g2 = hachureEllipseFill(min / 2, min / 2, min, min, this.seed);
    svg.appendChild(g2);
  }
};
__decorate9([
  n5({ type: Boolean, reflect: true }),
  __metadata9("design:type", Object)
], WiredFab.prototype, "disabled", void 0);
__decorate9([
  i4("button"),
  __metadata9("design:type", HTMLButtonElement)
], WiredFab.prototype, "button", void 0);
WiredFab = __decorate9([
  e4("wired-fab")
], WiredFab);

// node_modules/wired-elements/lib/wired-icon-button.js
var __decorate10 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata10 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredIconButton = class WiredIconButton2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.disabled = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          font-size: 14px;
        }
        path {
          transition: transform 0.05s ease;
        }
        button {
          position: relative;
          user-select: none;
          border: none;
          background: none;
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
          letter-spacing: 1.25px;
          text-transform: uppercase;
          text-align: center;
          padding: 10px;
          color: inherit;
          outline: none;
          border-radius: 50%;
        }
        button[disabled] {
          opacity: 0.6 !important;
          background: rgba(0, 0, 0, 0.07);
          cursor: default;
          pointer-events: none;
        }
        button:active path {
          transform: scale(0.97) translate(1.5%, 1.5%);
        }
        button:focus path {
          stroke-width: 1.5;
        }
        button::-moz-focus-inner {
          border: 0;
        }
        button ::slotted(*) {
          position: relative;
          font-size: var(--wired-icon-size, 24px);
        }
      `
    ];
  }
  render() {
    return x`
    <button ?disabled="${this.disabled}">
      <slot @slotchange="${this.wiredRender}"></slot>
      <div id="overlay">
        <svg></svg>
      </div>
    </button>
    `;
  }
  canvasSize() {
    if (this.button) {
      const size = this.button.getBoundingClientRect();
      return [size.width, size.height];
    }
    return this.lastSize;
  }
  draw(svg, size) {
    const min = Math.min(size[0], size[1]);
    svg.setAttribute("width", `${min}`);
    svg.setAttribute("height", `${min}`);
    ellipse2(svg, min / 2, min / 2, min, min, this.seed);
  }
};
__decorate10([
  n5({ type: Boolean, reflect: true }),
  __metadata10("design:type", Object)
], WiredIconButton.prototype, "disabled", void 0);
__decorate10([
  i4("button"),
  __metadata10("design:type", HTMLButtonElement)
], WiredIconButton.prototype, "button", void 0);
WiredIconButton = __decorate10([
  e4("wired-icon-button")
], WiredIconButton);

// node_modules/wired-elements/lib/wired-image.js
var __decorate11 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata11 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var EMPTY_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
var WiredImage = class WiredImage2 extends WiredBase {
  constructor() {
    super();
    this.elevation = 1;
    this.src = EMPTY_IMAGE;
    this.roAttached = false;
    if (window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => {
        if (this.svg) {
          this.wiredRender();
        }
      });
    }
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          line-height: 1;
          padding: 3px;
        }
        img {
          display: block;
          box-sizing: border-box;
          max-width: 100%;
          max-height: 100%;
        }
        path {
          stroke-width: 1;
        }
      `
    ];
  }
  render() {
    return x`
    <img src="${this.src}">
    <div id="overlay"><svg></svg></div>
    `;
  }
  updated() {
    super.updated();
    this.attachResizeListener();
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (!this.roAttached) {
      if (this.resizeObserver && this.resizeObserver.observe) {
        this.resizeObserver.observe(this);
      } else if (!this.windowResizeHandler) {
        this.windowResizeHandler = () => this.wiredRender();
        window.addEventListener("resize", this.windowResizeHandler, { passive: true });
      }
      this.roAttached = true;
    }
  }
  detachResizeListener() {
    if (this.resizeObserver && this.resizeObserver.unobserve) {
      this.resizeObserver.unobserve(this);
    }
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
    this.roAttached = false;
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    const elev = Math.min(Math.max(1, this.elevation), 5);
    const w2 = s5.width + (elev - 1) * 2;
    const h3 = s5.height + (elev - 1) * 2;
    return [w2, h3];
  }
  draw(svg, size) {
    const elev = Math.min(Math.max(1, this.elevation), 5);
    const s5 = {
      width: size[0] - (elev - 1) * 2,
      height: size[1] - (elev - 1) * 2
    };
    rectangle2(svg, 2, 2, s5.width - 4, s5.height - 4, this.seed);
    for (let i5 = 1; i5 < elev; i5++) {
      line2(svg, i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
      line2(svg, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
      line2(svg, i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
      line2(svg, s5.width - 4 + i5 * 2, s5.height - 4 + i5 * 2, s5.width - 4 + i5 * 2, i5 * 2, this.seed).style.opacity = `${(85 - i5 * 10) / 100}`;
    }
  }
};
__decorate11([
  n5({ type: Number }),
  __metadata11("design:type", Object)
], WiredImage.prototype, "elevation", void 0);
__decorate11([
  n5({ type: String }),
  __metadata11("design:type", String)
], WiredImage.prototype, "src", void 0);
WiredImage = __decorate11([
  e4("wired-image"),
  __metadata11("design:paramtypes", [])
], WiredImage);

// node_modules/wired-elements/lib/wired-input.js
var __decorate12 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata12 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredInput = class WiredInput2 extends WiredBase {
  constructor() {
    super();
    this.disabled = false;
    this.placeholder = "";
    this.type = "text";
    this.autocomplete = "";
    this.autocapitalize = "";
    this.autocorrect = "";
    this.required = false;
    this.autofocus = false;
    this.readonly = false;
    this.roAttached = false;
    if (window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => {
        if (this.svg) {
          this.wiredRender(true);
        }
      });
    }
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          padding: 5px;
          font-family: sans-serif;
          width: 150px;
          outline: none;
        }
        :host([disabled]) {
          opacity: 0.6 !important;
          cursor: default;
          pointer-events: none;
        }
        :host([disabled]) svg {
          background: rgba(0, 0, 0, 0.07);
        }
        input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          border: none;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          color: inherit;
          padding: 6px;
        }
        input:focus + div path {
          stroke-width: 1.5;
        }
      `
    ];
  }
  render() {
    return x`
    <input name="${this.name}" type="${this.type}" placeholder="${this.placeholder}" ?disabled="${this.disabled}"
      ?required="${this.required}" autocomplete="${this.autocomplete}" ?autofocus="${this.autofocus}" minlength="${this.minlength}"
      maxlength="${this.maxlength}" min="${this.min}" max="${this.max}" step="${this.step}" ?readonly="${this.readonly}"
      size="${this.size}" autocapitalize="${this.autocapitalize}" autocorrect="${this.autocorrect}" 
      @change="${this.refire}" @input="${this.refire}">
    <div id="overlay">
      <svg></svg>
    </div>
    `;
  }
  get input() {
    return this.textInput;
  }
  get value() {
    const input = this.input;
    return input && input.value || "";
  }
  set value(v2) {
    if (this.shadowRoot) {
      const input = this.input;
      if (input) {
        input.value = v2;
        return;
      }
    }
    this.pendingValue = v2;
  }
  firstUpdated() {
    this.value = this.pendingValue || this.value || this.getAttribute("value") || "";
    delete this.pendingValue;
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    rectangle2(svg, 2, 2, size[0] - 2, size[1] - 2, this.seed);
  }
  refire(event) {
    event.stopPropagation();
    this.fire(event.type, { sourceEvent: event });
  }
  focus() {
    if (this.textInput) {
      this.textInput.focus();
    } else {
      super.focus();
    }
  }
  updated() {
    super.updated();
    this.attachResizeListener();
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (!this.roAttached) {
      if (this.textInput && this.resizeObserver) {
        this.resizeObserver.observe(this.textInput);
      }
      this.roAttached = true;
    }
  }
  detachResizeListener() {
    if (this.textInput && this.resizeObserver) {
      this.resizeObserver.unobserve(this.textInput);
    }
    this.roAttached = false;
  }
};
__decorate12([
  n5({ type: Boolean, reflect: true }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "disabled", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "placeholder", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", String)
], WiredInput.prototype, "name", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", String)
], WiredInput.prototype, "min", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", String)
], WiredInput.prototype, "max", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", String)
], WiredInput.prototype, "step", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "type", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "autocomplete", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "autocapitalize", void 0);
__decorate12([
  n5({ type: String }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "autocorrect", void 0);
__decorate12([
  n5({ type: Boolean }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "required", void 0);
__decorate12([
  n5({ type: Boolean }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "autofocus", void 0);
__decorate12([
  n5({ type: Boolean }),
  __metadata12("design:type", Object)
], WiredInput.prototype, "readonly", void 0);
__decorate12([
  n5({ type: Number }),
  __metadata12("design:type", Number)
], WiredInput.prototype, "minlength", void 0);
__decorate12([
  n5({ type: Number }),
  __metadata12("design:type", Number)
], WiredInput.prototype, "maxlength", void 0);
__decorate12([
  n5({ type: Number }),
  __metadata12("design:type", Number)
], WiredInput.prototype, "size", void 0);
__decorate12([
  i4("input"),
  __metadata12("design:type", HTMLInputElement)
], WiredInput.prototype, "textInput", void 0);
WiredInput = __decorate12([
  e4("wired-input"),
  __metadata12("design:paramtypes", [])
], WiredInput);

// node_modules/wired-elements/lib/wired-link.js
var __decorate13 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata13 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredLink = class WiredLink2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.elevation = 1;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
        }
        a, a:hover, a:visited {
          color: inherit;
          outline: none;
          display: inline-block;
          white-space: nowrap;
          text-decoration: none;
          border: none;
        }
        path {
          stroke: var(--wired-link-decoration-color, blue);
          stroke-opacity: 0.45;
        }
        a:focus path {
          stroke-opacity: 1;
        }
      `
    ];
  }
  render() {
    return x`
    <a href="${this.href}" target="${this.target || ""}">
      <slot></slot>
      <div id="overlay"><svg></svg></div>
    </a>
    `;
  }
  focus() {
    if (this.anchor) {
      this.anchor.focus();
    } else {
      super.focus();
    }
  }
  canvasSize() {
    if (this.anchor) {
      const size = this.anchor.getBoundingClientRect();
      const elev = Math.min(Math.max(1, this.elevation), 5);
      const w2 = size.width;
      const h3 = size.height + (elev - 1) * 2;
      return [w2, h3];
    }
    return this.lastSize;
  }
  draw(svg, size) {
    const elev = Math.min(Math.max(1, this.elevation), 5);
    const s5 = {
      width: size[0],
      height: size[1] - (elev - 1) * 2
    };
    for (let i5 = 0; i5 < elev; i5++) {
      line2(svg, 0, s5.height + i5 * 2 - 2, s5.width, s5.height + i5 * 2 - 2, this.seed);
      line2(svg, 0, s5.height + i5 * 2 - 2, s5.width, s5.height + i5 * 2 - 2, this.seed);
    }
  }
};
__decorate13([
  n5({ type: Number }),
  __metadata13("design:type", Object)
], WiredLink.prototype, "elevation", void 0);
__decorate13([
  n5({ type: String }),
  __metadata13("design:type", String)
], WiredLink.prototype, "href", void 0);
__decorate13([
  n5({ type: String }),
  __metadata13("design:type", String)
], WiredLink.prototype, "target", void 0);
__decorate13([
  i4("a"),
  __metadata13("design:type", HTMLAnchorElement)
], WiredLink.prototype, "anchor", void 0);
WiredLink = __decorate13([
  e4("wired-link")
], WiredLink);

// node_modules/wired-elements/lib/wired-listbox.js
var __decorate14 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata14 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredListbox = class WiredListbox2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.horizontal = false;
    this.itemNodes = [];
    this.itemClickHandler = this.onItemClick.bind(this);
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        font-family: inherit;
        position: relative;
        padding: 5px;
        outline: none;
      }
      :host(:focus) path {
        stroke-width: 1.5;
      }
      ::slotted(wired-item) {
        display: block;
      }
      :host(.wired-horizontal) ::slotted(wired-item) {
        display: inline-block;
      }
      `
    ];
  }
  render() {
    return x`
    <slot id="slot" @slotchange="${() => this.requestUpdate()}"></slot>
    <div id="overlay">
      <svg id="svg"></svg>
    </div>
    `;
  }
  firstUpdated() {
    this.setAttribute("role", "listbox");
    this.tabIndex = +(this.getAttribute("tabindex") || 0);
    this.refreshSelection();
    this.addEventListener("click", this.itemClickHandler);
    this.addEventListener("keydown", (event) => {
      switch (event.keyCode) {
        case 37:
        case 38:
          event.preventDefault();
          this.selectPrevious();
          break;
        case 39:
        case 40:
          event.preventDefault();
          this.selectNext();
          break;
      }
    });
  }
  updated() {
    super.updated();
    if (this.horizontal) {
      this.classList.add("wired-horizontal");
    } else {
      this.classList.remove("wired-horizontal");
    }
    if (!this.itemNodes.length) {
      this.itemNodes = [];
      const nodes = this.shadowRoot.getElementById("slot").assignedNodes();
      if (nodes && nodes.length) {
        for (let i5 = 0; i5 < nodes.length; i5++) {
          const element = nodes[i5];
          if (element.tagName === "WIRED-ITEM") {
            element.setAttribute("role", "option");
            this.itemNodes.push(element);
          }
        }
      }
    }
  }
  onItemClick(event) {
    event.stopPropagation();
    this.selected = event.target.value;
    this.refreshSelection();
    this.fireSelected();
  }
  refreshSelection() {
    if (this.lastSelectedItem) {
      this.lastSelectedItem.selected = false;
      this.lastSelectedItem.removeAttribute("aria-selected");
    }
    const slot = this.shadowRoot.getElementById("slot");
    const nodes = slot.assignedNodes();
    if (nodes) {
      let selectedItem = null;
      for (let i5 = 0; i5 < nodes.length; i5++) {
        const element = nodes[i5];
        if (element.tagName === "WIRED-ITEM") {
          const value = element.value || "";
          if (this.selected && value === this.selected) {
            selectedItem = element;
            break;
          }
        }
      }
      this.lastSelectedItem = selectedItem || void 0;
      if (this.lastSelectedItem) {
        this.lastSelectedItem.selected = true;
        this.lastSelectedItem.setAttribute("aria-selected", "true");
      }
      if (selectedItem) {
        this.value = {
          value: selectedItem.value || "",
          text: selectedItem.textContent || ""
        };
      } else {
        this.value = void 0;
      }
    }
  }
  fireSelected() {
    this.fire("selected", { selected: this.selected });
  }
  selectPrevious() {
    const list = this.itemNodes;
    if (list.length) {
      let index = -1;
      for (let i5 = 0; i5 < list.length; i5++) {
        if (list[i5] === this.lastSelectedItem) {
          index = i5;
          break;
        }
      }
      if (index < 0) {
        index = 0;
      } else if (index === 0) {
        index = list.length - 1;
      } else {
        index--;
      }
      this.selected = list[index].value || "";
      this.refreshSelection();
      this.fireSelected();
    }
  }
  selectNext() {
    const list = this.itemNodes;
    if (list.length) {
      let index = -1;
      for (let i5 = 0; i5 < list.length; i5++) {
        if (list[i5] === this.lastSelectedItem) {
          index = i5;
          break;
        }
      }
      if (index < 0) {
        index = 0;
      } else if (index >= list.length - 1) {
        index = 0;
      } else {
        index++;
      }
      this.selected = list[index].value || "";
      this.refreshSelection();
      this.fireSelected();
    }
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    rectangle2(svg, 0, 0, size[0], size[1], this.seed);
  }
};
__decorate14([
  n5({ type: Object }),
  __metadata14("design:type", Object)
], WiredListbox.prototype, "value", void 0);
__decorate14([
  n5({ type: String }),
  __metadata14("design:type", String)
], WiredListbox.prototype, "selected", void 0);
__decorate14([
  n5({ type: Boolean }),
  __metadata14("design:type", Object)
], WiredListbox.prototype, "horizontal", void 0);
WiredListbox = __decorate14([
  e4("wired-listbox")
], WiredListbox);

// node_modules/wired-elements/lib/wired-progress.js
var __decorate15 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata15 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredProgress = class WiredProgress2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.percentage = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        position: relative;
        width: 400px;
        height: 42px;
        font-family: sans-serif;
      }
      .labelContainer {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .progressLabel {
        color: var(--wired-progress-label-color, #000);
        font-size: var(--wired-progress-font-size, 14px);
        background: var(--wired-progress-label-background, rgba(255,255,255,0.9));
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 1.25px;
      }
      path.progbox {
        stroke: var(--wired-progress-color, rgba(0, 0, 200, 0.8));
        stroke-width: 2.75;
        fill: none;
      }
      .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }
      `
    ];
  }
  render() {
    return x`
    <div id="overlay" class="overlay">
      <svg></svg>
    </div>
    <div class="overlay labelContainer">
      <div class="progressLabel">${this.getProgressLabel()}</div>
    </div>
    `;
  }
  getProgressLabel() {
    if (this.percentage) {
      if (this.max === this.min) {
        return "%";
      } else {
        const pct = Math.floor((this.value - this.min) / (this.max - this.min) * 100);
        return pct + "%";
      }
    } else {
      return "" + this.value;
    }
  }
  wiredRender(force = false) {
    super.wiredRender(force);
    this.refreshProgressFill();
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    rectangle2(svg, 2, 2, size[0] - 2, size[1] - 2, this.seed);
  }
  refreshProgressFill() {
    if (this.progBox) {
      if (this.progBox.parentElement) {
        this.progBox.parentElement.removeChild(this.progBox);
      }
      this.progBox = void 0;
    }
    if (this.svg) {
      let pct = 0;
      const s5 = this.getBoundingClientRect();
      if (this.max > this.min) {
        pct = (this.value - this.min) / (this.max - this.min);
        const progWidth = s5.width * Math.max(0, Math.min(pct, 100));
        this.progBox = hachureFill([
          [0, 0],
          [progWidth, 0],
          [progWidth, s5.height],
          [0, s5.height]
        ], this.seed);
        this.svg.appendChild(this.progBox);
        this.progBox.classList.add("progbox");
      }
    }
  }
};
__decorate15([
  n5({ type: Number }),
  __metadata15("design:type", Object)
], WiredProgress.prototype, "value", void 0);
__decorate15([
  n5({ type: Number }),
  __metadata15("design:type", Object)
], WiredProgress.prototype, "min", void 0);
__decorate15([
  n5({ type: Number }),
  __metadata15("design:type", Object)
], WiredProgress.prototype, "max", void 0);
__decorate15([
  n5({ type: Boolean }),
  __metadata15("design:type", Object)
], WiredProgress.prototype, "percentage", void 0);
WiredProgress = __decorate15([
  e4("wired-progress")
], WiredProgress);

// node_modules/wired-elements/lib/wired-radio.js
var __decorate16 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata16 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredRadio = class WiredRadio2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.checked = false;
    this.disabled = false;
    this.focused = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        font-family: inherit;
      }
      :host([disabled]) {
        opacity: 0.6 !important;
        cursor: default;
        pointer-events: none;
      }
      :host([disabled]) svg {
        background: rgba(0, 0, 0, 0.07);
      }

      #container {
        display: flex;
        flex-direction: row;
        position: relative;
        user-select: none;
        min-height: 24px;
        cursor: pointer;
      }
      span {
        margin-left: 1.5ex;
        line-height: 24px;
      }
      input {
        opacity: 0;
      }
      path {
        stroke: var(--wired-radio-icon-color, currentColor);
        stroke-width: var(--wired-radio-default-swidth, 0.7);
      }
      g path {
        stroke-width: 0;
        fill: var(--wired-radio-icon-color, currentColor);
      }
      #container.focused {
        --wired-radio-default-swidth: 1.5;
      }
      `
    ];
  }
  focus() {
    if (this.input) {
      this.input.focus();
    } else {
      super.focus();
    }
  }
  wiredRender(force = false) {
    super.wiredRender(force);
    this.refreshCheckVisibility();
  }
  render() {
    return x`
    <label id="container" class="${this.focused ? "focused" : ""}">
      <input type="checkbox" .checked="${this.checked}" ?disabled="${this.disabled}" 
        @change="${this.onChange}"
        @focus="${() => this.focused = true}"
        @blur="${() => this.focused = false}">
      <span><slot></slot></span>
      <div id="overlay"><svg></svg></div>
    </label>
    `;
  }
  onChange() {
    this.checked = this.input.checked;
    this.refreshCheckVisibility();
    this.fire("change", { checked: this.checked });
  }
  canvasSize() {
    return [24, 24];
  }
  draw(svg, size) {
    ellipse2(svg, size[0] / 2, size[1] / 2, size[0], size[1], this.seed);
    this.svgCheck = svgNode("g");
    svg.appendChild(this.svgCheck);
    const iw = Math.max(size[0] * 0.6, 5);
    const ih = Math.max(size[1] * 0.6, 5);
    ellipse2(this.svgCheck, size[0] / 2, size[1] / 2, iw, ih, this.seed);
  }
  refreshCheckVisibility() {
    if (this.svgCheck) {
      this.svgCheck.style.display = this.checked ? "" : "none";
    }
  }
};
__decorate16([
  n5({ type: Boolean }),
  __metadata16("design:type", Object)
], WiredRadio.prototype, "checked", void 0);
__decorate16([
  n5({ type: Boolean, reflect: true }),
  __metadata16("design:type", Object)
], WiredRadio.prototype, "disabled", void 0);
__decorate16([
  n5({ type: String }),
  __metadata16("design:type", String)
], WiredRadio.prototype, "name", void 0);
__decorate16([
  n5(),
  __metadata16("design:type", Object)
], WiredRadio.prototype, "focused", void 0);
__decorate16([
  i4("input"),
  __metadata16("design:type", HTMLInputElement)
], WiredRadio.prototype, "input", void 0);
WiredRadio = __decorate16([
  e4("wired-radio")
], WiredRadio);

// node_modules/wired-elements/lib/wired-radio-group.js
var __decorate17 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata17 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredRadioGroup = class WiredRadioGroup2 extends s4 {
  constructor() {
    super(...arguments);
    this.radioNodes = [];
    this.checkListener = this.handleChecked.bind(this);
  }
  static get styles() {
    return i`
      :host {
        display: inline-block;
        font-family: inherit;
        outline: none;
      }
      :host ::slotted(*) {
        padding: var(--wired-radio-group-item-padding, 5px);
      }
    `;
  }
  render() {
    return x`<slot id="slot" @slotchange="${this.slotChange}"></slot>`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("change", this.checkListener);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("change", this.checkListener);
  }
  handleChecked(event) {
    const checked = event.detail.checked;
    const item = event.target;
    const name = item.name || "";
    if (!checked) {
      item.checked = true;
    } else {
      this.selected = checked && name || "";
      this.fireSelected();
    }
  }
  slotChange() {
    this.requestUpdate();
  }
  firstUpdated() {
    this.setAttribute("role", "radiogroup");
    this.tabIndex = +(this.getAttribute("tabindex") || 0);
    this.addEventListener("keydown", (event) => {
      switch (event.keyCode) {
        case 37:
        case 38:
          event.preventDefault();
          this.selectPrevious();
          break;
        case 39:
        case 40:
          event.preventDefault();
          this.selectNext();
          break;
      }
    });
  }
  updated() {
    const slot = this.shadowRoot.getElementById("slot");
    const nodes = slot.assignedNodes();
    this.radioNodes = [];
    if (nodes && nodes.length) {
      for (let i5 = 0; i5 < nodes.length; i5++) {
        const element = nodes[i5];
        if (element.tagName === "WIRED-RADIO") {
          this.radioNodes.push(element);
          const name = element.name || "";
          if (this.selected && name === this.selected) {
            element.checked = true;
          } else {
            element.checked = false;
          }
        }
      }
    }
  }
  selectPrevious() {
    const list = this.radioNodes;
    if (list.length) {
      let radio = null;
      let index = -1;
      if (this.selected) {
        for (let i5 = 0; i5 < list.length; i5++) {
          const n7 = list[i5];
          if (n7.name === this.selected) {
            index = i5;
            break;
          }
        }
        if (index < 0) {
          radio = list[0];
        } else {
          index--;
          if (index < 0) {
            index = list.length - 1;
          }
          radio = list[index];
        }
      } else {
        radio = list[0];
      }
      if (radio) {
        radio.focus();
        this.selected = radio.name;
        this.fireSelected();
      }
    }
  }
  selectNext() {
    const list = this.radioNodes;
    if (list.length) {
      let radio = null;
      let index = -1;
      if (this.selected) {
        for (let i5 = 0; i5 < list.length; i5++) {
          const n7 = list[i5];
          if (n7.name === this.selected) {
            index = i5;
            break;
          }
        }
        if (index < 0) {
          radio = list[0];
        } else {
          index++;
          if (index >= list.length) {
            index = 0;
          }
          radio = list[index];
        }
      } else {
        radio = list[0];
      }
      if (radio) {
        radio.focus();
        this.selected = radio.name;
        this.fireSelected();
      }
    }
  }
  fireSelected() {
    fireEvent(this, "selected", { selected: this.selected });
  }
};
__decorate17([
  n5({ type: String }),
  __metadata17("design:type", String)
], WiredRadioGroup.prototype, "selected", void 0);
WiredRadioGroup = __decorate17([
  e4("wired-radio-group")
], WiredRadioGroup);

// node_modules/wired-elements/lib/wired-search-input.js
var __decorate18 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata18 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredSearchInput = class WiredSearchInput2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.placeholder = "";
    this.autocomplete = "";
    this.autocorrect = "";
    this.autofocus = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          padding: 10px 40px 10px 5px;
          font-family: sans-serif;
          width: 180px;
          outline: none;
        }
        :host([disabled]) {
          opacity: 0.6 !important;
          cursor: default;
          pointer-events: none;
        }
        :host([disabled]) svg {
          background: rgba(0, 0, 0, 0.07);
        }
        input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          border: none;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          color: inherit;
          padding: 6px;
        }
        
        input[type=search]::-ms-clear {  display: none; width : 0; height: 0; }
        input[type=search]::-ms-reveal {  display: none; width : 0; height: 0; }
        input[type="search"]::-webkit-search-decoration,
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-results-button,
        input[type="search"]::-webkit-search-results-decoration {
          display: none;
        }

        .thicker path {
          stroke-width: 1.5;
        }

        button {
          position: absolute;
          top: 0;
          right: 2px;
          width: 32px;
          height: 100%;
          box-sizing: border-box;
          background: none;
          border: none;
          cursor: pointer;
          outline: none;
          opacity: 0;
        }
      `
    ];
  }
  render() {
    return x`
    <input type="search" placeholder="${this.placeholder}" ?disabled="${this.disabled}"
      autocomplete="${this.autocomplete}" ?autofocus="${this.autofocus}" 
      autocapitalize="${this.autocapitalize}" autocorrect="${this.autocorrect}" 
      @change="${this.refire}" @input="${this.refire}">
    <div id="overlay">
      <svg></svg>
    </div>
    <button @click="${() => this.value = ""}"></button>
    `;
  }
  get input() {
    return this.textInput;
  }
  get value() {
    const input = this.input;
    return input && input.value || "";
  }
  set value(v2) {
    if (this.shadowRoot) {
      const input = this.input;
      if (input) {
        input.value = v2;
      }
      this.refreshIconState();
    } else {
      this.pendingValue = v2;
    }
  }
  wiredRender(force = false) {
    super.wiredRender(force);
    this.refreshIconState();
  }
  firstUpdated() {
    this.value = this.pendingValue || this.value || this.getAttribute("value") || "";
    delete this.pendingValue;
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    rectangle2(svg, 2, 2, size[0] - 2, size[1] - 2, this.seed);
    this.searchIcon = svgNode("g");
    this.searchIcon.classList.add("thicker");
    svg.appendChild(this.searchIcon);
    ellipse2(this.searchIcon, size[0] - 30, (size[1] - 30) / 2 + 10, 20, 20, this.seed);
    line2(this.searchIcon, size[0] - 10, (size[1] - 30) / 2 + 30, size[0] - 25, (size[1] - 30) / 2 + 15, this.seed);
    this.closeIcon = svgNode("g");
    this.closeIcon.classList.add("thicker");
    svg.appendChild(this.closeIcon);
    line2(this.closeIcon, size[0] - 33, (size[1] - 30) / 2 + 2, size[0] - 7, (size[1] - 30) / 2 + 28, this.seed);
    line2(this.closeIcon, size[0] - 7, (size[1] - 30) / 2 + 2, size[0] - 33, (size[1] - 30) / 2 + 28, this.seed);
  }
  refreshIconState() {
    if (this.searchIcon && this.closeIcon) {
      this.searchIcon.style.display = this.value.trim() ? "none" : "";
      this.closeIcon.style.display = this.value.trim() ? "" : "none";
    }
  }
  refire(event) {
    this.refreshIconState();
    event.stopPropagation();
    this.fire(event.type, { sourceEvent: event });
  }
};
__decorate18([
  n5({ type: Boolean, reflect: true }),
  __metadata18("design:type", Object)
], WiredSearchInput.prototype, "disabled", void 0);
__decorate18([
  n5({ type: String }),
  __metadata18("design:type", Object)
], WiredSearchInput.prototype, "placeholder", void 0);
__decorate18([
  n5({ type: String }),
  __metadata18("design:type", Object)
], WiredSearchInput.prototype, "autocomplete", void 0);
__decorate18([
  n5({ type: String }),
  __metadata18("design:type", Object)
], WiredSearchInput.prototype, "autocorrect", void 0);
__decorate18([
  n5({ type: Boolean }),
  __metadata18("design:type", Object)
], WiredSearchInput.prototype, "autofocus", void 0);
__decorate18([
  i4("input"),
  __metadata18("design:type", HTMLInputElement)
], WiredSearchInput.prototype, "textInput", void 0);
WiredSearchInput = __decorate18([
  e4("wired-search-input")
], WiredSearchInput);

// node_modules/wired-elements/lib/wired-slider.js
var __decorate19 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata19 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredSlider = class WiredSlider2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.disabled = false;
    this.canvasWidth = 300;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        position: relative;
        width: 300px;
        box-sizing: border-box;
      }
      :host([disabled]) {
        opacity: 0.45 !important;
        cursor: default;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.07);
        border-radius: 5px;
      }
      input[type=range] {
        width: 100%;
        height: 40px;
        box-sizing: border-box;
        margin: 0;
        -webkit-appearance: none;
        background: transparent;
        outline: none;
        position: relative;
      }
      input[type=range]:focus {
        outline: none;
      }
      input[type=range]::-ms-track {
        width: 100%;
        cursor: pointer;
        background: transparent;
        border-color: transparent;
        color: transparent;
      }
      input[type=range]::-moz-focus-outer {
        outline: none;
        border: 0;
      }
      input[type=range]::-moz-range-thumb {
        border-radius: 50px;
        background: none;
        cursor: pointer;
        border: none;
        margin: 0;
        height: 20px;
        width: 20px;
        line-height: 1;
      }
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        border-radius: 50px;
        background: none;
        cursor: pointer;
        border: none;
        height: 20px;
        width: 20px;
        margin: 0;
        line-height: 1;
      }
      .knob{
        fill: var(--wired-slider-knob-color, rgb(51, 103, 214));
        stroke: var(--wired-slider-knob-color, rgb(51, 103, 214));
      }
      .bar {
        stroke: var(--wired-slider-bar-color, rgb(0, 0, 0));
      }
      input:focus + div svg .knob {
        stroke: var(--wired-slider-knob-outline-color, #000);
        fill-opacity: 0.8;
      }
      `
    ];
  }
  get value() {
    if (this.input) {
      return +this.input.value;
    }
    return this.min;
  }
  set value(v2) {
    if (this.input) {
      this.input.value = `${v2}`;
    } else {
      this.pendingValue = v2;
    }
    this.updateThumbPosition();
  }
  firstUpdated() {
    this.value = this.pendingValue || +(this.getAttribute("value") || this.value || this.min);
    delete this.pendingValue;
  }
  render() {
    return x`
    <div id="container">
      <input type="range" 
        min="${this.min}"
        max="${this.max}"
        step="${this.step}"
        ?disabled="${this.disabled}"
        @input="${this.onInput}">
      <div id="overlay">
        <svg></svg>
      </div>
    </div>
    `;
  }
  focus() {
    if (this.input) {
      this.input.focus();
    } else {
      super.focus();
    }
  }
  onInput(e7) {
    e7.stopPropagation();
    this.updateThumbPosition();
    if (this.input) {
      this.fire("change", { value: +this.input.value });
    }
  }
  wiredRender(force = false) {
    super.wiredRender(force);
    this.updateThumbPosition();
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    this.canvasWidth = size[0];
    const midY = Math.round(size[1] / 2);
    line2(svg, 0, midY, size[0], midY, this.seed).classList.add("bar");
    this.knob = ellipse2(svg, 10, midY, 20, 20, this.seed);
    this.knob.classList.add("knob");
  }
  updateThumbPosition() {
    if (this.input) {
      const value = +this.input.value;
      const delta = Math.max(this.step, this.max - this.min);
      const pct = (value - this.min) / delta;
      if (this.knob) {
        this.knob.style.transform = `translateX(${pct * (this.canvasWidth - 20)}px)`;
      }
    }
  }
};
__decorate19([
  n5({ type: Number }),
  __metadata19("design:type", Object)
], WiredSlider.prototype, "min", void 0);
__decorate19([
  n5({ type: Number }),
  __metadata19("design:type", Object)
], WiredSlider.prototype, "max", void 0);
__decorate19([
  n5({ type: Number }),
  __metadata19("design:type", Object)
], WiredSlider.prototype, "step", void 0);
__decorate19([
  n5({ type: Boolean, reflect: true }),
  __metadata19("design:type", Object)
], WiredSlider.prototype, "disabled", void 0);
__decorate19([
  i4("input"),
  __metadata19("design:type", HTMLInputElement)
], WiredSlider.prototype, "input", void 0);
WiredSlider = __decorate19([
  e4("wired-slider")
], WiredSlider);

// node_modules/wired-elements/lib/wired-spinner.js
var __decorate20 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata20 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredSpinner = class WiredSpinner2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.spinning = false;
    this.duration = 1500;
    this.value = 0;
    this.timerstart = 0;
    this.frame = 0;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
        }
        path {
          stroke: currentColor;
          stroke-opacity: 0.65;
          stroke-width: 1.5;
          fill: none;
        }
        .knob {
          stroke-width: 2.8 !important;
          stroke-opacity: 1;
        }
      `
    ];
  }
  render() {
    return x`<svg></svg>`;
  }
  canvasSize() {
    return [76, 76];
  }
  draw(svg, size) {
    ellipse2(svg, size[0] / 2, size[1] / 2, Math.floor(size[0] * 0.8), Math.floor(0.8 * size[1]), this.seed);
    this.knob = hachureEllipseFill(0, 0, 20, 20, this.seed);
    this.knob.classList.add("knob");
    svg.appendChild(this.knob);
    this.updateCursor();
  }
  updateCursor() {
    if (this.knob) {
      const position = [
        Math.round(38 + 25 * Math.cos(this.value * Math.PI * 2)),
        Math.round(38 + 25 * Math.sin(this.value * Math.PI * 2))
      ];
      this.knob.style.transform = `translate3d(${position[0]}px, ${position[1]}px, 0) rotateZ(${Math.round(this.value * 360 * 2)}deg)`;
    }
  }
  updated() {
    super.updated();
    if (this.spinning) {
      this.startSpinner();
    } else {
      this.stopSpinner();
    }
  }
  startSpinner() {
    this.stopSpinner();
    this.value = 0;
    this.timerstart = 0;
    this.nextTick();
  }
  stopSpinner() {
    if (this.frame) {
      window.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }
  nextTick() {
    this.frame = window.requestAnimationFrame((t4) => this.tick(t4));
  }
  tick(t4) {
    if (this.spinning) {
      if (!this.timerstart) {
        this.timerstart = t4;
      }
      this.value = Math.min(1, (t4 - this.timerstart) / this.duration);
      this.updateCursor();
      if (this.value >= 1) {
        this.value = 0;
        this.timerstart = 0;
      }
      this.nextTick();
    } else {
      this.frame = 0;
    }
  }
};
__decorate20([
  n5({ type: Boolean }),
  __metadata20("design:type", Object)
], WiredSpinner.prototype, "spinning", void 0);
__decorate20([
  n5({ type: Number }),
  __metadata20("design:type", Object)
], WiredSpinner.prototype, "duration", void 0);
WiredSpinner = __decorate20([
  e4("wired-spinner")
], WiredSpinner);

// node_modules/wired-elements/lib/wired-tab.js
var __decorate21 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata21 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredTab = class WiredTab2 extends WiredBase {
  constructor() {
    super();
    this.name = "";
    this.label = "";
    if (window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => {
        if (this.svg) {
          this.wiredRender();
        }
      });
    }
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          padding: 10px;
        }
      `
    ];
  }
  render() {
    return x`
    <div>
      <slot @slotchange="${this.wiredRender}"></slot>
    </div>
    <div id="overlay"><svg></svg></div>
    `;
  }
  updated() {
    super.updated();
    this.attachResizeListener();
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (this.resizeObserver && this.resizeObserver.observe) {
      this.resizeObserver.observe(this);
    } else if (!this.windowResizeHandler) {
      this.windowResizeHandler = () => this.wiredRender();
      window.addEventListener("resize", this.windowResizeHandler, { passive: true });
    }
  }
  detachResizeListener() {
    if (this.resizeObserver && this.resizeObserver.unobserve) {
      this.resizeObserver.unobserve(this);
    }
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, s5) {
    rectangle2(svg, 2, 2, s5[0] - 4, s5[1] - 4, this.seed);
  }
};
__decorate21([
  n5({ type: String }),
  __metadata21("design:type", Object)
], WiredTab.prototype, "name", void 0);
__decorate21([
  n5({ type: String }),
  __metadata21("design:type", Object)
], WiredTab.prototype, "label", void 0);
WiredTab = __decorate21([
  e4("wired-tab"),
  __metadata21("design:paramtypes", [])
], WiredTab);

// node_modules/wired-elements/lib/wired-tabs.js
var __decorate22 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata22 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredTabs = class WiredTabs2 extends s4 {
  constructor() {
    super(...arguments);
    this.pages = [];
    this.pageMap = /* @__PURE__ */ new Map();
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: block;
          opacity: 1;
        }
        ::slotted(.hidden) {
          display: none !important;
        }
    
        :host ::slotted(.hidden) {
          display: none !important;
        }
        #bar {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
        }
      `
    ];
  }
  render() {
    return x`
    <div id="bar">
      ${this.pages.map((p2) => x`
      <wired-item role="tab" .value="${p2.name}" .selected="${p2.name === this.selected}" ?aria-selected="${p2.name === this.selected}"
        @click="${() => this.selected = p2.name}">${p2.label || p2.name}</wired-item>
      `)}
    </div>
    <div>
      <slot @slotchange="${this.mapPages}"></slot>
    </div>
    `;
  }
  mapPages() {
    this.pages = [];
    this.pageMap.clear();
    if (this.slotElement) {
      const assigned = this.slotElement.assignedNodes();
      if (assigned && assigned.length) {
        for (let i5 = 0; i5 < assigned.length; i5++) {
          const n7 = assigned[i5];
          if (n7.nodeType === Node.ELEMENT_NODE && n7.tagName.toLowerCase() === "wired-tab") {
            const e7 = n7;
            this.pages.push(e7);
            const name = e7.getAttribute("name") || "";
            if (name) {
              name.trim().split(" ").forEach((nameSegment) => {
                if (nameSegment) {
                  this.pageMap.set(nameSegment, e7);
                }
              });
            }
          }
        }
        if (!this.selected) {
          if (this.pages.length) {
            this.selected = this.pages[0].name;
          }
        }
        this.requestUpdate();
      }
    }
  }
  firstUpdated() {
    this.mapPages();
    this.tabIndex = +(this.getAttribute("tabindex") || 0);
    this.addEventListener("keydown", (event) => {
      switch (event.keyCode) {
        case 37:
        case 38:
          event.preventDefault();
          this.selectPrevious();
          break;
        case 39:
        case 40:
          event.preventDefault();
          this.selectNext();
          break;
      }
    });
  }
  updated() {
    const newPage = this.getElement();
    for (let i5 = 0; i5 < this.pages.length; i5++) {
      const p2 = this.pages[i5];
      if (p2 === newPage) {
        p2.classList.remove("hidden");
      } else {
        p2.classList.add("hidden");
      }
    }
    this.current = newPage || void 0;
    if (this.current && this.current.wiredRender) {
      requestAnimationFrame(() => requestAnimationFrame(() => this.current.wiredRender()));
    }
  }
  getElement() {
    let e7 = void 0;
    if (this.selected) {
      e7 = this.pageMap.get(this.selected);
    }
    if (!e7) {
      e7 = this.pages[0];
    }
    return e7 || null;
  }
  selectPrevious() {
    const list = this.pages;
    if (list.length) {
      let index = -1;
      for (let i5 = 0; i5 < list.length; i5++) {
        if (list[i5] === this.current) {
          index = i5;
          break;
        }
      }
      if (index < 0) {
        index = 0;
      } else if (index === 0) {
        index = list.length - 1;
      } else {
        index--;
      }
      this.selected = list[index].name || "";
    }
  }
  selectNext() {
    const list = this.pages;
    if (list.length) {
      let index = -1;
      for (let i5 = 0; i5 < list.length; i5++) {
        if (list[i5] === this.current) {
          index = i5;
          break;
        }
      }
      if (index < 0) {
        index = 0;
      } else if (index >= list.length - 1) {
        index = 0;
      } else {
        index++;
      }
      this.selected = list[index].name || "";
    }
  }
};
__decorate22([
  n5({ type: String }),
  __metadata22("design:type", String)
], WiredTabs.prototype, "selected", void 0);
__decorate22([
  i4("slot"),
  __metadata22("design:type", HTMLSlotElement)
], WiredTabs.prototype, "slotElement", void 0);
WiredTabs = __decorate22([
  e4("wired-tabs")
], WiredTabs);

// node_modules/wired-elements/lib/wired-textarea.js
var __decorate23 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata23 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredTextarea = class WiredTextarea2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.rows = 2;
    this.maxrows = 0;
    this.autocomplete = "";
    this.autofocus = false;
    this.inputmode = "";
    this.placeholder = "";
    this.required = false;
    this.readonly = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          font-family: sans-serif;
          width: 400px;
          outline: none;
          padding: 4px;
        }
        :host([disabled]) {
          opacity: 0.6 !important;
          cursor: default;
          pointer-events: none;
        }
        :host([disabled]) svg {
          background: rgba(0, 0, 0, 0.07);
        }
        textarea {
          position: relative;
          outline: none;
          border: none;
          resize: none;
          background: inherit;
          color: inherit;
          width: 100%;
          font-size: inherit;
          font-family: inherit;
          line-height: inherit;
          text-align: inherit;
          padding: 10px;
          box-sizing: border-box;
        }
      `
    ];
  }
  render() {
    return x`
    <textarea id="textarea" autocomplete="${this.autocomplete}" ?autofocus="${this.autofocus}" inputmode="${this.inputmode}"
      placeholder="${this.placeholder}" ?readonly="${this.readonly}" ?required="${this.required}" ?disabled="${this.disabled}"
      rows="${this.rows}" minlength="${this.minlength}" maxlength="${this.maxlength}"
      @change="${this.refire}" @input="${this.refire}"></textarea>
    <div id="overlay">
      <svg></svg>
    </div>
    `;
  }
  get textarea() {
    return this.textareaInput;
  }
  get value() {
    const input = this.textarea;
    return input && input.value || "";
  }
  set value(v2) {
    if (this.shadowRoot) {
      const input = this.textarea;
      if (input) {
        input.value = v2;
        return;
      }
    }
    this.pendingValue = v2;
  }
  firstUpdated() {
    this.value = this.pendingValue || this.value || this.getAttribute("value") || "";
    delete this.pendingValue;
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    rectangle2(svg, 4, 4, size[0] - 4, size[1] - 4, this.seed);
  }
  refire(event) {
    event.stopPropagation();
    this.fire(event.type, { sourceEvent: event });
  }
};
__decorate23([
  n5({ type: Boolean, reflect: true }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "disabled", void 0);
__decorate23([
  n5({ type: Number }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "rows", void 0);
__decorate23([
  n5({ type: Number }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "maxrows", void 0);
__decorate23([
  n5({ type: String }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "autocomplete", void 0);
__decorate23([
  n5({ type: Boolean }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "autofocus", void 0);
__decorate23([
  n5({ type: String }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "inputmode", void 0);
__decorate23([
  n5({ type: String }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "placeholder", void 0);
__decorate23([
  n5({ type: Boolean }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "required", void 0);
__decorate23([
  n5({ type: Boolean }),
  __metadata23("design:type", Object)
], WiredTextarea.prototype, "readonly", void 0);
__decorate23([
  n5({ type: Number }),
  __metadata23("design:type", Number)
], WiredTextarea.prototype, "minlength", void 0);
__decorate23([
  n5({ type: Number }),
  __metadata23("design:type", Number)
], WiredTextarea.prototype, "maxlength", void 0);
__decorate23([
  i4("textarea"),
  __metadata23("design:type", HTMLTextAreaElement)
], WiredTextarea.prototype, "textareaInput", void 0);
WiredTextarea = __decorate23([
  e4("wired-textarea")
], WiredTextarea);

// node_modules/wired-elements/lib/wired-toggle.js
var __decorate24 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata24 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredToggle = class WiredToggle2 extends WiredBase {
  constructor() {
    super(...arguments);
    this.checked = false;
    this.disabled = false;
  }
  static get styles() {
    return [
      BaseCSS,
      i`
      :host {
        display: inline-block;
        cursor: pointer;
        position: relative;
        outline: none;
      }
      :host([disabled]) {
        opacity: 0.4 !important;
        cursor: default;
        pointer-events: none;
      }
      :host([disabled]) svg {
        background: rgba(0, 0, 0, 0.07);
      }
      input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        cursor: pointer;
        opacity: 0;
      }
      .knob {
        transition: transform 0.3s ease;
      }
      .knob path {
        stroke-width: 0.7;
      }
      .knob.checked {
        transform: translateX(48px);
      }
      path.knobfill {
        stroke-width: 3 !important;
        fill: transparent;
      }
      .knob.unchecked path.knobfill {
        stroke: var(--wired-toggle-off-color, gray);
      }
      .knob.checked path.knobfill {
        stroke: var(--wired-toggle-on-color, rgb(63, 81, 181));
      }
      `
    ];
  }
  render() {
    return x`
    <div style="position: relative;">
      <svg></svg>
      <input type="checkbox" .checked="${this.checked}" ?disabled="${this.disabled}"  @change="${this.onChange}">
    </div>
    `;
  }
  focus() {
    if (this.input) {
      this.input.focus();
    } else {
      super.focus();
    }
  }
  wiredRender(force = false) {
    super.wiredRender(force);
    this.refreshKnob();
  }
  onChange() {
    this.checked = this.input.checked;
    this.refreshKnob();
    this.fire("change", { checked: this.checked });
  }
  canvasSize() {
    return [80, 34];
  }
  draw(svg, size) {
    const rect = rectangle2(svg, 16, 8, size[0] - 32, 18, this.seed);
    rect.classList.add("toggle-bar");
    this.knob = svgNode("g");
    this.knob.classList.add("knob");
    svg.appendChild(this.knob);
    const knobFill = hachureEllipseFill(16, 16, 32, 32, this.seed);
    knobFill.classList.add("knobfill");
    this.knob.appendChild(knobFill);
    ellipse2(this.knob, 16, 16, 32, 32, this.seed);
  }
  refreshKnob() {
    if (this.knob) {
      const cl = this.knob.classList;
      if (this.checked) {
        cl.remove("unchecked");
        cl.add("checked");
      } else {
        cl.remove("checked");
        cl.add("unchecked");
      }
    }
  }
};
__decorate24([
  n5({ type: Boolean }),
  __metadata24("design:type", Object)
], WiredToggle.prototype, "checked", void 0);
__decorate24([
  n5({ type: Boolean, reflect: true }),
  __metadata24("design:type", Object)
], WiredToggle.prototype, "disabled", void 0);
__decorate24([
  i4("input"),
  __metadata24("design:type", HTMLInputElement)
], WiredToggle.prototype, "input", void 0);
WiredToggle = __decorate24([
  e4("wired-toggle")
], WiredToggle);

// node_modules/wired-elements/lib/wired-video.js
var __decorate25 = function(decorators, target, key, desc) {
  var c3 = arguments.length, r4 = c3 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r4 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r4 = (c3 < 3 ? d3(r4) : c3 > 3 ? d3(target, key, r4) : d3(target, key)) || r4;
  return c3 > 3 && r4 && Object.defineProperty(target, key, r4), r4;
};
var __metadata25 = function(k2, v2) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k2, v2);
};
var WiredVideo = class WiredVideo2 extends WiredBase {
  constructor() {
    super();
    this.src = "";
    this.autoplay = false;
    this.loop = false;
    this.muted = false;
    this.playsinline = false;
    this.playing = false;
    this.timeDisplay = "";
    if (window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => {
        if (this.svg) {
          this.wiredRender();
        }
      });
    }
  }
  static get styles() {
    return [
      BaseCSS,
      i`
        :host {
          display: inline-block;
          position: relative;
          line-height: 1;
          padding: 3px 3px 68px;
          --wired-progress-color: var(--wired-video-highlight-color, rgb(51, 103, 214));
          --wired-slider-knob-color: var(--wired-video-highlight-color, rgb(51, 103, 214));
        }
        video {
          display: block;
          box-sizing: border-box;
          max-width: 100%;
          max-height: 100%;
        }
        path {
          stroke-width: 1;
        }
        #controls {
          position: absolute;
          pointer-events: auto;
          left: 0;
          bottom: 0;
          width: 100%;
          box-sizing: border-box;
          height: 70px;
        }
        .layout.horizontal {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          padding: 5px 10px;
        }
        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }
        wired-progress {
          display: block;
          width: 100%;
          box-sizing: border-box;
          height: 20px;
          --wired-progress-label-color: transparent;
          --wired-progress-label-background: transparent;
        }
        wired-icon-button span {
          font-size: 16px;
          line-height: 16px;
          width: 16px;
          height: 16px;
          padding: 0px;
          font-family: sans-serif;
          display: inline-block;
        }
        #timeDisplay {
          padding: 0 20px 0 8px;
          font-size: 13px;
        }
        wired-slider {
          display: block;
          max-width: 200px;
          margin: 0 6px 0 auto;
        }
      `
    ];
  }
  render() {
    return x`
    <video 
      .autoplay="${this.autoplay}"
      .loop="${this.loop}"
      .muted="${this.muted}"
      .playsinline="${this.playsinline}"
      src="${this.src}"
      @play="${() => this.playing = true}"
      @pause="${() => this.playing = false}"
      @canplay="${this.canPlay}"
      @timeupdate="${this.updateTime}">
    </video>
    <div id="overlay">
      <svg></svg>
    </div>
    <div id="controls">
      <wired-progress></wired-progress>
      <div class="horizontal layout center">
        <wired-icon-button @click="${this.togglePause}">
          <span>${this.playing ? "||" : "\u25B6"}</span>
        </wired-icon-button>
        <div id="timeDisplay">${this.timeDisplay}</div>
        <div class="flex">
          <wired-slider @change="${this.volumeChange}"></wired-slider>
        </div>
        <div style="width: 24px; height: 24px;">
          <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;"><g><path style="stroke: none; fill: currentColor;" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></g></svg>
        </div>
      </div>
    </div>
    `;
  }
  updated() {
    super.updated();
    this.attachResizeListener();
  }
  disconnectedCallback() {
    this.detachResizeListener();
  }
  attachResizeListener() {
    if (this.resizeObserver && this.resizeObserver.observe) {
      this.resizeObserver.observe(this);
    } else if (!this.windowResizeHandler) {
      this.windowResizeHandler = () => this.wiredRender();
      window.addEventListener("resize", this.windowResizeHandler, { passive: true });
    }
  }
  detachResizeListener() {
    if (this.resizeObserver && this.resizeObserver.unobserve) {
      this.resizeObserver.unobserve(this);
    }
    if (this.windowResizeHandler) {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
  }
  wiredRender() {
    super.wiredRender();
    if (this.progressBar) {
      this.progressBar.wiredRender(true);
    }
  }
  canvasSize() {
    const s5 = this.getBoundingClientRect();
    return [s5.width, s5.height];
  }
  draw(svg, size) {
    rectangle2(svg, 2, 2, size[0] - 4, size[1] - 4, this.seed);
  }
  updateTime() {
    if (this.video && this.progressBar) {
      this.progressBar.value = this.video.duration ? Math.round(this.video.currentTime / this.video.duration * 100) : 0;
      this.timeDisplay = `${this.getTimeDisplay(this.video.currentTime)} / ${this.getTimeDisplay(this.video.duration)}`;
    }
  }
  getTimeDisplay(time) {
    const mins = Math.floor(time / 60);
    const secs = Math.round(time - mins * 60);
    return `${mins}:${secs}`;
  }
  togglePause() {
    if (this.video) {
      if (this.playing) {
        this.video.pause();
      } else {
        this.video.play();
      }
    }
  }
  volumeChange() {
    if (this.video && this.slider) {
      this.video.volume = this.slider.value / 100;
    }
  }
  canPlay() {
    if (this.slider && this.video) {
      this.slider.value = this.video.volume * 100;
    }
  }
};
__decorate25([
  n5({ type: String }),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "src", void 0);
__decorate25([
  n5({ type: Boolean }),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "autoplay", void 0);
__decorate25([
  n5({ type: Boolean }),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "loop", void 0);
__decorate25([
  n5({ type: Boolean }),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "muted", void 0);
__decorate25([
  n5({ type: Boolean }),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "playsinline", void 0);
__decorate25([
  n5(),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "playing", void 0);
__decorate25([
  n5(),
  __metadata25("design:type", Object)
], WiredVideo.prototype, "timeDisplay", void 0);
__decorate25([
  i4("wired-progress"),
  __metadata25("design:type", WiredProgress)
], WiredVideo.prototype, "progressBar", void 0);
__decorate25([
  i4("wired-slider"),
  __metadata25("design:type", WiredSlider)
], WiredVideo.prototype, "slider", void 0);
__decorate25([
  i4("video"),
  __metadata25("design:type", HTMLVideoElement)
], WiredVideo.prototype, "video", void 0);
WiredVideo = __decorate25([
  e4("wired-video"),
  __metadata25("design:paramtypes", [])
], WiredVideo);
export {
  WiredButton,
  WiredCard,
  WiredCheckbox,
  WiredCombo,
  WiredDialog,
  WiredDivider,
  WiredFab,
  WiredIconButton,
  WiredImage,
  WiredInput,
  WiredItem,
  WiredLink,
  WiredListbox,
  WiredProgress,
  WiredRadio,
  WiredRadioGroup,
  WiredSearchInput,
  WiredSlider,
  WiredSpinner,
  WiredTab,
  WiredTabs,
  WiredTextarea,
  WiredToggle,
  WiredVideo
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/

import * as cheerio from 'cheerio'
import { parseNumber } from './utils'

export interface HLTVPage extends cheerio.Root {
  (selector: string): HLTVPageElement
}

export interface HLTVPageElement {
  length: number

  trimText(): string | undefined
  numFromAttr(attr: string): number | undefined
  numFromText(): number | undefined
  lines(): string[]
  exists(): boolean
  find(selector: string): HLTVPageElement
  attr(attr: string): string
  text(): string
  html(): string
  textThen<T>(then: (value: string) => T): T
  first(): HLTVPageElement
  second(): HLTVPageElement
  last(): HLTVPageElement
  toArray(): HLTVPageElement[]
  each(func: (index: number, element: HLTVPageElement) => void): HLTVPageElement
  data(name: string): any
  attrThen<T>(attr: string, then: (value: string) => T): T
  next(selector?: string): HLTVPageElement
  eq(index: number): HLTVPageElement
  parent(): HLTVPageElement
  children(selector?: string): HLTVPageElement
  prev(selector?: string): HLTVPageElement
  contents(): HLTVPageElement
  index(): number
  filter(
    func: (index: number, element: HLTVPageElement) => boolean
  ): HLTVPageElement
}

const attachMethods = (root: cheerio.Cheerio): HLTVPageElement => {
  return {
    length: root.length,

    find(selector: string): HLTVPageElement {
      return attachMethods(root.find(selector))
    },

    attr(attr: string): string {
      return root.attr(attr)!
    },

    attrThen<T>(attr: string, then: (value: string) => T): T {
      return then(root.attr(attr)!)
    },

    text(): string {
      return root.text()
    },

    html(): string {
      return root.html()!
    },

    textThen<T>(then: (value: string) => T): T {
      return then(root.text())
    },

    first(): HLTVPageElement {
      return attachMethods(root.first())
    },

    second(): HLTVPageElement {
      return attachMethods(root.eq(1))
    },

    last(): HLTVPageElement {
      return attachMethods(root.last())
    },

    data(name: string): any {
      return root.data(name)
    },

    trimText(): string | undefined {
      return root.text().trim() || undefined
    },

    numFromAttr(attr: string): number | undefined {
      return parseNumber(root.attr(attr))
    },

    numFromText(): number | undefined {
      return parseNumber(root.text())
    },

    lines(): string[] {
      return root.text().split('\n')
    },

    exists(): boolean {
      return root.length !== 0
    },

    toArray(): HLTVPageElement[] {
      return root.toArray().map((el) => attachMethods(cheerio.load(el)(el)))
    },

    each(
      func: (index: number, element: HLTVPageElement) => void
    ): HLTVPageElement {
      root.each((i, el) => func(i, attachMethods(cheerio.load(el).root())))
      return this
    },

    prev(selector?: string): HLTVPageElement {
      return attachMethods(root.prev(selector))
    },

    next(selector?: string): HLTVPageElement {
      return attachMethods(root.next(selector))
    },

    eq(index: number): HLTVPageElement {
      return attachMethods(root.eq(index))
    },

    children(selector?: string): HLTVPageElement {
      return attachMethods(root.children(selector))
    },

    parent(): HLTVPageElement {
      return attachMethods(root.parent())
    },

    contents(): HLTVPageElement {
      return attachMethods(root.contents())
    },

    filter(
      func: (index: number, element: HLTVPageElement) => boolean
    ): HLTVPageElement {
      return attachMethods(
        root.filter((i, el) => func(i, attachMethods(cheerio.load(el).root())))
      )
    },

    index(): number {
      return root.index()
    }
  }
}

export const HLTVScraper = (root: cheerio.Root): HLTVPage => {
  const selector = (selector: string): HLTVPageElement => {
    return attachMethods(root(selector))
  }
  Object.assign(selector, root)

  return selector as HLTVPage
}

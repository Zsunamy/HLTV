import { Agent as HttpsAgent } from 'https'
import { Agent as HttpAgent } from 'http'
import * as request from 'request'
const puppeteer = require('puppeteer')

export interface HLTVConfig {
  loadPage: (url: string) => Promise<string>
  httpAgent: HttpsAgent | HttpAgent
}

export const defaultLoadPage =
  (httpAgent: HttpsAgent | HttpAgent | undefined) => (url: string) =>
    new Promise<string>((resolve) => {
				puppeteer.launch({
				headless: true,
				ignoreHTTPSErrors: true,
				args: ['--no-sandbox']
			}).then((browser: any) => {
				browser.newPage().then((page: any) => {
					page.setUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.7113.93 Safari/537.36').then(() => {
						page.goto(url).then(() => {
							page.content().then((content: any) => {
								browser.close().then(() => {
									resolve(content)
								})
							})
						})
					})
				})
			})
		})

const defaultAgent = new HttpsAgent()

export const defaultConfig: HLTVConfig = {
  httpAgent: defaultAgent,
  loadPage: defaultLoadPage(defaultAgent)
}

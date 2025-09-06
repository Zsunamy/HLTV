import { HLTVConfig } from '../config'
import { FullEvent, getEvent } from './getEvent'
import {HLTVScraper} from "../scraper";
import {fetchPage} from "../utils";

export const getEventByName =
  (config: HLTVConfig) =>
  async ({ name }: { name: string }): Promise<FullEvent> => {
  const $ = HLTVScraper(await fetchPage(`https://www.hltv.org/search?term=${name}`, config.loadPage))
    const pageContent = JSON.parse($('pre').text())
    const firstResult = pageContent[0].events[0]

    if (!firstResult) {
      throw new Error(`Event ${name} not found`)
    }

    return getEvent(config)({ id: firstResult.id })
  }

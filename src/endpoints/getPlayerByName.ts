import { HLTVConfig } from '../config'
import { FullPlayer, getPlayer } from './getPlayer'
import { HLTVScraper } from '../scraper'
import { fetchPage } from '../utils'

export const getPlayerByName =
  (config: HLTVConfig) =>
  async ({ name }: { name: string }): Promise<FullPlayer> => {
    const $ = HLTVScraper(
      await fetchPage(
        `https://www.hltv.org/search?term=${name}`,
        config.loadPage
      )
    )
    const pageContent = JSON.parse($('pre').text())
    const firstResult = pageContent[0].players[0]

    if (!firstResult) {
      throw new Error(`Player ${name} not found`)
    }

    return getPlayer(config)({ id: firstResult.id })
  }

import { HLTVConfig } from '../config'
import { FullTeam, getTeam } from './getTeam'
import { HLTVScraper } from '../scraper'
import { fetchPage } from '../utils'

export const getTeamByName =
  (config: HLTVConfig) =>
  async ({ name }: { name: string }): Promise<FullTeam> => {
    const $ = HLTVScraper(
      await fetchPage(
        `https://www.hltv.org/search?term=${name}`,
        config.loadPage
      )
    )
    const pageContent = JSON.parse($('pre').text())
    const firstResult = pageContent[0].teams[0]

    if (!firstResult) {
      throw new Error(`Team ${name} not found`)
    }

    return getTeam(config)({ id: firstResult.id })
  }

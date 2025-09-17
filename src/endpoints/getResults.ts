import { stringify } from 'querystring'
import { HLTVConfig } from '../config'
import { HLTVPage, HLTVScraper } from '../scraper'
import { BestOfFilter } from '../shared/BestOfFilter'
import { fromMapSlug, GameMap, toMapFilter } from '../shared/GameMap'
import { fetchPage, getIdAt, sleep } from '../utils'

export enum ResultsMatchType {
  LAN = 'Lan',
  Online = 'Online'
}

export enum ContentFilter {
  HasHighlights = 'highlights',
  HasDemo = 'demo',
  HadVOD = 'vod',
  HasStats = 'stats'
}

export enum GameType {
  CSGO = 'CSGO',
  CS16 = 'CS16',
  CS2 = 'CS2'
}

export interface ResultTeam {
  name: string
  logo: string
}

export interface ResultEvent {
  name: string
  logo: string
}

export interface FullMatchResult {
  id: number
  date: number
  team1: ResultTeam
  team2: ResultTeam
  event: ResultEvent
  stars: number
  format: string
  map?: GameMap
  result: {
    team1: number
    team2: number
  }
}

export interface GetResultsArguments {
  startDate?: string
  endDate?: string
  matchType?: ResultsMatchType
  maps?: GameMap[]
  bestOfX?: BestOfFilter
  countries?: string[]
  contentFilters?: ContentFilter[]
  eventIds?: number[]
  playerIds?: number[]
  teamIds?: number[]
  game?: GameType
  stars?: 1 | 2 | 3 | 4 | 5
  delayBetweenPageRequests?: number
}

export const getResults =
  (config: HLTVConfig) =>
  async (options: GetResultsArguments = {}): Promise<FullMatchResult[]> => {
    const query = stringify({
      ...(options.startDate ? { startDate: options.startDate } : {}),
      ...(options.endDate ? { endDate: options.endDate } : {}),
      ...(options.matchType ? { matchType: options.matchType } : {}),
      ...(options.maps ? { map: options.maps.map(toMapFilter) } : {}),
      ...(options.bestOfX ? { bestOfX: options.bestOfX } : {}),
      ...(options.countries ? { country: options.countries } : {}),
      ...(options.contentFilters ? { content: options.contentFilters } : {}),
      ...(options.eventIds ? { event: options.eventIds } : {}),
      ...(options.playerIds ? { player: options.playerIds } : {}),
      ...(options.teamIds ? { team: options.teamIds } : {}),
      ...(options.game ? { gameType: options.game } : {}),
      ...(options.stars ? { stars: options.stars } : {})
    })

    let page = 0
    let $: HLTVPage
    let results: FullMatchResult[] = []

    do {
      await sleep(options.delayBetweenPageRequests ?? 0)

      $ = HLTVScraper(
        await fetchPage(
          `https://www.hltv.org/results?${query}&offset=${page * 100}`,
          config.loadPage
        )
      )

      page++

      $(':not(.big-results) .result-con').each((i, el) => {
        const id = el.find('a').first().attrThen('href', getIdAt(2))!
        const stars = el.find('.stars i').length
        const date = el.numFromAttr('data-zonedgrouping-entry-unix')!
        const format = el.find('.map-text').text()

        const team1 = {
          name: el.find('div.team').first().text(),
          logo: el.find('img.team-logo').first().attr('src')
        }

        const team2 = {
          name: el.find('div.team').last().text(),
          logo: el.find('img.team-logo').last().attr('src')
        }

        const event = {
          name: el.find('.event-hub-title, .event-name').text(),
          logo: el.find('img.event-logo').first().attr('src')
        }
        const [team1Result, team2Result] = el
          .find('.result-score')
          .text()
          .split(' - ')
          .map(Number)

        results.push({
          id,
          stars,
          date,
          event,
          team1,
          team2,
          result: { team1: team1Result, team2: team2Result },
          ...(format.includes('bo')
            ? { format }
            : { map: fromMapSlug(format), format: 'bo1' })
        })
      })
    } while ($('.result-con').exists())

    return results
  }

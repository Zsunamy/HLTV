import { stringify } from 'querystring'
import { HLTVConfig } from '../config'
import { HLTVScraper } from '../scraper'
import { Team } from '../shared/Team'
import { Event } from '../shared/Event'
import { fetchPage } from '../utils'

export enum MatchEventType {
  All = 'All',
  LAN = 'Lan',
  Online = 'Online'
}

export enum MatchFilter {
  LanOnly = 'lan_only',
  TopTier = 'top_tier'
}

export interface GetMatchesArguments {
  eventIds?: number[]
  eventType?: MatchEventType
  filter?: MatchFilter
  teamIds?: number[]
}

export interface MatchPreview {
  id: number
  team1?: Team
  team2?: Team
  date?: number
  format?: string
  event?: Event
  live: boolean
  stars: number
  ranked: boolean
  region: string
}

export const getMatches =
  (config: HLTVConfig) =>
  async ({
    eventIds,
    eventType,
    filter,
    teamIds
  }: GetMatchesArguments = {}): Promise<MatchPreview[]> => {
    const query = stringify({
      ...(eventIds ? { event: eventIds } : {}),
      ...(eventType ? { eventType } : {}),
      ...(filter ? { predefinedFilter: filter } : {}),
      ...(teamIds ? { team: teamIds } : {})
    })

    const $ = HLTVScraper(
      await fetchPage(`https://www.hltv.org/matches?${query}`, config.loadPage)
    )
    // all live matches
    const liveMatches = $('.liveMatches > .match-wrapper')
      .toArray()
      .map((el) => {
        const id = el.numFromAttr('data-match-id')!
        const stars = el.numFromAttr('data-stars')!
        const ranked = el.attr('data-eventtype') === 'ranked'
        const region = el.attr('data-region')
        const lan = el.attr('lan') === 'lan'
        const live = el.attr('live') === 'true'
        const date = undefined
        const team1 = {
          id: el.numFromAttr('team1'),
          name: el.find('.match-teamname').first().text()
        }
        const team2 = {
          id: el.numFromAttr('team2'),
          name: el.find('.match-teamname').second().text()
        }
        const event = {
          id: el.numFromAttr('data-event-id'),
          name: el.find('.match-event').first().attr('data-event-headline')
        }
        const format = el
          .find('.match-meta:not(.match-meta-live)')
          .text()

        return {
          id,
          date,
          stars,
          team1,
          team2,
          format,
          event,
          live,
          lan,
          region,
          ranked
        }
      })

    const upcomingMatches = $('.matches-event-wrapper')
      .toArray()
      .map(el => {
        const event = {
          id: el.find('.event-headline-wrapper').numFromAttr('data-event-id'),
          name: el.find('.event-headline-wrapper').attr('data-event-headline')
        }

        return el.find('.match-wrapper')
          .toArray()
          .map(matchEl => {
            const id = matchEl.numFromAttr('data-match-id')!
            const stars = matchEl.numFromAttr('data-stars')!
            const ranked = matchEl.attr('data-eventtype') === 'ranked'
            const region = matchEl.attr('data-region')
            const lan = matchEl.attr('lan') === 'lan'
            const live = matchEl.attr('live') === 'true'
            const date = matchEl.find('.match-time').numFromAttr('data-unix')
            const team1 = {
              id: matchEl.numFromAttr('team1'),
              name: matchEl.find('.match-teamname').first().text()
            }
            const team2 = {
              id: matchEl.numFromAttr('team2'),
              name: matchEl.find('.match-teamname').second().text()
            }

            const format = matchEl
              .find('.match-meta')
              .first()
              .text()

            return {
              id,
              date,
              stars,
              team1,
              team2,
              format,
              event,
              live,
              lan,
              region,
              ranked
            }
          })
      })
    return [...liveMatches, ...upcomingMatches.flat()]
  }

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


    return $('.match-wrapper:has(.match-event)')
      .toArray()
      .map((el) => {
        const id = el.numFromAttr('data-match-id')!
        const stars = el.numFromAttr('data-stars')!
        const ranked = el.attr('data-eventtype') === "ranked"
        const region = el.attr('data-region')
        const lan = el.attr('lan') === "lan"
        const live  = el.attr('live') === "true"
        const date = live ? undefined : el.find(".match-time").numFromAttr('data-unix')
        const team1 = {
          id: el.numFromAttr('team1'),
          name: el.find(".team1 > .match-teamname").first().text()

        }
        const team2 = {
          id: el.numFromAttr('team2'),
          name: el.find(".team2 > .match-teamname").text()
        }
        const event = {
          id: el.numFromAttr('data-event-id'),
          name: el.find(".match-event").first().attr("data-event-headline")
        }
        const format = el.find(".match-info > :not(match-meta-live)").first().text()

        return { id, date, stars, team1, team2, format, event, live, lan, region, ranked }
      })
  }

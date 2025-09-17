import { HLTVConfig } from '../config'
import { HLTVPage, HLTVPageElement, HLTVScraper } from '../scraper'
import { fromMapName, GameMap } from '../shared/GameMap'
import { Team } from '../shared/Team'
import { Event } from '../shared/Event'
import { fetchPage, getIdAt, notNull, parseNumber } from '../utils'
import { Player } from '../shared/Player'

export interface PlayerStats {
  player: Player
  killsPerRound?: number
  deathsPerRound?: number
  impact?: number
  roundSwing?: number
  multiKillRating?: number
  kills: number
  hsKills: number
  assists: number
  flashAssists: number
  deaths: number
  deathsTraded: number
  openingKills: number
  openingDeaths: number
  multiKillRounds: number
  clutches: number
  KAST?: number
  killDeathsDifference: number
  ADR?: number
  firstKillsDifference: number
  rating: number
  ratingVersion: number
}

export interface TeamPerformance {
  kills: number
  deaths: number
  assists: number
}

export interface TeamsPerformanceOverview {
  team1: TeamPerformance
  team2: TeamPerformance
}

export enum Outcome {
  CTWin = 'ct_win',
  TWin = 't_win',
  BombDefused = 'bomb_defused',
  BombExploded = 'bomb_exploded',
  TimeRanOut = 'stopwatch'
}

export interface RoundOutcome {
  outcome: Outcome
  score: string
  tTeam: number
  ctTeam: number
}

interface MapHalfResult {
  team1Rounds: number
  team2Rounds: number
}

export interface PlayerStat extends Player {
  readonly value: number
}

export interface TeamStatComparison {
  team1: number
  team2: number
}

export interface MapStatsOverview {
  rating: TeamStatComparison
  firstKills: TeamStatComparison
  clutchesWon: TeamStatComparison
  mostKills: PlayerStat
  mostDamage?: PlayerStat
  mostAssists: PlayerStat
  mostAWPKills: PlayerStat
  mostFirstKills: PlayerStat
  bestRating1?: PlayerStat
  bestRating2?: PlayerStat
}

export interface FullMatchMapStats {
  id: number
  matchId: number
  result: {
    team1TotalRounds: number
    team2TotalRounds: number
    halfResults: MapHalfResult[]
  }
  map: GameMap
  date: number
  team1: Team
  team2: Team
  event: Event
  overview: MapStatsOverview
  roundHistory: RoundOutcome[]
  playerStats: {
    team1: PlayerStats[]
    team2: PlayerStats[]
  }
  performanceOverview: TeamsPerformanceOverview
}

interface PlayerCard {
  label: string
  displayValue: string
}

export const getMatchMapStats =
  (config: HLTVConfig) =>
  async ({ id }: { id: number }): Promise<FullMatchMapStats> => {
    const [m$, p$] = await Promise.all([
      fetchPage(
        `https://www.hltv.org/stats/matches/mapstatsid/${id}/-`,
        config.loadPage
      ).then(HLTVScraper),
      fetchPage(
        `https://www.hltv.org/stats/matches/performance/mapstatsid/${id}/-`,
        config.loadPage
      ).then(HLTVScraper)
    ])

    const matchId = m$('.match-page-link').attrThen('href', getIdAt(2))!
    const halfsString = m$('.match-info-row .right').eq(0).text()

    const result = {
      team1TotalRounds: m$('.team-left .bold').numFromText()!,
      team2TotalRounds: m$('.team-right .bold').numFromText()!,
      halfResults: halfsString
        .match(/(?!\() \d+ : \d+ (?=\))/g)!
        .map((x) => x.trim().split(' : '))
        .map(([t1, t2]) => ({
          team1Rounds: Number(t1),
          team2Rounds: Number(t2)
        }))
    }

    const map = fromMapName(m$('.match-info-box').contents().eq(3).trimText()!)
    const date = m$('.match-info-box span[data-time-format]').numFromAttr(
      'data-unix'
    )!

    const team1 = {
      id: m$('.team-left a').attrThen('href', getIdAt(3)),
      name: m$('.team-left .team-logo').attr('title')
    }

    const team2 = {
      id: m$('.team-right a').attrThen('href', getIdAt(3)),
      name: m$('.team-right .team-logo').attr('title')
    }

    const event = {
      id: Number(
        m$('.match-info-box .text-ellipsis')
          .first()
          .attr('href')
          .split('event=')
          .pop()
      ),
      name: m$('.match-info-box .text-ellipsis').first().text()
    }

    const roundHistory = getRoundHistory(m$, team1, team2)
    const overview = getStatsOverview(m$)
    const playerStats = getPlayerStats(m$, p$)
    const performanceOverview = getPerformanceOverview(p$)

    // TODO: kill matrix
    // TODO: equipment value

    return {
      id,
      matchId,
      result,
      map,
      date,
      team1,
      team2,
      event,
      overview,
      roundHistory,
      playerStats,
      performanceOverview
    }
  }

export function getOverviewPropertyFromLabel(
  label: string
): keyof MapStatsOverview | undefined {
  switch (label) {
    case 'Team rating':
      return 'rating'
    case 'First kills':
      return 'firstKills'
    case 'Clutches won':
      return 'clutchesWon'
    case 'Most kills':
      return 'mostKills'
    case 'Most damage':
      return 'mostDamage'
    case 'Most assists':
      return 'mostAssists'
    case 'Most AWP kills':
      return 'mostAWPKills'
    case 'Most first kills':
      return 'mostFirstKills'
    case 'Best rating 1.0':
      return 'bestRating1'
    case 'Best rating 2.0':
      return 'bestRating2'
  }
}

function getRoundHistory(
  $: HLTVPage,
  team1: Team,
  team2: Team
): RoundOutcome[] {
  const getOutcome = (el: HLTVPageElement) => ({
    outcome: el.attr('src').split('/').pop()?.split('.')[0]!,
    score: el.attr('title')
  })

  const topLeftHalf = $('.round-history-half')
    .eq(0)
    .find('img')
    .toArray()
    .map(getOutcome)
  const bottomLeftHalf = $('.round-history-half')
    .eq(2)
    .find('img')
    .toArray()
    .map(getOutcome)
  const topRightHalf = $('.round-history-half')
    .eq(1)
    .find('img')
    .toArray()
    .map(getOutcome)
  const bottomRightHalf = $('.round-history-half')
    .eq(3)
    .find('img')
    .toArray()
    .map(getOutcome)

  const team1Outcomes = topLeftHalf.concat(topRightHalf)
  const team2Outcomes = bottomLeftHalf.concat(bottomRightHalf)

  const doesTeam1StartAsCt = topLeftHalf.some((x) => x.outcome.includes('ct'))

  return Array.from(Array(topLeftHalf.length + topRightHalf.length))
    .map((_, i) => {
      if (
        team1Outcomes[i].outcome === 'emptyHistory' &&
        team2Outcomes[i].outcome === 'emptyHistory'
      ) {
        return null
      }

      const outcome =
        team1Outcomes[i].outcome === 'emptyHistory'
          ? (team2Outcomes[i].outcome as Outcome)
          : (team1Outcomes[i].outcome as Outcome)

      const score =
        team1Outcomes[i].outcome === 'emptyHistory'
          ? team2Outcomes[i].score
          : team1Outcomes[i].score

      let tTeam
      let ctTeam

      if (i <= topLeftHalf.length) {
        if (doesTeam1StartAsCt) {
          tTeam = team2.id!
          ctTeam = team1.id!
        } else {
          tTeam = team1.id!
          ctTeam = team2.id!
        }
      } else {
        if (doesTeam1StartAsCt) {
          tTeam = team1.id!
          ctTeam = team2.id!
        } else {
          tTeam = team2.id!
          ctTeam = team1.id!
        }
      }

      return {
        outcome,
        score,
        tTeam,
        ctTeam
      }
    })
    .filter(notNull)
}

export function getStatsOverview($: HLTVPage) {
  const teamStats = $('.match-info-row')
    .toArray()
    .slice(1)
    .reduce(
      (res, el, _) => {
        const prop = getOverviewPropertyFromLabel(el.find('.bold').text())

        if (!prop) {
          return res
        }

        const [team1, team2] = el.find('.right').text().split(' : ').map(Number)
        res[prop] = { team1, team2 }

        return res
      },
      {} as Record<string, any>
    )

  const mostX = $('.most-x-box')
    .toArray()
    .reduce(
      (res, el, i) => {
        const prop = getOverviewPropertyFromLabel(
          el.find('.most-x-title').text()
        )

        if (!prop) {
          return res
        }

        const playerHref = el.find('.name > a').attr('href')

        res[prop] = {
          id: playerHref ? getIdAt(3, playerHref) : undefined,
          name: $('.most-x-box').eq(i).find('.name > a').text(),
          value: $('.most-x-box').eq(i).find('.valueName').numFromText()
        }

        return res
      },
      {} as Record<string, any>
    )

  return { ...teamStats, ...mostX } as any
}

export function getPlayerStats(m$: HLTVPage, p$: HLTVPage) {
  const playerPerformanceStats = p$('.highlighted-player')
    .toArray()
    .reduce(
      (map, el) => {
        const graphData = JSON.parse(
          el.find('.graph.small').attr('data-fusionchart-config')!
        ).dataSource.data as PlayerCard[]
        const rawPlayerStats = graphData.reduce(
          (acc, card) => {
            if (card.label.includes('Rating')) {
              acc['ratingVersion'] = card.label.split(' ')[1]
              acc['rating'] = card.displayValue
              return acc
            }
            acc[card.label.toLowerCase()] = card.displayValue
            return acc
          },
          {} as Record<string, string>
        )
        const { playerId, ...data } = {
          playerId: Number(
            el.find('.headline span a').attr('href')!.split('/')[2]
          ),
          killsPerRound: Number(rawPlayerStats.kpr),
          deathsPerRound: Number(rawPlayerStats.dpr),
          rating: Number(rawPlayerStats.rating),
          ratingVersion: Number(rawPlayerStats.ratingVersion),
          impact: rawPlayerStats.hasOwnProperty('impact')
            ? Number(rawPlayerStats.impact)
            : undefined,
          roundSwing: rawPlayerStats.hasOwnProperty('swing')
            ? Number(rawPlayerStats.swing.replace('%', ''))
            : undefined,
          multiKillRating: rawPlayerStats.hasOwnProperty('mk rating')
            ? Number(rawPlayerStats['mk rating'])
            : undefined,
          ADR: rawPlayerStats.hasOwnProperty('adr')
            ? Number(rawPlayerStats.adr)
            : undefined,
          KAST: rawPlayerStats.hasOwnProperty('kast')
            ? Number(rawPlayerStats.kast.replace('%', ''))
            : undefined
        }

        map[playerId] = data

        return map
      },
      {} as Record<string, Partial<PlayerStats>>
    )

  const getPlayerOverviewStats = (el: HLTVPageElement) => {
    const id = el.find('.st-player a').attrThen('href', getIdAt(3))!
    const performanceStats = playerPerformanceStats[id]

    return {
      player: {
        id,
        name: el.find('.st-player a').text()
      },
      kills: el.find('.st-kills').contents().first().numFromText()!,
      hsKills: Number(
        el.find('.st-kills .gtSmartphone-only').text().replace(/[()]/g, '')
      ),
      assists: el.find('.st-assists').contents().first().numFromText()!,
      flashAssists: Number(
        el.find('.st-assists .gtSmartphone-only').text().replace(/[()]/g, '')
      ),
      deaths: el.find('.st-deaths').contents().first().numFromText()!,
      deathsTraded: Number(
        el.find('.st-deaths .gtSmartphone-only').text().replace(/[()]/g, '')
      ),
      openingKills: Number(el.find('.st-opkd').text().split(' : ')[0]),
      openingDeaths: Number(el.find('.st-opkd').text().split(' : ')[1]),
      multiKillRounds: el.find('.st-mks').numFromText()!,
      clutches: el.find('.st-clutches').numFromText()!,
      ...(performanceStats as any)
    }
  }

  return {
    team1: m$('.stats-table:not(.hidden)')
      .first()
      .find('tbody tr')
      .toArray()
      .map(getPlayerOverviewStats),
    team2: m$('.stats-table:not(.hidden)')
      .last()
      .find('tbody tr')
      .toArray()
      .map(getPlayerOverviewStats)
  }
}

export function getPerformanceOverview(p$: HLTVPage) {
  return p$('.overview-table tr')
    .toArray()
    .slice(1)
    .reduce(
      (res, el) => {
        const property = el
          .find('.name-column')
          .text()
          .toLowerCase() as keyof TeamPerformance

        res.team1[property] = el.find('.team1-column').numFromText()!
        res.team2[property] = el.find('.team2-column').numFromText()!

        return res
      },
      { team1: {}, team2: {} } as TeamsPerformanceOverview
    )
}

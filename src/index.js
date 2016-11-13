import cheerio from 'cheerio'
import fetch from 'isomorphic-fetch'

const HLTV_URL = 'http://www.hltv.org'

class HLTV {
    _getTeamId($team) {
        const teamLink = $team.attr('href')

        if(teamLink && teamLink !== '#') return parseInt(teamLink.split('=')[2])
    }

    _restructureMatch(match) {
        if(['LIVE', 'Finished'].includes(match.time)) {
            delete match.time
        }

        if(!(match.format.includes('Best of'))) {
            match.map = match.format
            match.format = 'Best of 1'
        }

        if(match.label) {
            delete match.team1
            delete match.team1Id
            delete match.team2
            delete match.team1Id
            delete match.live
            delete match.finished
            delete match.map
        } else {
            delete match.label
        }

        if(!match.team1Id) delete match.team1Id
        if(!match.team2Id) delete match.team2Id
    }

    _cleanupString(str) {
        return str.replace(/\s\s+/g, ' ').trim()
    }

    async getMatches() {
        let matches = []
        const response = await fetch(`${HLTV_URL}/matches/`).then(res => res.text())
        const $ = cheerio.load(response)
        const $matchElems = $('.matchListRow')

        $matchElems.each((i, elem) => {
            const $elem = $(elem)
            const $team1 = $elem.find('.matchTeam1Cell > a')
            const $team2 = $elem.find('.matchTeam2Cell > a')
            const $liveInfo = $($elem.find('.matchScoreCell > div > div'))

            let match = {}

            match.time     = $elem.find('.matchTimeCell').text()
            match.team1    = $team1.text().trim()
            match.team2    = $team2.text().trim()
            match.team1Id  = this._getTeamId($team1)
            match.team2Id  = this._getTeamId($team2)
            match.live     = (match.matchTime === 'LIVE')
            match.finished = (match.matchTime === 'Finished')
            match.format   = $($liveInfo[0]).text().trim()
            match.label    = $elem.find('div[style="text-align: center;width: 80%;float: left;"]').text()
            match.id       = $elem.find('.matchActionCell > a').attr('href').replace('/match/', '')

            this._restructureMatch(match)

            matches.push({...match})
        })

        return matches
    }

    async getLatestResults({pages = 1} = {}) {
        if(pages < 1) throw new Error('HLTV.getLatestResults: pages cannot be less than 1')

        let matches = []
        for(let i = 0; i < pages; i++) {
            const response = await fetch(`${HLTV_URL}/results/${i*50}/`).then(res => res.text())
            const $ = cheerio.load(response)
            const $matchElems = $('.matchListRow')

            $matchElems.each((i, elem) => {
                const $elem = $(elem)
                const $team1 = $elem.find('.matchTeam1Cell > a')
                const $team2 = $elem.find('.matchTeam2Cell > a')

                let match = {}

                match.format  = $elem.find('.matchTimeCell').text()
                match.team1   = $team1.text().trim()
                match.team2   = $team2.text().trim()
                match.team1Id = this._getTeamId($team1)
                match.team2Id = this._getTeamId($team2)
                match.id      = $elem.find('.matchActionCell > a').attr('href').replace('/match/', '')
                match.result  = $elem.find('.matchScoreCell').text().trim()

                this._restructureMatch(match)

                matches.push({...match})
            })
        }

        return matches
    }

    async getStreams({loadLinks = false} = {}) {
        let streams = []
        const response = await fetch(HLTV_URL).then(res => res.text())
        const $ = cheerio.load(response)
        const $streamTitles = $('div[style*="width: 95px;"]')
        const $streamViewers = $('div[style*="width: 35px;"]')

        for(let i = 0; i < $streamTitles.length; i++) {
            let stream = {}

            const $streamHref = $($streamTitles[i]).find('a')

            stream.name     = $streamHref.attr('title')
            stream.viewers  = parseInt($($streamViewers[i]).text().replace(/[()]/g, ''))
            stream.category = $($streamHref.find('img')[0]).attr('title')
            stream.country  = $($streamHref.find('img')[1]).attr('src').split('flag/')[1].split('.')[0]
            stream.hltvLink = HLTV_URL + $streamHref.attr('href')

            if(loadLinks) {
                const hltvPage = await fetch(stream.hltvLink).then(res => res.text())

                stream.realLink = cheerio.load(hltvPage)('iframe').attr('src')
            }

            streams.push({...stream})
        }

        return streams
    }

    async getMatch({id} = {}) {
        let match = {
            event: {},
            maps: [],
            players: []
        }

        const response = await fetch(`${HLTV_URL}/match/${id}`).then(res => res.text())
        const $ = cheerio.load(response)

        const $teams = $('div[style*="width:46%;"]')
        const $eventInfo = $('div[style*="font-size: 18px;"]')
        const $mapFormatBox = $('#mapformatbox')
        const $maps = $('div[style*="width:280px;"]')
        const $mapResults = $('div[style*="width:270px;"]')
        const $highlights = $('.hotmatchroundbox').has('div[style="cursor:pointer;color:#0269D2"]')
        const $demos = $('.hotmatchroundbox').has('div[style="cursor:pointer;width:240px;"]')
        const $players = $('div[style*="width:105px;"]')

        const $team1 = $($teams[0]).find('span > a')
        const $team2 = $($teams[1]).find('span > a')

        match.team1 = $team1.text().trim()
        match.team2 = $team2.text().trim()
        match.team1Id = this._getTeamId($team1)
        match.team2Id = this._getTeamId($team2)
        match.date = this._cleanupString($($eventInfo[0]).text())
        match.event.name = $eventInfo.find('a').text()
        match.event.link = HLTV_URL + $eventInfo.find('a').attr('href')
        match.format = $mapFormatBox.text().split('\n')[1].trim()
        match.additionalInfo = $mapFormatBox.text().split('\n')[3].trim()
        $maps.each((i, map) => {
            const $map = $(map)
            match.maps[i] = {
                name: $map.find('img').attr('src').split('hotmatch/')[1].split('.png')[0]
            }
        })

        $mapResults.each((i, mapres) => {
            match.maps[i].result = this._cleanupString($(mapres).text())
        })

        match.highlights = $highlights.map((i, e) => this._cleanupString($(e).text())).get()
        match.demos = $demos.map((i, e) => {
            const $e = $(e)

            return {
                name: this._cleanupString($e.text()),
                link: HLTV_URL + $e.find('a').attr('href')
            }
        }).get()

        match.players[0] = $players.slice(0,5).map((i, e) => {
            return $(e).children().first().text()
        }).get()

        match.players[1] = $players.slice(5,10).map((i, e) => {
            return $(e).children().first().text()
        }).get()

        return match
    }
}

export default HLTV

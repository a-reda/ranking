const Match = require('../../../models/Match')

const rankify = require('../../../lib/rankify')

const omit = require('lodash/omit')

const GetMatchById = async id => {
  let match = {}
  await Match.findById(id, (err, doc) => {
    if (err) console.error(err)
    match = doc
  })

  return match
}

const GetMatchesStartingFromDateAndUsersFromMatchId = async id => {
  const users = {
    includes: function (user) {
      return Object.keys(this).includes(user.slug)
    },
    add: function (user, rankDifference, rankDifference2, winner) {
      this[user.slug] = {
        _id: user._id,
        name: user.name,
        points: user.points + (winner ? - Math.abs(rankDifference) : Math.abs(rankDifference)),
        points2: user.points2 + (winner ? - Math.abs(rankDifference2) : Math.abs(rankDifference2))
      }
    },
    update: function (user, rankDifference, rankDifference2, winner) {
      this[user.slug].points = this[user.slug].points + (winner ? - Math.abs(rankDifference) : Math.abs(rankDifference))
      this[user.slug].points2 = this[user.slug].points2 + (winner ? - Math.abs(rankDifference2) : Math.abs(rankDifference2))
    },
    setPoints: function (slug, points, points2) {
      this[slug].points = points
      this[slug].points2 = points2
    },
    getUser: function (slug) {
      return this[slug]
    },
    getUsers: function() {
      return Object.keys(this)
        .filter(key => ({}.toString.call(this[key]) !== '[object Function]'))
        .reduce((obj, key) => {
          obj[key] = this[key];
          return obj;
        }, {})
    }
  }

  const matchesToRankify = []
  const matches = []

  const matchFrom = await GetMatchById(id)

  const cursor = Match.find({createdAt: { $gte: matchFrom.createdAt }})
    .populate([
      {path: 'teamHome.defender', model: 'User'},
      {path: 'teamHome.striker', model: 'User'},
      {path: 'teamAway.defender', model: 'User'},
      {path: 'teamAway.striker', model: 'User'}
    ]).sort({ createdAt: 1 }).cursor()

  for (let match = await cursor.next(); match != null; match = await cursor.next()) {
    const homeWin = match.teamHome.score > match.teamAway.score
    const teamHome = match.teamHome
    const teamAway = match.teamAway
    const homeDefender = teamHome.defender
    const homeStriker = teamHome.striker
    const awayDefender = teamAway.defender
    const awayStriker = teamAway.striker

    if (users.includes(homeDefender)) {
      users.update(homeDefender, match.difference, match.difference2, homeWin)
    } else {
      users.add(homeDefender, match.difference, match.difference2, homeWin)
    }

    if (users.includes(homeStriker)) {
      users.update(homeStriker, match.difference, match.difference2, homeWin)
    } else {
      users.add(homeStriker, match.difference, match.difference2, homeWin)
    }

    if (users.includes(awayDefender)) {
      users.update(awayDefender, match.difference, match.difference2, !homeWin)
    } else {
      users.add(awayDefender, match.difference, match.difference2, !homeWin)
    }

    if (users.includes(awayStriker)) {
      users.update(awayStriker, match.difference, match.difference2, !homeWin)
    } else {
      users.add(awayStriker, match.difference, match.difference2, !homeWin)
    }

    matchesToRankify.push({
      _id: match._id,
      badges: [],
      slug: match.slug,
      createdAt: match.createdAt,
      teamHome: {
        defender: {
          _id: homeDefender._id,
          slug: homeDefender.slug
        },
        striker: {
          _id: homeStriker._id,
          slug: homeStriker.slug
        },
        score: teamHome.score,
        defScore: teamHome.defScore,
        strScore: teamHome.strScore,
        defBadges: [],
        strBadges: []
      },
      teamAway: {
        defender: {
          _id: awayDefender._id,
          slug: awayDefender.slug
        },
        striker: {
          _id: awayStriker._id,
          slug: awayStriker.slug
        },
        score: teamAway.score,
        defScore: teamAway.defScore,
        strScore: teamAway.strScore,
        defBadges: [],
        strBadges: []
      }
    })
  }

  matchesToRankify.forEach(match => {
    match.teamHome.defender.points = users.getUser(match.teamHome.defender.slug).points
    match.teamHome.striker.points = users.getUser(match.teamHome.striker.slug).points
    match.teamAway.defender.points = users.getUser(match.teamAway.defender.slug).points
    match.teamAway.striker.points = users.getUser(match.teamAway.striker.slug).points

    const rank = rankify.calculate({
      teamHome: match.teamHome,
      teamAway: match.teamAway
    })

    users.setPoints(match.teamHome.defender.slug, rank.homeDefense, rank.homeDefense2)
    users.setPoints(match.teamHome.striker.slug, rank.homeStriker, rank.homeStriker2)
    users.setPoints(match.teamAway.defender.slug, rank.awayDefense, rank.awayDefense2)
    users.setPoints(match.teamAway.striker.slug, rank.awayStriker, rank.awayStriker2)

    matches.push(
      Object.assign({}, match, {
        difference: rank.difference,
        difference2: rank.difference2
      })
    )
  })

  return {
    matches: matches,
    users: users.getUsers()
  }

}

const GetNewUsersPointsDeletingMatch = match => {
  const users = {
    add: function (user, rankDifference, winner) {
      this[user.slug] = {
        id: user._id,
        name: user.name,
        points: user.points + (winner ? - Math.abs(rankDifference) : Math.abs(rankDifference))
      }
    },
    getUsers: function() {
      return Object.keys(this)
        .filter(key => ({}.toString.call(this[key]) !== '[object Function]'))
        .reduce((obj, key) => {
          obj[key] = this[key];
          return obj;
        }, {})
    }
  }


  const homeWin = match.teamHome.score > match.teamAway.score
  const teamHome = match.teamHome
  const teamAway = match.teamAway
  const homeDefender = teamHome.defender
  const homeStriker = teamHome.striker
  const awayDefender = teamAway.defender
  const awayStriker = teamAway.striker

  users.add(homeDefender, match.difference, homeWin)
  users.add(homeStriker, match.difference, homeWin)
  users.add(awayDefender, match.difference, !homeWin)
  users.add(awayStriker, match.difference, !homeWin)

  return users.getUsers()
}

const GetUsersStats = async (filters = {}) => {

  const users = {
    includes: function (user) {
      return Object.keys(this).includes(user.slug)
    },
    add: function (user, stats, rankDifference, rankDifference2) {
      this[user.slug] = {
        ...omit(user, ['points', 'points2', 'stats']),
        points: stats.matchWin === 1 ? 1200 + Math.abs(rankDifference) : 1200 - Math.abs(rankDifference),
        points2: stats.matchWin === 1 ? 1200 + Math.abs(rankDifference2) : 1200 - Math.abs(rankDifference2),
        stats: {
          win_streak: stats.winStreak, // current matches winned in row
          max_win_streak: stats.maxWinStreak, // max matches winned in row
          points_trend: stats.matchWin === 1 ? Math.abs(rankDifference) : - Math.abs(rankDifference), // trend positive or negative
          points_max: stats.matchWin === 1 ? 1200 + Math.abs(rankDifference) : 1200, // max points reached
          points_min: stats.matchWin === 1 ? 1200 : 1200 - Math.abs(rankDifference), // min points reached
          match_played: 1,
          match_win: stats.matchWin,
          match_as_defender: stats.asDefender,
          match_as_striker: stats.asStriker,
          win_as_defender: stats.asDefenderWin,
          win_as_striker: stats.asStrikerWin,
          match_goals_made: stats.matchGoalsMade,
          match_goals_conceded: stats.matchGoalsConceded,
          match_goals_made_as_defender: stats.matchGoalsMadeAsDefender,
          match_goals_made_as_striker: stats.matchGoalsMadeAsStriker,
          match_goals_conceded_as_defender: stats.matchGoalsConcededAsDefender,
          match_crawl: stats.crawlCount,
          match_crawled: stats.crawledCount,
          last_winned: stats.matchWin === 1
        }
      }
    },
    update: function (user, stats, winner, rankDifference, rankDifference2) {
      const winAgain = winner && this[user.slug].stats.last_winned
      const looseAgain = !winner && !this[user.slug].stats.last_winned

      this[user.slug].points = this[user.slug].points + (winner ? Math.abs(rankDifference) : - Math.abs(rankDifference))
      this[user.slug].points2 = this[user.slug].points + (winner ? Math.abs(rankDifference2) : - Math.abs(rankDifference2))
      this[user.slug].stats.win_streak = winner ? this[user.slug].stats.win_streak + 1 : 0
      this[user.slug].stats.max_win_streak = winAgain ? this[user.slug].stats.max_win_streak + 1 : this[user.slug].stats.max_win_streak
      this[user.slug].stats.points_trend =
        winAgain ? this[user.slug].stats.points_trend + Math.abs(rankDifference) :
          winner ? Math.abs(rankDifference) :
            looseAgain ? this[user.slug].stats.points_trend - Math.abs(rankDifference) : - Math.abs(rankDifference)
      if (this[user.slug].points > this[user.slug].stats.points_max) {
        this[user.slug].stats.points_max = this[user.slug].points
      }
      if (this[user.slug].points < this[user.slug].stats.points_min) {
        this[user.slug].stats.points_min = this[user.slug].points
      }
      this[user.slug].stats.match_played++
      this[user.slug].stats.match_win = this[user.slug].stats.match_win + (winner ? 1 : 0)
      this[user.slug].stats.match_as_defender = this[user.slug].stats.match_as_defender + stats.asDefender
      this[user.slug].stats.match_as_striker = this[user.slug].stats.match_as_striker + stats.asStriker
      this[user.slug].stats.win_as_defender = this[user.slug].stats.win_as_defender + stats.asDefenderWin
      this[user.slug].stats.win_as_striker = this[user.slug].stats.win_as_striker + stats.asStrikerWin
      this[user.slug].stats.match_goals_made = this[user.slug].stats.match_goals_made + stats.matchGoalsMade
      this[user.slug].stats.match_goals_conceded = this[user.slug].stats.match_goals_conceded + stats.matchGoalsConceded
      this[user.slug].stats.match_goals_made_as_defender = this[user.slug].stats.match_goals_made_as_defender + stats.matchGoalsMadeAsDefender
      this[user.slug].stats.match_goals_made_as_striker = this[user.slug].stats.match_goals_made_as_striker + stats.matchGoalsMadeAsStriker
      this[user.slug].stats.match_goals_conceded_as_defender = this[user.slug].stats.match_goals_conceded_as_defender + stats.matchGoalsConcededAsDefender
      this[user.slug].stats.match_crawl = this[user.slug].stats.match_crawl + stats.crawlCount
      this[user.slug].stats.match_crawled = this[user.slug].stats.match_crawled + stats.crawledCount
      this[user.slug].stats.last_winned = winner
    },
    getUsers: function() {
      return Object.keys(this)
        .filter(key => ({}.toString.call(this[key]) !== '[object Function]'))
        .reduce((obj, key) => {
          obj[key] = this[key];
          return obj;
        }, {})
    }
  }

  const generateUserStats = (isDefender, win, team, oppositeTeam) => ({
    winStreak: win ? 1 : 0, // current matches winned in row
    maxWinStreak: win ? 1 : 0, // max matches winned in row
    matchWin: win ? 1 : 0,
    asDefender: isDefender ? 1 : 0,
    asStriker: !isDefender ? 1 : 0,
    asDefenderWin: win && isDefender ? 1 : 0,
    asStrikerWin: win && !isDefender ? 1 : 0,
    matchGoalsMade: team.score,
    matchGoalsConceded: oppositeTeam.score,
    matchGoalsMadeAsDefender: isDefender ? team.defScore : 0,
    matchGoalsMadeAsStriker: !isDefender ? team.strScore : 0,
    matchGoalsConcededAsDefender: isDefender ? oppositeTeam.score : 0,
    crawlCount: win && oppositeTeam.score === 0 ? 1 : 0,
    crawledCount: !win && team.score === 0 ? 1 : 0
  })

  const cursor = Match.find(filters)
    .populate([
      {path: 'teamHome.defender', model: 'User'},
      {path: 'teamHome.striker', model: 'User'},
      {path: 'teamAway.defender', model: 'User'},
      {path: 'teamAway.striker', model: 'User'}
    ]).sort({ createdAt: 1 }).cursor()

  for (let match = await cursor.next(); match != null; match = await cursor.next()) {
    const homeWin = match.teamHome.score > match.teamAway.score
    const teamHome = match.teamHome
    const teamAway = match.teamAway
    const homeDefender = teamHome.defender
    const homeStriker = teamHome.striker
    const awayDefender = teamAway.defender
    const awayStriker = teamAway.striker

    const homeDefenderStats = generateUserStats(true, homeWin, teamHome, teamAway)
    const homeStrikerStats = generateUserStats(false, homeWin, teamHome, teamAway)
    const awayDefenderStats = generateUserStats(true, !homeWin, teamAway, teamHome)
    const awayStrikerStats = generateUserStats(false, !homeWin, teamAway, teamHome)

    if (users.includes(homeDefender)) {
      users.update(homeDefender, homeDefenderStats, homeWin, match.difference, match.difference2)
    } else {
      users.add(homeDefender, homeDefenderStats, match.difference, match.difference2)
    }

    if (users.includes(homeStriker)) {
      users.update(homeStriker, homeStrikerStats, homeWin, match.difference, match.difference2)
    } else {
      users.add(homeStriker, homeStrikerStats, match.difference, match.difference2)
    }

    if (users.includes(awayDefender)) {
      users.update(awayDefender, awayDefenderStats, !homeWin, match.difference, match.difference2)
    } else {
      users.add(awayDefender, awayDefenderStats, match.difference, match.difference2)
    }

    if (users.includes(awayStriker)) {
      users.update(awayStriker, awayStrikerStats, !homeWin, match.difference, match.difference2)
    } else {
      users.add(awayStriker, awayStrikerStats, match.difference, match.difference2)
    }
  }
  const result = []

  Object.keys(users.getUsers()).forEach(key => {
    result.push(users[key])
  })

  return result
}

module.exports = {
  GetMatchesStartingFromDateAndUsersFromMatchId,
  GetNewUsersPointsDeletingMatch,
  GetUsersStats
}

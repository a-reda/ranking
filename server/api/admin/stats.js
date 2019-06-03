const express = require('express')
const router = express.Router()
const Match = require('../../models/Match')
const User = require('../../models/User')
const GetUsersStats = require('./helper').GetUsersStats


router.route('/').get(async (req, res) => {
  const result = await GetUsersStats()

  res.json(result)
})

router.route('/update').post(async (req, res) => {
  const result = await GetUsersStats()

  result.forEach(async user => {
    const query = { _id: user._id }
    const update = { stats: user.stats }

    await User.findOneAndUpdate(query, update, (err, doc) => {})
  })

  res.json(result)
})

module.exports = router

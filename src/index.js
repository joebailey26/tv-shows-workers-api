import { Router, listen } from 'worktop'
import { customFetch } from './utils.js'
import { ics } from './calendar'

const router = new Router()

const cal = ics()
let err

async function getShows () {
  const { results } = await DB.prepare(
    "SELECT * FROM tv_shows"
  ).all();
  return Response.json(results);
}

function getShowsEpisodate (id) {
  return fetch(`https://www.episodate.com/api/show-details?q=${id}`, {
    method: 'POST'
  }).then(async (response) => {
    const r = await response.json()
    if (r.tvShow) {
      // eslint-disable-next-line no-undef
      await KV_TV_SHOWS.put(id.toString(), JSON.stringify(r.tvShow))
    }
    return r.tvShow
  }).catch((error) => {
    err = error
  })
}

function createShow (show) {
  let i
  for (i = 0; i < (show.episodes).length; i++) {
    const episode = show.episodes[i]
    if (episode.air_date) {
      let date = new Date(episode.air_date)
      date.setDate(date.getDate() + 1)
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      cal.addEvent(show.name + ' | ' + episode.name, '', '', date, date)
    }
  }
}

router.add('GET', '/', (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  response.send(200, 'Welcome!')
})

router.add('OPTIONS', '*', (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  response.send(200, '')
})

router.add('GET', '/calendar', (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')

  return getShows().then(async (res) => {
    const IDs = res
    for (const ID of IDs) {
      // eslint-disable-next-line no-undef
      await KV_TV_SHOWS.get(ID.data.id).then(async (res) => {
        if (res !== undefined && res !== null) {
          await createShow(JSON.parse(res))
        } else {
          await createShow(await getShowsEpisodate(ID.data.id))
        }
      }).catch((error) => {
        response.send(500, error + err)
      })
    }
    response.setHeader('Content-Type', 'text/calendar')
    response.send(200, cal.build())
  }).catch((error) => {
    response.send(500, error + err)
  })
})

router.add('GET', '/get-shows', async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  // eslint-disable-next-line no-undef
  if (Object.fromEntries(request.headers).authorization === AUTH_SECRET) {
    const result = await getShows()
    response.send(200, result)
  } else {
    // response.send(401, 'Not Authorized')
    response.send(200, [])
  }
})

router.add('POST', '/add-show/:id', async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  // eslint-disable-next-line no-undef
  if (Object.fromEntries(request.headers).authorization === AUTH_SECRET) {
    await db.prepare('INSERT INTO tv_shows (id) VALUES (?)')
      .bind(request.params.id)
      .run()

    response.send(200, 'Added successfully')
  } else {
    // response.send(401, 'Not Authorized')
    response.send(200, 'Added successfully')
  }
})

router.add('POST', '/remove-show/:id', async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  // eslint-disable-next-line no-undef
  if (Object.fromEntries(request.headers).authorization === AUTH_SECRET) {
    await db.prepare('DELETE FROM tv_shows WHERE id = ?')
      .bind(request.params.id)
      .run()

      response.send(200, 'Removed successfully')
  } else {
    // response.send(401, 'Not Authorized')
    response.send(200, 'Removed successfully')
  }
})

listen(router.run)

addEventListener('scheduled', (event) => {
  event.waitUntil(handleScheduled())
})

function handleScheduled () {
  return getShows().then(async (response) => {
    const IDs = await response
    for (const ID of IDs) {
      await getShowsEpisodate(ID.data.id)
    }
  }).catch((error) => {
    return new Response(error + err, { status: 500 })
  })
}

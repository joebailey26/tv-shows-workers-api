import { Router } from '@tsndr/cloudflare-worker-router'
import { ics } from './ics'

// Initialize router
const router = new Router()

// Enabling built in CORS support
router.cors()

// Enable debug mode
router.debug(true)

// Register global middleware
router.use(({ env, req }) => {
  // Check if the request path is for the calendar route
  const url = new URL(req.url)
  if (url.pathname === '/calendar') {
    // Bypass middleware logic for /calendar route
    return
  }

  // Intercept if token doesn't match and return an unauthorized response
  if (req.headers.get('authorization') !== env.AUTH_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
})

export default {
  // The fetch event is a native Cloudflare Workers function.
  // We return the router here which handles the request.
  fetch (request, env, ctx) {
    return router.handle(request, env, ctx)
  },

  // The scheduled event is a native Cloudflare Workers function.
  // We run this event on a CRON to populate KV with data from the Episodate API so that we don't hit rate limits
  async scheduled (event, env, ctx) {
    ctx.waitUntil(await handleScheduled(event, env, ctx))
  }
}

async function handleScheduled (event, env, ctx) {
  const limit = 10
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { results } = await env.DB.prepare(
      `
        SELECT * FROM tv_shows
        GROUP BY id
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ).all()

    // If no shows are returned, we've reached the end
    if (results.length === 0) {
      hasMore = false
      break
    }

    // Map each show to a promise that fetches the latest data from the Episodate API
    const updatePromises = results.map((show) => getShowsEpisodate(show.id, env)
      .then((response) => {
        // ToDo
        // When sending an email we would do it to the user of the show, but currently it has to be my static email
        // If the latest episode date has been added compared to KV, send an email
        // If the show status (active, cancelled, etc) has changed compared to KV, send an email
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to update show with id ${show.id}:`, error)
      })
    )

    // Use Promise.allSettled to wait for all promises succeed or fail
    await Promise.allSettled(updatePromises)

    // Move to the next page
    offset += limit
  }
}

async function getShows (env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM tv_shows'
    // ToDo
    //  Where user = current user
    //  Limit
    //  Offset
  ).all()

  const episodesToReturn = []

  // Loop through all shows and fetch the data we need from KV or Episodate
  for (const show of results) {
    // Check if we have the show stored in the KV cache
    const cachedShow = await env.KV_TV_SHOWS.get(show.id)

    if (cachedShow !== undefined && cachedShow !== null) {
      episodesToReturn.push(await JSON.parse(cachedShow))
    } else {
      episodesToReturn.push(await getShowsEpisodate(show.id, env))
    }
  }

  return episodesToReturn
}

// Get the details of a show from Episodate
function getShowsEpisodate (id, env) {
  return fetch(`https://www.episodate.com/api/show-details?q=${id}`).then(async (response) => {
    const r = await response.json()
    // If we don't get data back, then throw an error
    if (!r.tvShow) {
      throw new Error(`We didn't receive data from the Episodate API for show ${id}`)
    }
    // Cache the response in KV with a key of the show id
    await env.KV_TV_SHOWS.put(id.toString(), JSON.stringify(r.tvShow))

    // Return the data
    return r.tvShow
  })
}

// Return an ICS file containing events for all episodes of all shows stored in D1. Use KV for caching.
router.get('/calendar', async ({ env, req }) => {
  // Initialise a new calendar
  const cal = ics()

  const shows = await getShows(env)
  // Loop through all shows and all episodes for show and create a calendar event for that episode
  shows.forEach((show) => {
    show.episodes.forEach((episode) => {
      // Only process the episode if it has an air_date
      if (episode.air_date) {
        // Build the date for the episode
        let date = new Date(episode.air_date)
        // Set the date to plus one to allow pirates to upload it
        date.setDate(date.getDate() + 1)
        // Strip the time from the date as we don't need it
        date = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        // Add the event to the calendar
        cal.addEvent(
          `${show.name} | ${episode.name}`,
          '',
          '',
          date,
          date
        )
      }
    })
  })

  return new Response(
    // Return the built calendar
    cal.build(),
    // Send the correct content type header so the browser knows what to do with it.
    // This also lets Google Calendar sync from this endpoint
    {
      headers: new Headers({
        'Content-Type': 'text/calendar'
      })
    }
  )
})

router.get('/shows', async ({ env, req }) => {
  const shows = await getShows(env)

  shows.sort((a, b) => {
    const nameA = a.name.toUpperCase() // to ensure case-insensitive comparison
    const nameB = b.name.toUpperCase() // to ensure case-insensitive comparison

    if (nameA < nameB) {
      return -1
    }
    if (nameA > nameB) {
      return 1
    }

    // names must be equal
    return 0
  })

  return Response.json(shows)
})

router.post('/show/:id', async ({ env, req }) => {
  // Check if the id already exists and return an error if so
  const exists = await env.DB.prepare('SELECT id FROM tv_shows WHERE id = ? LIMIT 1')
    .bind(req.params.id)
    .all()

  if (exists) {
    return new Response('Show already exists', { status: 409 })
  }

  await env.DB.prepare('INSERT INTO tv_shows (id) VALUES (?)')
    .bind(req.params.id)
    .run()

  return new Response('Added successfully', { status: 201 })
})

router.delete('/show/:id', async ({ env, req }) => {
  // Check if the show exists. If it doesn't throw an error
  const exists = await env.DB.prepare('SELECT id FROM tv_shows WHERE id = ? LIMIT 1')
    .bind(req.params.id)
    .all()

  if (!exists) {
    return new Response('Show does not exist', { status: 404 })
  }

  await env.DB.prepare('DELETE FROM tv_shows WHERE id = ?')
    .bind(req.params.id)
    .run()

  return new Response('Removed successfully')
})

import { Router, listen } from 'worktop'
import faunadb from 'faunadb'
import { customFetch, getFaunaError } from './utils.js'

const router = new Router()

const q = faunadb.query
const faunaClient = new faunadb.Client({
  // eslint-disable-next-line no-undef
  secret: FAUNA_SECRET,
  fetch: customFetch
})

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

router.add('GET', '/get-shows', async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  if (Object.fromEntries(request.headers).authorization === 'GTO') {
    try {
      const shows = await faunaClient.query(q.Paginate(q.Match(q.Ref('indexes/tv-shows'))))
      console.log(shows)
      const showRefs = shows.data
      // create new query
      const getAllShowsDataQuery = showRefs.map((ref) => {
        return q.Get(ref)
      })
      // then query the refs
      const result = await faunaClient.query(getAllShowsDataQuery)
      response.send(200, result)
    } catch (error) {
      const faunaError = getFaunaError(error)
      response.send(faunaError.status, faunaError)
    }
  } else {
    response.send(401, 'Not Authorized')
  }
})

router.add('POST', '/add-show/:id', async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  if (Object.fromEntries(request.headers).authorization === 'GTO') {
    try {
      const data = {
        data: {
          id: request.params.id
        }
      }
      await faunaClient.query(q.Create(q.Ref('classes/tv-shows'), data))
      response.send(200, 'Added successfully')
    } catch (error) {
      const faunaError = getFaunaError(error)
      response.send(faunaError.status, faunaError)
    }
  } else {
    response.send(401, 'Not Authorized')
  }
})

router.add('POST', '/remove-show/:id', async (request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'authorization')
  if (Object.fromEntries(request.headers).authorization === 'GTO') {
    try {
      await faunaClient.query(q.Delete(q.Ref(`classes/tv-shows/${request.params.id}`)))
      response.send(200, 'Removed successfully')
    } catch (error) {
      const faunaError = getFaunaError(error)
      response.send(faunaError.status, faunaError)
    }
  } else {
    response.send(401, 'Not Authorized')
  }
})

listen(router.run)

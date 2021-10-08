# TV Shows API built in Cloudflare Workers

This is the API for the corresponding [TV Show application](https://github.com/joebailey26/TV-Shows-Public) that I use to manage the TV Shows that I am currently watching.

This API uses [Worktop](https://github.com/lukeed/worktop) to scaffold an API in [Cloudflare Workers](https://workers.cloudflare.com/) using [Workers KV](https://www.cloudflare.com/en-gb/products/workers-kv/).

The API serves 3 purposes:

1. As an API for my private repo and site behind [Cloudflare Access](https://www.cloudflare.com/en-gb/teams/access/) so that I can manage my TV Shows.

2. As a mock API for the public repo of the TV Shows application to demonstrate Cloudflare's products and my code.

3. As a live ICAL/ICS URL for any calendar application so that I can sync the TV Shows with my personal calendar.

The API stores the Episodate ID of each TV Show in FaunaDB.

To avoid Rate Limiting issues with the [Episodate API](https://www.episodate.com/api), and to ensure that information is as up to date as possible, a CRON is run every 8 hours which runs through all IDs in FaunaDB, fetches the data from Episodate, and stores it in Workers KV. This data is then readily available to return to the front-end application, or to the live ICAL/ICS URL.

## Routes

GET ```/``` **Returns Welcome!**

GET ```/calendar``` **Returns ICAL/ICS Calendar file**

GET ```/get-shows``` **Returns list of IDs of TV Shows that are stored in FaunaDB**

POST ```/add-show/:id``` **Adds show to FaunaDB**

POST ```/remove-show/:id``` **Removes show from FaunaDB**

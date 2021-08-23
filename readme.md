# TV Shows API built in Cloudflare Workers

This is the API for the corresponding TV Show application that I use to manage the TV Shows that I am currently watching.

## Routes

GET ```/``` **Returns Welcome!**

GET ```/calendar``` **Returns ICAL/ICS Calendar file**

GET ```/get-shows``` **Returns list of IDs of TV Shows that are stored in FaunaDB**

POST ```/add-show/:id``` **Adds show to FaunaDB**

POST ```/remove-show/:id``` **Removes show from FaunaDB**

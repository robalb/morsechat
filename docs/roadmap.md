
# week 3
- [x] add .dockerignore
- [x] clean files: and remove home.html
- [x] create docker container
- [x] create build pipeline with github actions
- [x] deploy test version under test domain
- [x] db migration, launch to prod
- [] integrate ip-only fingerprint
- [] add ip-only fingerprint to ws client struct, use it for 
     a better chamber functionality
- [x] prometheus metrics
- [] stress test

# week2

- [x] remove console logs in frontend
- working basics of websockets
  - [x] fix delimiters issue in ws client
  - [x] add morse message response status, both backend and frontend
  - [] stress test ws
  - [] test multiple connections
- morse decoding in the backend
  - [x] translate, then filter for bad words.
  - [x] add ratelimiting based on cumulative time
- reporting feature
  - [x] make frontend chat clickable, and embed msg signature in every chat domnode
  - [x] when an user clicks the report button on a message, make an api request with
       the mesage signature
  - [x] modify backend and ws api to associate an encrpyted blob signature to each message
       that is broadcasted (blocking: need server side morse translation)
- [x] prometheus metrics: 
   - [x] rejections (for all kinds of rejections provided by the auth middlewares)
   - [x] logins
   - [x] messages
   - [x] chambered messages
   - [x] reports
   - [x] ws connections gauge

# backlog 

features

-[x] nationality negotiation
-[] move to paseto (not a priority anymore)

Api endpoints

-[x] register
-[x] login
-[x] sess init
-[x] report

Crud Api endpoints

- [x] admin list moderators
- [x] admin set moderator
- [x] admin remove moderator
- [x] admin list ban activity

- [x] moderator list banned
- [x] moderator ban
- [x] moderator unban



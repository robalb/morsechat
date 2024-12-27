

# week2

- [] remove console logs in frontend
- working basics of websockets
  - [x] fix delimiters issue in ws client
  - [x] add morse message response status, both backend and frontend
  - [] stress test ws
  - [] test multiple connections
- morse decoding in the backend
  - [] translate, then filter for bad words.
  - [] add ratelimiting based on cumulative time
- reporting feature
  - [x] make frontend chat clickable, and embed msg signature in every chat domnode
  - [x] when an user clicks the report button on a message, make an api request with
       the mesage signature
  - [] modify backend and ws api to associate an encrpyted blob signature to each message
       that is broadcasted (blocking: need server side morse translation)

# backlog 

features

-[x] nationality negotiation
- move to paseto

Api endpoints

-[x] register
-[x] login
-[x] sess init
-[x] report

Crud Api endpoints

- admin list moderators
- admin set moderator
- admin remove moderator
- admin list ban activity

- moderator list banned
- moderator ban
- moderator unban



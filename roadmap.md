

# week2

- working basics of websockets
  - [x] fix delimiters issue in ws client
  - [x] add morse message response status, both backend and frontend
  - [] stress test ws
  - [] test multiple connections
- morse decoding in the backend
  - [] translate, then filter for bad words.
  - [] add ratelimiting based on cumulative time
- reporting feature
  - [x] make frontend chat clickable, and embed msg id in every chat domnode
  - [] modify backend and ws api to associate an encrpyted blob to each message
       that is broadcasted
  - [] when an user clicks the report button on a message, make an api request with
       the mesage uuid. add a Rest endpoint that consults the hub to retrieve
       the cleartext associated to the message id, and compile the report

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



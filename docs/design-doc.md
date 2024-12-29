
This is a rewrite of the current webapp,
designed to address the problems that the current
version cannot solve.

Specifically, the current version was implemented
using bad technologies, that did not age well, and are
now rotting. Some python dependencies are broken beyond repair because of missing and unpinned binary dependencies (!),
and the backend is generating too much logs.
Bots and spam is appearing on the website, and there
are no systems in place to avoid it.

The frontend is fine.
The choice of react + redux survived to this time,
except that some parts have way too much complexity.
luckily most of the web app is a presentation layer on top
of the store. only some parts (for example, the button)
implement logic that should have been in the store, and they
do it badly.


key lessons learned:
- technologies rot. when designing something, plan for longevity
and simplicity. you know the drill. choose boring technology,
avoid moving parts, avoid complexity.

requirements for a rewrite
1. must age well
2. must remain maintainable in the long run
3. must allow moderation, and user ban
4. must learn something from it.

regarding 1, 2 and 4, there are two choices to make:
- programming language and framework
- infrastructure and system architecture.

### programming language and framework:

a good solution might be to use
golang, with carefully selected libraries:
only standard libraries, or vendored code.
Golang is a stable language, easy to maintain, and with a solid
dependencies system.
I don't have any experience with it, but It's something I want to learn.

another solution is python, with solid dependencies, properly
pinned. I will not learn anything from this choice, but my knowledge
on the topic means that the project will be much more solid and
maintainable than wathever i can create in my first go project.
My experience with python would lead to using FastAPI

This project cannot start if it's not an educative experience,
therefore golang is the preferred choice

#### system architecture

Right now, i'm using mariadb. I never connected remotely to mariadb,
and I never used specific mariadb features.
Can i reduce the moving parts by moving to sqlite?

Luckily, I have solid statistics on the website usage:
- 200 daily visits
- 1200 weekly page visits
- 3000 registered users since the launch

- cuncurrent users reach a max peak of 20 users daily
- avg cuncurrent users is 1, or 2.

this is a niche project. I can cap the users in a room
to 20, which is already a huge amount of users.
with 10 rooms, this is 200 cuncurrent users max.
let's round the number to 500, just to have better margins

let's say that I have 500 users,
connected to a websocket, and all sending messages.
- can sqlite handle 500 cuncurrent writes? (absolutely, but tests are required) consider that i will only need to store metadata,
not the typed messages, and only sometimes.
- can the websocket handle 500 cuncurrent users? (absolutely)

The limited numbers in this project are worth building an initial 
mvp focused on sqlite and load tests


#### moderation and user ban

The key element to understand here is that 
this website is as simple as it gets.
I've seem some kids implementing cheats for this website
using scratch, arduino, and a mouse.

The goal is not to avoid cheats, it's to avoid bad users.
and the only way to avoid bad users is via a moderation system
and a ban.

We therefore need to implement solid infrastructure for an adversarial
game against ban evasion.

ban systems require identifiers:

- cookie
- ip
- js fingerprint
- ssl fingerprint

cookie + localstorage:
100% reliable, easy to implement, not very effective:
can be removed or changed with a click. It's simplicity
is worth being implemented

ip:
- can lead to false positives, multiple users can share an ip.
- ips change with time, if we ban an ip it must be temporary,
  after a short time it must be forgotten.
- kinda easy to implement, but we must remember to forget ips after a while.
- very easy to bypass. a good skid can have infinite ips.

js fingerprint:
- hard to maintain
- some chances of false positives where multiple users have the same id
- very hard to bypass: a good skid has infinite ips, but a very
  limited number of devices. a bypass requires reverse engineering the system. with a properly designed fingerprint system,
  we can redirect all the cat-mouse adversarial effort into
  a single point: the reverse engineering of the js.

ssl fingerprint
- hard to maintain, probably no good open source systems out there.
  lot of open source bypasses tho.
- could help to at least identify when users are not using the
  browser.


#### about the js fingerprint

v1:
some id is calclulated client-side, and is sent to the api
during the authentication.

a viable attack would be to intercept the request, or craft a new one
with a different id.

v2:
This is why the way the id is calculated must be secret, and hard to reverse

an attacker can then
1. take the fingerprint code, and run it in an iframe in an ad.
  (by treating it as a black box, it can be used to farm valid ids.)
2. run the whole website in an headless browser, or a real browser.

v3: 
by making the fingerprint code unique per user, we avoid the possibilty that our
code will be extracted and used as a black box.
headless browsers can be fingerprinted, they are not unique. they also can be detected.

there are popular headless browsers modified to be hard to detect, and avoid
fingerprinting. these project should be used as a baseline against which our
systems should be tested. This will be one of the fronts in the adversarial game.

by reverse engineering the black box, all our systems crumble.
it should therefore be as strong as possible. this will be the other front in the 
adversarial game.


#### fingerprint api ideas

https://ialab.it.monash.edu/webcola/

https://observablehq.com/@d3/force-directed-graph/2

https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/

sigmajs.org

clustering 

http://proceedings.mlr.press/v108/curtin20a/curtin20a.pdf







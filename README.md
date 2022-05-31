# <img src="https://i.imgur.com/A8fVeyP.png" height="60"> Morsechat 

[![Website](https://img.shields.io/website-up-down-green-red/http/halb.it.svg?label=morse%20chat)](https://halb.it/morsecode)
[![Online](https://img.shields.io/badge/dynamic/json.svg?label=online%20users&uri=https%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..online_users)](https://halb.it/morsecode)
[![Channels](https://img.shields.io/badge/dynamic/json.svg?label=active%20channels&uri=https%3A%2F%2Fwww.halb.it%2Fmorsecode%2Fapp%2Fgetonline.php&query=%24..channels)](https://halb.it/morsecode)
![license](https://img.shields.io/github/license/robalb/morsechat.svg)
[![docs](https://inch-ci.org/github/robalb/morsechat.svg?branch=master)](https://inch-ci.org/github/robalb/morsechat/)



A web-based morse code chat That allows you to learn morse and communicate in real time with friends without having to buy a radio. Inspired by [@bkanker](https://twitter.com/bkanber)'s web app morsecode.me

Live at [morse.halb.it](https://morse.halb.it/)

## screenshots
<p align="center">
<img src="./docs/tablet_a.png" width="600px" height="auto" />
<img src="./docs/phone.png" width="190px" height="auto" />
</p>

<!--
w 600 200
h 500 400
-->

## configuration

Copy the file env.example into .env

in the .env configure your pusher credentials.
You can generate them from your self-hosted instance of socketi (see socketi.app)
Or you can use pusher.com

## development

clone this repository `git clone https://github.com/robalb/morsechat.git`

navigate into the repository `cd morsechat`

start the api server in development mode `docker-compose up`

start vite in development mode `cd /web && npm run dev`

## production

The easiest way to run the webapp in a production environment is with the provided docker-compose.prod,
`docker-compose -f docker-compose.prod.yml up --build`
This method will also generate and manage a mariadb image, but you should replace it with something more stable


Alternatively you can deploy the app on a k8s kluster using the manifests in `kubernetes/base` but first you will need to
setup on your own a traefik ingress controller, certmanager, and a mariadb database Service.
The nginx webserver is configured to handle X-Forwarder-For headers coming from an ingress with proxy protocol enabled.
You can configure it in flaskapp.conf

The live website on halb.it is built using github workflows, and deployed on a k8s cluster with argoCD


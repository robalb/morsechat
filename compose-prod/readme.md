# production deploy

This project is deployed using the [compose-prod](https://github.com/robalb/compose-prod) system.

These are the deployment files for the docker-compose production environment. For more informations read the [compose-prod](https://github.com/robalb/compose-prod) repository.

deploy steps:

- set up the vps by following the steps in the compose-prod repository.
- copy all the .example files into real files, and configure the variables
- run the deploy command:
```
make deploy
```

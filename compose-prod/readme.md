# production deploy

These are the deployment files for the docker-compose production environment. For more informations read the my-infra repository

deploy steps:

- set up the vps by following the steps my-infra repository
- copy all the .example files into real files, and configure the variables
- run the deploy command

  ```
  ansible-playbook -i halb.it, -e "ansible_port=6477" -u al ansible-deploy.yml
  ```



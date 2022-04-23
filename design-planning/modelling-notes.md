
when exporting the model to a mysql file, there are some tweaks necessary for full mariadb compatibility:

- remove VISIBLE attributes from keys:
  UNIQUE INDEX `session_id` (`session_id` ASC) VISIBLE)
  must turn into
  UNIQUE INDEX `session_id` (`session_id` ASC) )
 


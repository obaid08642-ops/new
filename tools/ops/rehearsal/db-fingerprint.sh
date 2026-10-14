#!/bin/bash
# Rehearsal: a fingerprint of the app database (dbHash md5 + sorted collection names), to prove a task wrote nothing.
sudo docker exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin nabd_nestjs --eval "print(db.runCommand({dbHash:1}).md5, db.getCollectionNames().sort().join(\",\"))"'

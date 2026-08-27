#!/bin/bash
# Nabdah Plus DB Backup & Restore CLI tool

MONGO_URL=${MONGO_URL:-"mongodb://localhost:27017"}
DB_NAME=${DB_NAME:-"nabd_nestjs"}
BACKUP_DIR="./backups"

usage() {
  echo "Usage: $0 [backup|restore] [backup_file_path]"
  echo "  backup  : creates a new mongodump backup under ./backups"
  echo "  restore : restores a backup from the specified filepath"
  exit 1
}

if [ -z "$1" ]; then
  usage
fi

ACTION=$1

if [ "$ACTION" == "backup" ]; then
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
  OUT_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.gz"
  
  echo "Starting backup of database $DB_NAME to $OUT_FILE..."
  mongodump --uri="$MONGO_URL" --db="$DB_NAME" --archive="$OUT_FILE" --gzip
  
  if [ $? -eq 0 ]; then
    echo "Backup completed successfully! Saved to $OUT_FILE"
  else
    echo "Backup failed! Please make sure mongodump is installed and MONGO_URL is correct."
    exit 1
  fi
  
elif [ "$ACTION" == "restore" ]; then
  FILE_PATH=$2
  if [ -z "$FILE_PATH" ]; then
    echo "Error: please specify the backup file path to restore."
    usage
  fi
  
  if [ ! -f "$FILE_PATH" ]; then
    echo "Error: file $FILE_PATH does not exist."
    exit 1
  fi
  
  echo "Restoring database $DB_NAME from $FILE_PATH..."
  mongorestore --uri="$MONGO_URL" --archive="$FILE_PATH" --gzip --drop
  
  if [ $? -eq 0 ]; then
    echo "Database restore completed successfully!"
  else
    echo "Database restore failed! Please make sure mongorestore is installed and backup file is valid."
    exit 1
  fi
else
  usage
fi

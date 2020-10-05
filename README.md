# Requirements
* Nodejs
* sqlite3/MySQL/MariaDB/Postgres

# Installation
## App

1. Download the source code

```
git clone 
```
2. Install the dependence and initialise the database

```
npm install
npx knex migrate:latest
```


3. Set environment variables by copy the dot-sample and change **environment variables**
```
cp dot-env .env
```

4. Start the server
```
npm run start
```

# Environment variables

## Slack
It can be find in the slack app page

# Docker
```
docker build -t wwbot .
```

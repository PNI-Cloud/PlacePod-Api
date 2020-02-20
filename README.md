# PlacePod Web API

## Usage

Your system should have Node v10 or higher installed.

The following environment variable is required to run the server:

- POSTGRES_CONNECTION: Database connection string for postgres.

Once this value is exported, then you can start the server by
entering the following commands:

```sh
# Install required modules.
npm i

# Start the server.
npm start
```

The shell script `run.sh` shows one way to set environment variables and start the server. This assumes you
created a file in the root directory called `.env`, for example:

```
POSTGRES_CONNECTION=postgres://{USERNAME}:{PASSWORD}@{SERVER}:{PORT}/{DB_NAME}
```

Then visit `http://localhost:3000/api-docs/v1` to view a Swagger page for calling the API.

To create an initial user, provide these environment variables on startup:

- `CREATE_ADMIN=true`
- `ADMIN_NAME=your_username`
- `ADMIN_EMAIL=your@email.com`

## Database

Alternative database implementations can be easily added. There is a sample MongoDb implementation in `/datamase/mongoDb` which shows how to use another database.
First make sure the npm module `mongodb` is installed as a dependency. Then, open the file `/database.index.js`, comment out 
the postgres requires and startup variable and uncomment the mongodb requires and startup variable.

You will also need to provide the environment variable `MONGODB_CONNECTION` in for format of `mongodb://${USERNAME}:${PASSWORD}@{SERVER}:{PORT}/{DB_NAME}`.

## Docker

To build the docker image, run the following commands:

```sh
IMAGE_NAME='placepod-api'
VERSION='1'

docker build -t $IMAGE_NAME .
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${VERSION}
```

Assuming you are using `docker-compose`, now create a `.env` file and define the following:

```sh
POSTGRES_CONNECTION=postgres://username:password@postgres/db
PORT=3000

# Only include on initial user creation!
# CREATE_ADMIN=true
# ADMIN_NAME=your_username2
# ADMIN_EMAIL=your@email.com

```

To start the placepod-api docker container, run the following command:

```sh
docker-compose up
```

To stop the placepod-api docker container, run the following command:

```sh
docker-compose down
```

If you wish to use a postgres Docker image, include the following in `docker-compose.yml`:

```sh
  postgres:
    image: postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
```

and you will also want to add

```sh
    depends_on:
      - postgres
```
To the `placepod-api` service.

Then, add values like these to your `.env` file:

```sh
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DB=db

POSTGRES_CONNECTION=postgres://username:password@postgres/db
```

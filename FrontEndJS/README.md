# nodejs-express-example

## Requirements

- Nodejs
- npm

## env

A .env file is needed in the directory with the following:

```
BASE_URL=                  #This is the base url value found on the dashboard.
WEB_CLIENT_ID=             #This is a Web client ID.
MANAGEMENT_CLIENT_ID=      #This is a Backend client ID with a credential attached to it.
PRIVATE_KEY=               #This is the private key associated with <MANAGEMENT_CLIENT_ID>.
```

If `WEB_CLIENT_ID` is a private application(credential attached), make sure that it uses the same `PRIVATE_KEY` as `MANAGEMENT_CLIENT_ID`.

Here is an example of how a `.env` should look like:

```
BASE_URL=https://sandbox-usw1.api.loginid.io
WEB_CLIENT_ID=am_pUlDE1dnKq11qzIkD_KIzqyoK8t-g1dZnUdwzbGehg7p2Q3R8eLa4rNr_x7mlfMadN5GFKkSef4K2UKsoSQ
MANAGEMENT_CLIENT_ID=gbxEg41g6WLPX0ggD19fcu6pnD9q25pcUR8_Wd0swhdiIcFbpACEW7j4QAofxe_-Q8tg8KUfd9H0oPsn4cvMLA
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM4..........93Kii1dYrh2Kf8KQnjJ1v\n-----END PRIVATE KEY-----"
```

## How to Run

```
git clone https://github.com/loginid1/nodejs-express-example.git
cd nodejs-express-example
npm install
npm start
```

Project will now be found at [http://localhost:3000](http://localhost:3000).

## How to Run with Docker

1. Create and fill up .env file from above.
2. Enter `docker-compose up`
3. Project will now be found at [http://localhost:3000](http://localhost:3000).

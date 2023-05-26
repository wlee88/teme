# Teme custom slack bot

## What is Teme?
- When inspiration strikes on slack and you want to create a quick meme from a pool of photos and you know the exact text, teme is a deployable slackbot which can make this request for you

## How does it work?

Calling the app via slack command - type the name of a person and it will use this as the prefix for the configured bucket.

It expects there to be images in this prefix - and it choose one at random from dropbox

It will then print your meme text and return it to slack.


## How to deploy
- run `yarn` or `npm install`
- run the app with `yarn start` or  `npm run start`
- Can test with:
```
curl --header "Content-Type: application/x-www-form-urlencoded" \
--request POST \
--data 'text=will 22222dasdgsadgaserpnot have;TP??&command=/meme-say' \
http://localhost:3000
```

## How to install

## How to use

- add the endpoint as a custom slash command in your slack group - you can reuse this endpoint for as many custom slash commands as you want
- It's nice to give the hint [first-line];[second-line]


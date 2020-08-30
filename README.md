# Meme Say custom Slack Slash custom


## Intro
- I just wanted to fool around and see if i could get slack slash commands working
- requires `graphicsmagick`
- currently only works with heroku - aws lambda with api gateway is weird.
  
## How to use

- set this up via heroku
- set up a bucket in s3 called `wlee-meme` (sorry - made this in a rush - so no magic terraform)
- make a folder named after what you'll call your custom command (highly recommended you use the format `name-of-person-say` format) and also create a folder with the same name but with `-output` so a `wlee-say` would also have a `wlee-say-output`
- put memeable pictures in that folder (leave output folder alone).
- add the endpoint as a custom slash command in your slack group - you can reuse this endpoint for as many custom slash commands as you want - for example you could create an `ana-say` integration, and `elton-say` and despite being seperate integrations - you can use the same url.
- Finally once set up you can use `whatever-command-you-confgured` with some words seperated by `;` for a new line.

## How it works

Given a slack command (for example `alex-say`) - it will use this as the prefix for the configured bucket.

It expects there to be images in this prefix - and will choose one at random.

It will then print your meme text and return it to slack.

## Getting started

- install `graphicsmagick`
- run `yarn` or `npm install`
- run the app with `yarn start` or  `npm run start`
- Can test with:
```
curl --header "Content-Type: application/x-www-form-urlencoded" \
--request POST \
--data 'text=22222dasdgsadgaserpnot have;TP??&command=/ana-say' \
http://localhost:3000
```
- (if using within lambda  - need to run `npm install --arch=x64 --platform=linux` sharp` for distribution)

notes that aren't useful anymore but useful if we decide to use lambda again
- zip distribution as a `.zip` and use `aws s3 cp meme.zip s3://terraform-wlee-meme/v1.0.20/meme.zip`
- use `terraform apply -var="app_version=1.0.20"`

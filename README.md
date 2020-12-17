# Meme Say custom Slack Slash custom


## Intro
- I just wanted to fool around and see if i could get slack slash commands working
- requires `graphicsmagick`
- uses dropbox for a free awesomely usable solution.
  
## How to use
- Provide in github secrets HEROKU_API_KEY, HEROKU_APP_NAME, HEROKU_APP_URL, HEROKU_EMAIL, ACKLO_ACCESS_TOKEN
- ALso set up your dropbox app with full access and token key - provide this key in github actions secrets as DROPBOX_API_TOKEN. This will be passed in as an ENV variable.
- it will use `meme-say/bots` and `meme-say/generated-memes` 
- make a folder named after what you'll call your custom command (for example `alex-say`) in the `bots` folder and place your memeable pictures in that folder - ensure these images aren't too big. about 1000px is goopd
- add the endpoint as a custom slash command in your slack group - you can reuse this endpoint for as many custom slash commands as you want - for example you could create an `ana-say` integration, and `elton-say` and despite being seperate integrations - you can use the same url.
- It's nice to give the hint [first-line];[second-line]

## Example bot creation

Scenario: create a bot called lachlan
- log into the same dropbox account the dropbox app you created has.
- go into `meme-say/bots` and create a folder called lachlan and put images in there
- in slack create a custom slash command called lachlan-say(naming here is important as it must match the folder name you created) 
- use the endpoint you created when you deployed this to heroku
- success
## How it works

Given a slack command (for example `alex-say`) - it will use this as the prefix for the configured bucket.

It expects there to be images in this prefix - and will choose one at random.

It will then print your meme text and return it to slack.

## Getting started

- install `graphicsmagick`
- run `yarn` or `npm install`
- run the app with `yarn start` or  `npm run start`
- Can test with:
bot mode
```
curl --header "Content-Type: application/x-www-form-urlencoded" \
--request POST \
--data 'text=22222dasdgsadgaserpnot have;TP??&command=/ana-say' \
http://localhost:3000
```
meme-say mode
```
curl --header "Content-Type: application/x-www-form-urlencoded" \
--request POST \
--data 'text=will 22222dasdgsadgaserpnot have;TP??&command=/meme-say' \
http://localhost:3000
```
- (if using within lambda  - need to run `npm install --arch=x64 --platform=linux` sharp` for distribution)

### Notes that aren't useful anymore but useful if we decide to use lambda again
- zip distribution as a `.zip` and use `aws s3 cp meme.zip s3://terraform-wlee-meme/v1.0.20/meme.zip`
- use `terraform apply -var="app_version=1.0.20"`

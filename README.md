# Meme Say custom Slack Slash custom


## Intro
- I just wanted to fool around and see if i could get slack slash commands working
- uses dropbox for a free awesomely usable solution.
  
## How to use
- Provide in github secrets HEROKU_API_KEY, HEROKU_APP_NAME, HEROKU_APP_URL, HEROKU_EMAIL, ACKLO_ACCESS_TOKEN
- ALso set up your dropbox app with full access and token key - provide this key in github actions secrets as DROPBOX_API_TOKEN. This will be passed in as an ENV variable.
- it will use `meme-say/bots` and `meme-say/generated-memes` 
- make a folder named after what you'll call your custom command (for example `alex-say`) in the `bots` folder and place your memeable pictures in that folder - ensure these images aren't too big. about 1000px is goopd
- add the endpoint as a custom slash command in your slack group - you can reuse this endpoint for as many custom slash commands as you want - for example you could create an `ana-say` integration, and `elton-say` and despite being seperate integrations - you can use the same url.
- It's nice to give the hint [first-line];[second-line]

## Example returned payload

```
{
  "type": "block_actions",
  "user": {
    "id": "U8PB6EPTL",
    "username": "wlee",
    "name": "wlee",
    "team_id": "xxxx"
  },
  "api_app_id": "xxxx",
  "token": "xxxx",
  "container": {
    "type": "message_attachment",
    "message_ts": "xxxx.xxxx",
    "attachment_id": 1,
    "channel_id": "xxxx",
    "is_ephemeral": true,
    "is_app_unfurl": false
  },
  "trigger_id": "xxxx.xxxx",
  "team": {
    "id": "xxxx",
    "domain": "xxxx"
  },
  "enterprise": null,
  "is_enterprise_install": false,
  "channel": {
    "id": "xxxx",
    "name": "directmessage"
  },
  "state": {
    "values": {}
  },
  "response_url": "https:\\/\\/hooks.slack.com\\/actions\\/xxxxx\\/xxx\\/xxxx",
  "actions": [
    {
      "action_id": "dDBZe",
      "block_id": "AJr1V",
      "text": {
        "type": "plain_text",
        "text": "Cancel",
        "emoji": true
      },
      "value": "\\/meme-say\\/source\\/will|\\/meme-say\\/generated-memes\\/will|will i work|Will: i work|https:\\/\\/dl.dropboxusercontent.com\\/s\\/e494wigkz3xu6bq\\/cbad6159-e085-460d-a032-94c924bfbc92.jpg?dl=0",
      "style": "danger",
      "type": "button",
      "action_ts": "xxxx.xx"
    }
  ]
}
```
## How it works

Calling the app via slask command - type the name of a person and it will use this as the prefix for the configured bucket.

It expects there to be images in this prefix - and it choose one at random from dropbox

It will then print your meme text and return it to slack.

## Getting started

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

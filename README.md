# Teme custom slack bot

## What is Teme?
- An amalgamation of "meme" and "team".
- When inspiration strikes on slack and you want to create a quick meme based on a slack team member, `teme` is a deployable slackbot which can make this request for you.
- Fun fact: this was initially called `meme-say`. I was inspired by [cow-say](https://github.com/sckott/cowsay) and thought it would be great to bring this to slack.

## How does it work?

Slash command - type the name of a team member and the text like so `/teme alex hi;there`.
This will
- Find a folder called `alex` (using a storage provider of choice - currently only dropbox is supported.)
- Choose a random image
- Apply the text (top and bottom text seperated with `;`)
- Ask the user with an ephemeral message(i.e only visible to them), if the preview is adequate, with the choice of shuffling to a new random image and trying again.
- If the user chooses the image - it is sent to the channel.
- Let the fun begin.

### Setup

- Get your dropbox API key. Ensure it's a secret/ inserted as an ENV variable ([fly.io](https://fly.io/) does this nicely)
- In Dropbox - ensure you have folders which will correlate with a name/meme entity. 

## How to deploy
- TODO

## How to install
- TODO
## How to use

- add the endpoint as a custom slash command in your slack group - you can reuse this endpoint for as many custom slash commands as you want
- It's nice to give the hint [first-line];[second-line]

## Future plans
- Support for more Storage platforms. AWS S3 next.
- A web interface for adding people and photos.
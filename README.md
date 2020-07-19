# Meme Say custom Slack Slash custom


## Intro
- I just wanted to fool around and see if i could get slack slash commands working

- requires `graphicsmagick`

## Getting started

- install `graphicsmagick`
- run `yarn` or `npm install`
-  Need to run `npm install --arch=x64 --platform=linux` sharp` for distribution
- Can test with:
```
curl --header "Content-Type: application/x-www-form-urlencoded" \
--request POST \
--data 'text=22222dasdgsadgaserpnot have;TP??&command=/alex-say' \
http://localhost:3000
```
- zip distribution as a `.zip` and use `aws s3 cp meme.zip s3://terraform-wlee-meme/v1.0.20/meme.zip`
- use `terraform apply -var="app_version=1.0.20"`

## Things to do but too lazy right now

- add a linter dammit
- Typescript this up - it would be great to type the command that slacks sends and re-use this for future slack stuff.
- Add auth to only allow specific Slack spaces
- flesh out deploy-zip.sh
- terraform out the bucket names
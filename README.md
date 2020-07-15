# Alex Says custom Slack Slash 


## Intro
- I just wanted to fool around and see if i could get slack slash commands working

- requires `graphicsmagick`

## Getting started

- install `graphicsmagick`
- run `yarn` or `npm install`
-  we need to run `npm install --arch=x64 --platform=linux sharp` for distribution
- test with:
```
curl --header "Content-Type: application/x-www-form-urlencoded" \
--request POST \
--data 'text=22222dasdgsadgaserpnot have;TP??' \
http://localhost:3000
```

## Things to do but too lazy right now

- add a linter dammit
- Typescript this up - it would be great to type the command that slacks sends and re-use this for future slack stuff.
- Add auth to only allow specific Slack spaces
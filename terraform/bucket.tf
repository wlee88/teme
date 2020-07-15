resource "aws_s3_bucket" "wlee_meme" {
    bucket = "wlee_meme"
    acl = "public"
}

resource "aws_s3_bucket" "wlee_terraform" {
    bucket = "wlee_meme"
    acl = "public-read"
}
resource "aws_api_gateway_rest_api" "wlee_meme" {
  name        = "apig_wlee_meme"
  description = "Api Gateway for wlee meme"
}

output "base_url" {
  value = aws_api_gateway_deployment.wlee_meme.invoke_url
}

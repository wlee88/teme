 provider "aws" {
   region = "ap-southeast-2"
 }

variable "app_version" {
}
// Where we get the original meme files from
variable "s3_images_bucket" {
}

// Original meme prefixes
variable "s3_images_prefix" {
}

resource "aws_lambda_function" "meme" {
  function_name = "meme"

   s3_bucket = "terraform-wlee-meme"
   s3_key    = "v${var.app_version}/meme.zip"

   handler = "lambda.handler"
   runtime = "nodejs10.x"
   timeout = 10

   role = aws_iam_role.lambda_exec.arn

   environment {
     variables = {
       s3_bucket = var.s3_images_bucket
       s3_prefix = var.s3_images_prefix
     }
   }
 }

 # IAM role which dictates what other AWS services the Lambda function
 # may access.
 resource "aws_iam_role" "lambda_exec" {
   name = "terraform-wlee-meme"

   assume_role_policy = <<EOF
{
   "Version": "2012-10-17",
   "Statement": [
     {
       "Action": "sts:AssumeRole",
       "Principal": {
         "Service": "lambda.amazonaws.com"
       },
       "Effect": "Allow"
     }
  ]
 }
 EOF

}

resource "aws_api_gateway_resource" "proxy" {
   rest_api_id = aws_api_gateway_rest_api.wlee_meme.id
   parent_id   = aws_api_gateway_rest_api.wlee_meme.root_resource_id
   path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
   rest_api_id   = aws_api_gateway_rest_api.wlee_meme.id
   resource_id   = aws_api_gateway_resource.proxy.id
   http_method   = "ANY"
   authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
   rest_api_id = aws_api_gateway_rest_api.wlee_meme.id
   resource_id = aws_api_gateway_method.proxy.resource_id
   http_method = aws_api_gateway_method.proxy.http_method

   integration_http_method = "POST"
   type                    = "AWS_PROXY"
   uri                     = aws_lambda_function.meme.invoke_arn
}

resource "aws_api_gateway_method" "proxy_root" {
   rest_api_id   = aws_api_gateway_rest_api.wlee_meme.id
   resource_id   = aws_api_gateway_rest_api.wlee_meme.root_resource_id
   http_method   = "ANY"
   authorization = "NONE"
 }

resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.wlee_meme.id
  resource_id = aws_api_gateway_method.proxy_root.resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.meme.invoke_arn
}


resource "aws_api_gateway_deployment" "wlee_meme" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.lambda_root,
  ]

  rest_api_id = aws_api_gateway_rest_api.wlee_meme.id
  stage_name  = "test"
}

resource "aws_lambda_permission" "apigw" {
   statement_id  = "AllowAPIGatewayInvoke"
   action        = "lambda:InvokeFunction"
   function_name = aws_lambda_function.meme.function_name
   principal     = "apigateway.amazonaws.com"

   # The "/*/*" portion grants access from any method on any resource
   # within the API Gateway REST API.
   source_arn = "${aws_api_gateway_rest_api.wlee_meme.execution_arn}/*/*"
 }
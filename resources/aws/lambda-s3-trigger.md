---
title: Using an Amazon S3 Trigger to Invoke a Lambda Function
description: Create a Lambda function that runs automatically when an object is uploaded to an S3 bucket, outputting the object type to CloudWatch Logs.
tags: [aws, lambda, s3, serverless, beginner]
---

# Using an Amazon S3 Trigger to Invoke a Lambda Function

Lambda functions are powerful on their own, but they become genuinely useful when connected to events. In this tutorial, you configure an S3 bucket to automatically invoke a Lambda function every time a file is uploaded — no polling, no servers, no scheduling.

## How It Works

```
File uploaded to S3 bucket
        │
        ▼
S3 generates an event notification
        │
        ▼
Lambda function is invoked with event data
        │
        ▼
Function logs the object key and content type
        │
        ▼
Output appears in CloudWatch Logs
```

## Prerequisites

- AWS account with console access
- Basic understanding of IAM roles
- Python 3.11 or above (for the function code)

## Step 1 — Create the S3 Bucket

```bash
aws s3 mb s3://my-lambda-trigger-bucket-$(date +%s) --region us-east-1
```

:::info
S3 bucket names are globally unique across all AWS accounts. Adding a timestamp ensures no name collision.
:::

## Step 2 — Create the Lambda Execution Role

Your Lambda function needs permission to write logs to CloudWatch.

```json title="trust-policy.json"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
# Create the role
aws iam create-role \
  --role-name lambda-s3-trigger-role \
  --assume-role-policy-document file://trust-policy.json

# Attach the basic Lambda execution policy
aws iam attach-role-policy \
  --role-name lambda-s3-trigger-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

## Step 3 — Write the Lambda Function

```python title="handler.py"
import json
import urllib.parse
import boto3

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # The event contains details of the S3 upload that triggered this function
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(
        event['Records'][0]['s3']['object']['key'],
        encoding='utf-8'
    )

    try:
        response = s3.head_object(Bucket=bucket, Key=key)
        content_type = response['ContentType']
        size_bytes = response['ContentLength']

        print(f"New object uploaded:")
        print(f"  Bucket: {bucket}")
        print(f"  Key: {key}")
        print(f"  Content-Type: {content_type}")
        print(f"  Size: {size_bytes} bytes")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'bucket': bucket,
                'key': key,
                'content_type': content_type,
                'size_bytes': size_bytes
            })
        }

    except Exception as e:
        print(f"ERROR processing {bucket}/{key}: {str(e)}")
        raise e
```

## Step 4 — Deploy the Function

```bash
# Package the function
zip function.zip handler.py

# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create the Lambda function
aws lambda create-function \
  --function-name s3-object-type-logger \
  --runtime python3.11 \
  --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-s3-trigger-role \
  --handler handler.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30
```

## Step 5 — Add the S3 Trigger

```bash
BUCKET_NAME="your-bucket-name"
FUNCTION_ARN=$(aws lambda get-function --function-name s3-object-type-logger \
  --query 'Configuration.FunctionArn' --output text)

# Give S3 permission to invoke the function
aws lambda add-permission \
  --function-name s3-object-type-logger \
  --principal s3.amazonaws.com \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --source-arn arn:aws:s3:::${BUCKET_NAME}

# Add the trigger
aws s3api put-bucket-notification-configuration \
  --bucket ${BUCKET_NAME} \
  --notification-configuration "{
    \"LambdaFunctionConfigurations\": [
      {
        \"LambdaFunctionArn\": \"${FUNCTION_ARN}\",
        \"Events\": [\"s3:ObjectCreated:*\"]
      }
    ]
  }"
```

## Step 6 — Test It

```bash
# Upload a test file
echo "hello world" | aws s3 cp - s3://${BUCKET_NAME}/test.txt

# Check the logs (wait ~10 seconds for the invocation)
aws logs tail /aws/lambda/s3-object-type-logger --follow
```

You should see output like:
```
New object uploaded:
  Bucket: my-lambda-trigger-bucket
  Key: test.txt
  Content-Type: text/plain
  Size: 12 bytes
```

## What To Try Next

- Filter the trigger to only fire on `.jpg` files using a prefix/suffix filter in the notification config
- Add S3 permissions to the execution role and have the function move files to a different bucket based on their content type
- Add error handling that sends a notification to SNS when an unsupported file type is uploaded

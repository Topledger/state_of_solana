# S3 Integration for State of Solana

This application now uses Amazon S3 for storing chart configurations, which provides better reliability and scalability over the previous database-only approach.

## Setup

1. **AWS Credentials**

   You need to set up AWS credentials to use the S3 integration. Add your AWS credentials to the `.env.local` file (for local development) or configure them in your deployment environment:

   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

2. **S3 Bucket**

   The application is configured to use the bucket named `tl-state-of-solana`. Make sure this bucket exists in your AWS account or update the bucket name in the S3 utility file.

3. **IAM Permissions**

   The AWS user associated with your access keys needs the following permissions:
   
   - `s3:PutObject` - For saving chart configurations
   - `s3:GetObject` - For retrieving chart configurations
   - `s3:DeleteObject` - For deleting chart configurations
   - `s3:ListBucket` - For listing available charts

   Here's a sample IAM policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::tl-state-of-solana",
           "arn:aws:s3:::tl-state-of-solana/*"
         ]
       }
     ]
   }
   ```

## Testing S3 Connection

You can test the S3 connection by visiting the following endpoint:

```
/api/s3-test
```

This endpoint performs a simple write/read test to verify that the S3 connection is working properly.

Additional testing parameters:
- `/api/s3-test?action=list&prefix=charts/` - Lists all chart objects
- `/api/s3-test?action=get&key=charts/your_chart_id.json` - Gets a specific chart

## Architecture

The application now uses a dual-storage approach:

1. **Primary Storage**: Amazon S3
   - All chart configurations are stored as JSON files in S3
   - Each chart gets its own file with the pattern `charts/{chartId}.json`

2. **Backup Storage**: Database
   - The existing database storage is maintained as a backup
   - If S3 operations fail, the system falls back to the database

3. **Client-side Fallback**: Local Storage
   - If both S3 and database operations fail, the client can temporarily store charts in the browser's localStorage

This architecture provides multiple layers of redundancy to ensure chart configurations are not lost. 
import AWS from 'aws-sdk';

// Configure AWS SDK
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// S3 bucket name
const BUCKET_NAME = 'tl-state-of-solana';

// Save JSON data to S3
export async function saveToS3(key: string, data: any): Promise<boolean> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    };

    const result = await s3.upload(params).promise();
    console.log(`Successfully uploaded data to ${result.Location}`);
    return true;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return false;
  }
}

// Get JSON data from S3
export async function getFromS3<T>(key: string): Promise<T | null> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const data = await s3.getObject(params).promise();
    if (data.Body) {
      return JSON.parse(data.Body.toString('utf-8')) as T;
    }
    return null;
  } catch (error) {
    console.error('Error getting data from S3:', error);
    return null;
  }
}

// Delete an object from S3
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted ${key} from S3`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
}

// List all objects with a specific prefix from S3
export async function listFromS3(prefix: string): Promise<string[]> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const data = await s3.listObjectsV2(params).promise();
    return (data.Contents || []).map(item => item.Key || '').filter(key => key !== '');
  } catch (error) {
    console.error('Error listing objects from S3:', error);
    return [];
  }
} 
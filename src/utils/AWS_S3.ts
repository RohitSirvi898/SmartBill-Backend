import {S3Client, PutObjectCommand, GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export const uploadFileToS3 = async (fileBuffer: Buffer, fileName: string, mimeType: string)=>{
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType
    };

    const command = new PutObjectCommand(params);
    return await s3Client.send(command);
};

export const getFileViewUrl = async (fileName: string) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName
    });

    return await getSignedUrl(s3Client, command, {expiresIn: 900});
}
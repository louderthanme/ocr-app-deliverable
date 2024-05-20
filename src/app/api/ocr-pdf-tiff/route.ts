import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import vision from '@google-cloud/vision';
import { google } from '@google-cloud/vision/build/protos/protos';

const storage = new Storage();
const client = new vision.ImageAnnotatorClient();

export async function POST(request: Request) {
  const { fileUrl, mimeType } = await request.json();
  const uniqueId = uuidv4();

  const inputUri = fileUrl;
  const outputUri = `gs://documents-1533/output/output-${uniqueId}.json`;

  const requestPayload: google.cloud.vision.v1.IAsyncBatchAnnotateFilesRequest = {
    requests: [
      {
        inputConfig: {
          gcsSource: { uri: inputUri },
          mimeType,
        },
        features: [{ type: google.cloud.vision.v1.Feature.Type.DOCUMENT_TEXT_DETECTION }],
        outputConfig: {
          gcsDestination: { uri: outputUri },
          batchSize: 1,
        },
      },
    ],
  };

  const [operation] = await client.asyncBatchAnnotateFiles(requestPayload as any);
  const operationName = operation.name;

  return NextResponse.json({ operationName, uniqueId });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const operationName = searchParams.get('operationName');
  const uniqueId = searchParams.get('uniqueId');

  if (!operationName || !uniqueId) {
    return NextResponse.json({ error: 'Invalid operation name or unique ID' }, { status: 400 });
  }

  const getOperationRequest: google.longrunning.GetOperationRequest = { name: operationName, toJSON: () => ({ name: operationName }) };
  const [operation] = await client.operationsClient.getOperation(getOperationRequest);

  if (!operation.done) {
    return NextResponse.json({ done: false });
  }

  const outputFile = `output/output-${uniqueId}.json`;
  const bucketName = 'documents-1533';

  try {
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: outputFile });

    if (files.length === 0) {
      throw new Error('Output file does not exist.');
    }

    const file = files[0];
    const [content] = await file.download();
    const jsonContent = JSON.parse(content.toString('utf-8'));

    const text = jsonContent.responses?.map((res: any) => res.fullTextAnnotation?.text).filter(Boolean).join("\n");

    return NextResponse.json({ done: true, text });
  } catch (error) {
    console.error('Error during OCR processing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = false;
export const runtime = 'nodejs';

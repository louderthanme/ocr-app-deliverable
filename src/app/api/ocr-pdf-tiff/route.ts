import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import reconstructText from '@/utils/reconstructText';

// Retrieve Google Cloud credentials from environment variables
const googleCredentials = process.env.GOOGLE_CREDENTIALS;

let storage: Storage;
let visionClient: ImageAnnotatorClient;

// Initialize Google Cloud Storage and Vision client with credentials
if (googleCredentials) {
  try {
    // Decode the Base64-encoded credentials and parse them as JSON for the benefit of deployment.
    const decodedCredentials = Buffer.from(googleCredentials, 'base64').toString('utf8');
    const credentials = JSON.parse(decodedCredentials);
    storage = new Storage({ credentials });
    visionClient = new ImageAnnotatorClient({ credentials });
  } catch (error) {
    console.error('Error decoding credentials:', error);
    throw new Error('Error decoding Google Cloud credentials');
  }
} else {
  console.error('Missing Google Cloud credentials');
  throw new Error('Missing Google Cloud credentials');
}

// Handle POST requests for initiating OCR on PDF/TIFF files
export async function POST(request: Request): Promise<Response> {
  const { fileUrl, mimeType } = await request.json();
  const uniqueId = uuidv4();

  const inputUri = fileUrl;
  const outputUri = `gs://documents-1533/output/output-${uniqueId}.json`;

  // Prepare the request payload for the Google Cloud Vision API
  const requestPayload: protos.google.cloud.vision.v1.IAsyncBatchAnnotateFilesRequest = {
    requests: [
      {
        inputConfig: {
          gcsSource: { uri: inputUri },
          mimeType,
        },
        features: [{ type: protos.google.cloud.vision.v1.Feature.Type.DOCUMENT_TEXT_DETECTION }], // OCR feature we want to use
        outputConfig: {
          gcsDestination: { uri: outputUri },
          batchSize: 11, // 11 pages per batch; meaning after it hits 11 files it will stop fetching the text. I put 11 because that was my biggest file when I was testing. I think the max is 2000 looking at the docs, so you can adjust it to your needs.
        },
      },
    ],
  };

  //comparing this request to the one in the ocr-image route, the pdf's is much more complex because it has to handle multiple pages. The outputConfig is where you can set the batch size. 


  // Initiate the asynchronous batch file annotation.
  const [operation] = await visionClient.asyncBatchAnnotateFiles(requestPayload);
  const operationName = operation.name;

  return NextResponse.json({ operationName, uniqueId });
}

// Handle GET requests for checking the status of the OCR process
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const operationName = searchParams.get('operationName');
  const uniqueId = searchParams.get('uniqueId');

  if (!operationName || !uniqueId) {
    // Return an error response if the operation name or unique ID is missing
    return NextResponse.json({ error: 'Invalid operation name or unique ID' }, { status: 400 });
  }

  // Prepare the request for getting the operation status
  const getOperationRequest: protos.google.longrunning.GetOperationRequest = { name: operationName, toJSON: () => ({ name: operationName }) };
  const [operation] = await visionClient.operationsClient.getOperation(getOperationRequest);

  if (!operation.done) {
    // Return a response indicating the operation is not yet complete
    //the operation takes a while, the frontend will be polling for when done:false is true
    return NextResponse.json({ done: false });
  }

  const outputFile = `output/output-${uniqueId}.json`;
  const bucketName = 'documents-1533'; // change this to your own bucket name.

  try {
    // Retrieve the output file from Google Cloud Storage
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: outputFile });

    if (files.length === 0) {
      // Handle the case where the output file does not exist
      throw new Error('Output file does not exist.');
    }

    const file = files[0];
    const [content] = await file.download();
    const jsonContent = JSON.parse(content.toString('utf-8'));



    // Extract and structure text from all pages
    //reconstructText is a custom function to give some formatting to the text when possible check out the utils folder for more info
    //read more below...
    const textAnnotations = jsonContent.responses?.map((res: any) => reconstructText(res.fullTextAnnotation)).filter(Boolean);



    return NextResponse.json({ done: true, text: textAnnotations, pages: textAnnotations?.length });
    //read more below...

  } catch (error) {

    // Handle errors during the OCR process
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



///HOW THE RESPONSE LOOKS LIKE
// Response is an array where each element corresponds to a page in the PDF/TIFF file
// fullTextAnnotation.text contains the extracted text from the page along with the formatting it was able to detect, which includes paragraphs, words, and symbols. However advanced the more complex your formatting is the less likely it will be able to detect it properly. So sometimes the text will be quite messy. But it will all be there.
// {
//   "responses": [
//     {
//       "fullTextAnnotation": {
//         "text": "Page 1 text...",
//         "pages": [
//           {
//             "blocks": [
//               {
//                 "paragraphs": [
//                   {
//                     "words": [
//                       {
//                         "symbols": [
//                           { "text": "H" },
//                           { "text": "e" },
//                           { "text": "l" },
//                           { "text": "l" },
//                           { "text": "o" }
//                         ]
//                       }
//                     ]
//                   }
//                 ]
//               }
//             ]
//           }
//         ]
//       }
//     },
//     {
//       "fullTextAnnotation": {
//         "text": "Page 2 text...",
//         "pages": [
//           // Similar structure as above for page 2
//         ]
//       }
//     }
//   ]
// }

/// when i process the break i return this object:
// {
//   "done": true,
//   "text": [
//     "Formatted text for page 1",
//     "Formatted text for page 2"
//   ],
//   "pages": 2
// }
// this is what the polling in the frontend is looking for, when done is true it will stop polling and display the text. The text is an array of strings where each element corresponds to a page in the PDF/TIFF file. The text is formatted to the best of the OCR's ability. The pages property indicates the total number of pages in the file. This is used to display the total number of pages in the UI.
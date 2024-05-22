import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { Storage } from "@google-cloud/storage";
import reconstructText from "@/utils/reconstructText";

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

// Handle POST requests for initiating OCR on images
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Parse the file URL from the request body
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      // Return an error response if no file URL is provided
      return NextResponse.json(
        { error: "No file URL provided." },
        { status: 400 }
      );
    }

    // Prepare the request payload for the Google Cloud Vision API
    const request = {
      image: {
        source: { imageUri: fileUrl },
      },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }], // OCR feature we want to use
      imageContext: { languageHints: ["en"] },
    };

    // Perform OCR on the image
    const [result] = await visionClient.annotateImage(request);
    const detections = result.fullTextAnnotation;

    const text = detections ? reconstructText(detections) : '';

    // Return the reconstructed text in the response
    return NextResponse.json({ text });
  } catch (error) {
    // Handle errors during the OCR process
    console.error("Error during OCR processing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic"; 
export const revalidate = false; 
export const runtime = "nodejs"; 

//here is how the detection object looks like:
// {
//   "fullTextAnnotation": {
//     "text": "Full text detected in the image",
//     "pages": [
//       {
//         "blocks": [
//           {
//             "paragraphs": [
//               {
//                 "words": [
//                   {
//                     "symbols": [
//                       { "text": "H" },
//                       { "text": "e" },
//                       { "text": "l" },
//                       { "text": "l" },
//                       { "text": "o" }
//                     ],
//                     "property": {
//                       "detectedBreak": {
//                         "type": "SPACE"
//                       }
//                     }
//                   }
//                 ]
//               }
//             ]
//           }
//         ]
//       }
//     ]
//   }
// }

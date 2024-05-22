import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { Storage } from "@google-cloud/storage";
import reconstructText from "@/utils/reconstructText";

const googleCredentials = process.env.GOOGLE_CREDENTIALS;

let storage: Storage;
let visionClient: ImageAnnotatorClient;

if (googleCredentials) {
  try {
    const decodedCredentials = Buffer.from(googleCredentials, 'base64').toString('utf8');
    const credentials = JSON.parse(decodedCredentials);
    storage = new Storage({ credentials });
    visionClient = new ImageAnnotatorClient({ credentials });
  } catch (error) {
    console.error('Error decoding credentials:', error);
    throw new Error('Error decoding Google Cloud credentials');
  }
} else {
  // Handle missing credentials
  console.error('Missing Google Cloud credentials');
  throw new Error('Missing Google Cloud credentials');
}

const bucket = storage.bucket("documents-1533");

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: "No file URL provided." },
        { status: 400 }
      );
    }

    const request = {
      image: {
        source: { imageUri: fileUrl },
      },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      imageContext: { languageHints: ["en"] },
    };

    const [result] = await visionClient.annotateImage(request);
    const detections = result.fullTextAnnotation;
    console.log("Detections:", detections); // Debugging log


    const text = detections ? reconstructText(detections) : '';
    console.log("Text:", text); // Debugging log

    return NextResponse.json({ text });
  } catch (error) {
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

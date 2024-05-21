import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { Storage } from "@google-cloud/storage";
import  reconstructText from "../../../utils/reconstructText";

const storage = new Storage();
const bucket = storage.bucket("documents-1533");

const client = new ImageAnnotatorClient();

export async function POST(req: NextRequest) {
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

    const [result] = await client.annotateImage(request);
    const detections = result.fullTextAnnotation;
    const text = detections ? reconstructText(detections) : '';

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

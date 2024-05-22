import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

const googleCredentials = process.env.GOOGLE_CREDENTIALS;

let storage: Storage;

if (googleCredentials) {
  try {
    const decodedCredentials = Buffer.from(googleCredentials, 'base64').toString('utf8');
    const credentials = JSON.parse(decodedCredentials);
    storage = new Storage({ credentials });
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
    // Parse the file from the request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Create a buffer from the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Define the blob in Google Cloud Storage
    const blob = bucket.file(file.name || `upload-${Date.now()}`);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      blobStream.on("error", (err) => {
        reject(NextResponse.json({ error: err.message }, { status: 500 }));
      });

      blobStream.on("finish", async () => {
        const fileUrl = `gs://${bucket.name}/${blob.name}`;
        resolve(
          NextResponse.json(
            {
              message: "File uploaded successfully.",
              fileUrl: fileUrl, // Ensure the correct URL is returned
            },
            { status: 200 }
          )
        );
      });

      blobStream.end(buffer);
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    }
  }
}

export const dynamic = "force-dynamic"; // This makes sure the route is always dynamically rendered
export const revalidate = false; // Default revalidation behavior
export const runtime = "nodejs"; // Ensures the Node.js runtime is used

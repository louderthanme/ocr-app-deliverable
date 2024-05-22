import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

// Retrieve Google Cloud credentials from environment variables
const googleCredentials = process.env.GOOGLE_CREDENTIALS;

let storage: Storage;

// Initialize Google Cloud Storage with credentials
if (googleCredentials) {
  try {
    // Decode the Base64-encoded credentials and parse them as JSON
    const decodedCredentials = Buffer.from(googleCredentials, 'base64').toString('utf8');
    const credentials = JSON.parse(decodedCredentials);
    storage = new Storage({ credentials });
  } catch (error) {
    // Handle errors during decoding and parsing of credentials
    console.error('Error decoding credentials:', error);
    throw new Error('Error decoding Google Cloud credentials');
  }
} else {
  // Handle the case where credentials are missing
  console.error('Missing Google Cloud credentials');
  throw new Error('Missing Google Cloud credentials');
}

// Define the Google Cloud Storage bucket
const bucket = storage.bucket("documents-1533");

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Parse the uploaded file from the request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      // Return an error response if no file is uploaded
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Create a buffer from the uploaded file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Define the blob (file object) in Google Cloud Storage
    const blob = bucket.file(file.name || `upload-${Date.now()}`);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    // Return a promise to handle the file upload process
    return new Promise((resolve, reject) => {
      blobStream.on("error", (err) => {
        // Handle errors during the file upload
        reject(NextResponse.json({ error: err.message }, { status: 500 }));
      });

      blobStream.on("finish", async () => {
        // Construct the URL of the uploaded file
        const fileUrl = `gs://${bucket.name}/${blob.name}`;
        resolve(
          // Return a success response with the file URL
          NextResponse.json(
            {
              message: "File uploaded successfully.",
              fileUrl: fileUrl, // Ensure the correct URL is returned
            },
            { status: 200 }
          )
        );
      });

      // End the blob stream and upload the buffer
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

export const dynamic = "force-dynamic";
export const revalidate = false;
export const runtime = "nodejs";

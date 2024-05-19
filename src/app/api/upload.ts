import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import multer, { FileFilterCallback } from "multer";
import { Storage } from "@google-cloud/storage";

// Define the extended request type
interface ExtendedNextApiRequest extends NextApiRequest {
  file?: Express.Multer.File;
}

// Setup multer
const upload = multer({ storage: multer.memoryStorage() });

// Adapter to use multer with next-connect
const multerMiddleware = upload.single("file");
function adaptedMulter(
  req: ExtendedNextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  multerMiddleware(req as any, res as any, next);
}

// Create the router
const router = createRouter<ExtendedNextApiRequest, NextApiResponse>();

// Use adapted multer middleware
router.use(adaptedMulter).post(async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const storage = new Storage({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!),
  });

  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
  const blob = bucket.file(req.file.originalname);
  const blobStream = blob.createWriteStream({
    metadata: { contentType: req.file.mimetype },
  });

  blobStream.on("error", (err) => res.status(500).send(err.message));
  blobStream.on("finish", async () => {
    await blob.makePublic();
    res.status(200).json({
      message: "File uploaded successfully",
      url: `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
    });
  });

  blobStream.end(req.file.buffer);
});

export default router.handler({
  onError: (err, req, res) => {
    if (err instanceof Error) {
      console.error(err.stack);
      res.status(500).end(err.message);
    } else {
      console.error("Unknown error", err);
      res.status(500).end("An unknown error occurred");
    }
  },
});

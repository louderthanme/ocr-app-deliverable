import type { NextApiRequest } from "next";

declare global {
  namespace Express {
    interface Request {
      file?: File;
    }
  }
}

// Extend NextApiRequest to include the file property from multer
interface ExtendedNextApiRequest extends NextApiRequest {
  file?: Express.Multer.File;
}
// Extend NextApiRequest to include the file property from multer
interface ExtendedNextApiRequest extends NextApiRequest {
  file?: Express.Multer.File;
}

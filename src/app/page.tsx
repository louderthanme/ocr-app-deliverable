'use client'
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const { fileUrl } = await uploadResponse.json();

    // Determine file type based on extension
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "bmp", "gif", "tiff", "webp"].includes(fileType || "");
    const isPdfOrTiff = ["pdf", "tiff"].includes(fileType || "");

    if (isImage) {
      const ocrResponse = await fetch("/api/ocr/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });

      const { text } = await ocrResponse.json();
      setOcrResult(text);
    } else if (isPdfOrTiff) {
      const ocrResponse = await fetch("/api/ocr/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });

      const { operationName } = await ocrResponse.json();
      // You would need to implement logic to poll the operation status and retrieve the result.
      console.log("Operation Name:", operationName);
    } else {
      console.error("Unsupported file type.");
    }
  };

  return (
    <div>
      <h1>Upload a File for OCR</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload and Process</button>
      </form>
      {ocrResult && (
        <div>
          <h2>OCR Result</h2>
          <p>{ocrResult}</p>
        </div>
      )}
    </div>
  );
}

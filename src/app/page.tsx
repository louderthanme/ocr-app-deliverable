'use client';
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

    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult); // Debugging log

    if (!uploadResult.fileUrl) {
      console.error('Upload failed, no fileUrl returned');
      return;
    }

    const ocrResponse = await fetch("/api/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl: uploadResult.fileUrl }),
    });

    const { text } = await ocrResponse.json();
    setOcrResult(text);
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

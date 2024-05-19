'use client'
import { useState } from "react";

export default function Home() {
 const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]); // Set the file to state
    } else {
      setFile(null); // Set to null if no file is selected
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
  
    const formData = new FormData();
    formData.append("file", file);
  
    // Send the file to the API route
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
  
    const result = await response.json();
    console.log(result); // Display the result in the console for now
  };

  return (
    <div>
      <h1>Hello World</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload File</button>
      </form>
    </div>
  );
}

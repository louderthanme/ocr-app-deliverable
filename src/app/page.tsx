"use client";
import { useState, useRef } from "react";
import {
  Box,
  VStack,
  HStack,
  Button,
  Input,
  Text,
  Heading,
  useToast,
  Center,
  Flex,
} from "@chakra-ui/react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFileProcessed, setIsFileProcessed] = useState<boolean>(false);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "");
    setIsFileProcessed(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const { fileUrl } = await uploadResponse.json();

    const fileType = file.name.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "bmp", "gif", "webp"].includes(
      fileType || ""
    );
    const isPdfOrTiff = ["pdf", "tiff"].includes(fileType || "");

    if (isImage) {
      const ocrResponse = await fetch("/api/ocr-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });

      const { text } = await ocrResponse.json();
      setOcrResult(text);
    } else if (isPdfOrTiff) {
      const ocrResponse = await fetch("/api/ocr-pdf-tiff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl, mimeType: `application/${fileType}` }),
      });

      const { operationName, uniqueId } = await ocrResponse.json();

      // Polling for the operation status
      let done = false;
      let text = "";

      while (!done) {
        const statusResponse = await fetch(
          `/api/ocr-pdf-tiff?operationName=${operationName}&uniqueId=${uniqueId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const status = await statusResponse.json();

        if (status.done) {
          text = status.text;
          done = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before the next poll
        }
      }

      setOcrResult(text);
    } else {
      console.error("Unsupported file type.");
      toast({
        title: "Unsupported file type",
        description: "Please upload an image, PDF or TIFF file.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setIsProcessing(false);
    setIsFileProcessed(true);
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="red.50"
    >
      <Box p={4} bg="purple.300" borderRadius="md" boxShadow="md" maxW="md" w="full">
        <Heading as="h1" size="lg" mb={4}>
          <Center>Upload a File for OCR</Center>
        </Heading>
        {ocrResult && (
          <Box mb={4} p={4} bg="gray.100" borderRadius="md" boxShadow="inner">
            <Heading as="h2" size="md" mb={2}>
              OCR Result
            </Heading>
            <Text whiteSpace="pre-wrap">
              {ocrResult}
            </Text>
          </Box>
        )}
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <Flex align="center" width="100%" textAlign="center">
              <Button onClick={handleButtonClick} colorScheme="yellow">
                Choose File
              </Button>
              <Box
                flex="1"
                ml={3}
                p={2}
                bg={fileName ? "limegreen" : "white"}
                color={fileName ? "white" : "black"}
                borderRadius="md"
              >
                {fileName ? `${fileName} Selected` : "No File Selected"}
              </Box>
              <Input
                type="file"
                ref={inputRef}
                hidden
                onChange={handleFileChange}
              />
            </Flex>
            <Button
              type="submit"
              colorScheme="cyan"
              isLoading={isProcessing}
              isDisabled={isFileProcessed}
            >
              {isFileProcessed ? "Select a New File" : "Upload and Process"}
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
}

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
  Select,
} from "@chakra-ui/react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [ocrResults, setOcrResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFileProcessed, setIsFileProcessed] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
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

  const handlePageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPage = parseInt(event.target.value);
    setPageNumber(selectedPage);
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
      setOcrResults([text]);
      setTotalPages(1);
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
      let text = [];

      while (!done) {
        const statusResponse = await fetch(
          `/api/ocr-pdf-tiff?operationName=${operationName}&uniqueId=${uniqueId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            }
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

      setOcrResults(text);
      setTotalPages(text.length);
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
      <Box
        p={4}
        bg="purple.300"
        borderRadius="md"
        boxShadow="md"
        maxW="3xl"
        w="full"
      >
        <Heading as="h1" size="lg" mb={4}>
          <Center>Upload a File for OCR</Center>
        </Heading>
        {ocrResults.length > 0 && (
          <>
            <Box
              mb={4}
              p={4}
              bg="gray.100"
              borderRadius="md"
              boxShadow="inner"
              maxH="400px"
              overflowY="auto"
            >
              <Heading as="h2" size="md" mb={2}>
                OCR Result
              </Heading>
              <Text whiteSpace="pre-wrap">{ocrResults[pageNumber - 1]}</Text>
            </Box>
            {totalPages > 1 && (
              <Flex justifyContent="center" mb={4}>
                <Select
                  value={pageNumber}
                  onChange={handlePageChange}
                  w="auto"
                  bg="white"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <option key={page} value={page}>
                        Page {page}
                      </option>
                    )
                  )}
                </Select>
              </Flex>
            )}
          </>
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
              colorScheme={isFileProcessed ? "red" : "cyan"}
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

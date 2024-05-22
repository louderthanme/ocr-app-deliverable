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
  IconButton,
} from "@chakra-ui/react"; // Chakra UI for easy and quick styling
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";

export default function Home() {
  // State variables to manage file, OCR results, and UI states
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [ocrResults, setOcrResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFileProcessed, setIsFileProcessed] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Function to trigger file input click
  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "");
    setIsFileProcessed(false);
  };

  // Function to handle form submission and process OCR
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ // Toast is from Chakra UI, it's a notification component
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

    // Upload the file
    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const { fileUrl } = await uploadResponse.json();

    // Determine the file type and process accordingly
    const fileType = file.name.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "bmp", "gif", "webp"].includes(
      fileType || ""
    );
    const isPdfOrTiff = ["pdf", "tiff"].includes(fileType || "");

    if (isImage) {
      // Process image file
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
      // Process PDF/TIFF file
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
            },
          }
        );

        const status = await statusResponse.json();

        if (status.done) {
          text = status.text;
          done = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before the next poll. We are polling waiting for the done:true response from the backend.
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

  // Function to navigate to the previous page
  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  // Function to navigate to the next page
  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="pink.50"
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
              <Center>
                <Heading as="h2" size="md" mb={2}>
                  OCR Result
                </Heading>
              </Center>
              <Text whiteSpace="pre-wrap">{ocrResults[pageNumber - 1]}</Text>
            </Box>
            {totalPages > 1 && (
              <Flex justifyContent="center" mb={4}>
                <IconButton
                  bgColor="red.100"
                  aria-label="Previous page"
                  icon={<ChevronLeftIcon />}
                  onClick={goToPreviousPage}
                  isDisabled={pageNumber === 1}
                  mr={2}
                />
                <Center>
                  <Text>{`Page ${pageNumber} of ${totalPages}`}</Text>
                </Center>
                <IconButton
                  bgColor="red.100"
                  aria-label="Next page"
                  icon={<ChevronRightIcon />}
                  onClick={goToNextPage}
                  isDisabled={pageNumber === totalPages}
                  ml={2}
                />
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
                bg={fileName ? "limegreen" : "yellow.50"}
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

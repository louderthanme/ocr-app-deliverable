# OCR Application Deployment Documentation
## Overview

This document provides step-by-step instructions for deploying the OCR application. The application uses Google Cloud Vision for OCR processing and is deployed on Vercel. The documentation covers environment setup, deployment steps, and usage guidelines.

### Setting Up Google Cloud Storage Bucket

Disclaimer: To set up a Google Cloud bucket and enable it for your application, you will need to create a Google Cloud account. This requires providing billing information, including a credit card and, in some regions, additional identification details such as a social security number or similar. While Google Cloud offers a generous free tier and a $300 free trial for new users, you'll still need to complete the billing setup to use these services. Remember to monitor your usage to avoid unexpected charges. For more details, visit the Google Cloud Free Program page.
1. Create a Google Cloud Project
a.	Go to the Google Cloud Console.
b.	Click on the project dropdown at the top of the page and select "New Project." 
c.	Enter a name for your project and click "Create."

Note: If it’s your first time here it might try to initiate you in “My First Project,” this is okay too. You can change the name of the project on the left hamburger menu > IAM and Admin > Settings

2. Enable the Google Cloud Vision API
a.	On your project’s main screen click on APIs and services.
b.	On the side menu click  ‘Library’
c.	In the search bar look for ‘Cloud Vision API’
d.	There will be three results, you want the one with the blue logo. Named exactly ‘Cloud Vision API’
e.	Click on it and select ‘Enable’

3. Create a Service Account
a.	In the Google Cloud Console, go IAM and adming 
b.	Click " Service Account,” on the left menu, and create one.
c.	Enter a name and ID for your service account, then click "Create and Continue." You can ignore the two other optional steps.
d.	In the "Grant this service account access to project" section, add the storage admin roles
e.	Click "Done" to create the service account.

4. Generate a Key for the Service Account
a.	On the Service Accounts page, click on the service account you just created.
b.	Go to the "Keys" tab and click "Add Key" -> "Create New Key."
c.	Select "JSON" and click "Create." This will download a JSON file containing your service account credentials. Keep this Json file on your project’s root folder. Make sure to add it to .gitignore.

5. Create a Google Cloud Storage Bucket
a.	Navigate to the main project page again.
b.	Click "Create a storage bucket."
c.	Enter a name for your bucket. The name must be completely unique, add some numbers or something similar. Make note of this bucket name you will need it in the code.
d.	If you want, you can choose where your data is stored and a storage class. For this project the default already chosen options (multi-region and standard storage) are okay. Then click "Create."

6. Upload Files to the Bucket
a.	In the Google Cloud Storage browser, click on your newly created bucket.
b.	Click "Upload Files" and select the files you want to upload to try it out. We will do this via code next

## LOCAL SET UP

### Clone this repository:
Clone the Repository Clone the project using the following command:

git clone https://github.com/louderthanme/ocr-app-deliverable.git

cd ocr-app-deliverable

### Install Dependencies
yarn install
Environment Setup
1.	Prepare Google Cloud Credentials
a.	With the JSON credentials from google in your root folder preferably, run this on the terminal.
base64 -w 0 path/to/credentials.json > credentials.json.base64
Note: We are doing this because when we deploy environment variables can’t be a JSON file. 
b.	Open the new file and copy the Base64 string from the credentials.json.base64 file. It should be a single string.
2.	Set up Environment Variables
a.	Create a .env.local file.
b.	Add GOOGLE_CREDENTIALS= [the single string from base64 file]

### Running the Application Locally
Run the application using: yarn dev

### Bucket storage name.
In api/upload/route.ts

const bucket = storage.bucket("documents-1533"); //change this to the bucket name you gut earlier. You could add it in the env.local as well if you preferred.


In api/ocr-pdf-tiff
  
const bucketName = 'documents-1533'; // change this to your own bucket name.

## DEPLOYING
Add the same environment variables to the deploy.


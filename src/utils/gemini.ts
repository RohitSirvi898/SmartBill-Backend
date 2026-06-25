import {GoogleGenerativeAI} from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const extractedInvoiceData = async (fileBuffer: Buffer, mimetype:string) => {
    try{
        const model = genAi.getGenerativeModel({model:"gemini-1.5-flash"});

        const prompt = `
            Analyze this invoice image and extract the following details into a JSON object:
            - supplier_name (string)
            - invoice_number (string)
            - invoice_date (string, format YYYY-MM-DD)
            - total_amount (number or string, remove currency symbols)

            Return ONLY the raw JSON string. Do not use Markdown formatting (like \`\`\`json).
            If a field is not found, return null for that key.
        `;

        const imagePart = {
            inlineData:{
                data: fileBuffer.toString("base64"),
                mimeType: mimetype,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();

        return JSON.parse(cleanedText);
    }
    catch (error){
        console.error("Gemini Extracted Error: ", error);
        throw error;
    }
}
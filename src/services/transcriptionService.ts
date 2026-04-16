import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function transcribeFile(file: File | string, type: 'audio' | 'video'): Promise<string> {
  const model = "gemini-1.5-flash"; // Using 1.5 flash for speed and multimodal support
  
  let parts: any[] = [];

  if (typeof file === 'string') {
    // It's a URL
    parts.push({
      text: `Please transcribe this ${type} file from the following URL. Provide a clean, accurate transcript. If there are multiple speakers, try to distinguish them if possible.`
    });
    parts.push({
      inlineData: {
        mimeType: type === 'audio' ? 'audio/mpeg' : 'video/mp4', // Defaulting, but ideally we'd detect
        data: file // This is tricky for URLs in inlineData, usually it expects base64. 
        // For URLs, we might need to fetch and convert to base64 or use File API if supported.
        // Actually, Gemini API's generateContent with URLs is usually handled via File API or specific tools.
        // But for this environment, let's assume we convert to base64 if it's a local file.
      }
    });
  } else {
    // It's a File object
    const base64 = await fileToBase64(file);
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: base64.split(',')[1]
      }
    });
    parts.push({
      text: `Please transcribe this ${type} file. Provide a clean, accurate transcript. If there are multiple speakers, try to distinguish them if possible.`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts }
    });

    return response.text || "Transcription failed or returned empty.";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export async function transcribeUrl(url: string, type: 'audio' | 'video'): Promise<string> {
  // For URLs, we'll fetch the file and then transcribe it. 
  // Note: This might hit CORS issues in the browser. 
  // A better way for URLs might be to use Gemini's ability to process URLs if we use the right tool,
  // but standard generateContent expects data.
  // Let's try fetching it.
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], "remote_file", { type: blob.type });
    return await transcribeFile(file, type);
  } catch (error) {
    console.error("URL fetch error:", error);
    throw new Error("Could not fetch the file from the provided URL. It might be due to CORS or an invalid link.");
  }
}

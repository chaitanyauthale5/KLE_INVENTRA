// Local stubs for integrations to enable offline/local development

async function callGemini(prompt) {
  const apiKey = import.meta?.env?.VITE_GEMINI_API_KEY;
  const model = import.meta?.env?.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: String(prompt || '') }]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim();
  if (!text) throw new Error('Gemini API returned empty response');
  return text;
}

export async function InvokeLLM({ prompt }) {
  try {
    return await callGemini(prompt);
  } catch (e) {
    // Fallback to local stubbed responses if Gemini is not configured or fails
    const lower = (prompt || '').toLowerCase();
    if (lower.includes('panchakarma')) {
      return 'Panchakarma is a set of five Ayurvedic cleansing therapies. Please consult a qualified Ayurvedic doctor for personalized guidance.';
    }
    if (lower.includes('diet') || lower.includes('food')) {
      return 'Favor fresh, warm, and lightly spiced foods. Stay hydrated and maintain regular meal times. For tailored advice, consult a practitioner.';
    }
    return 'Namaste! I am your local AyurSutra assistant. (Gemini is not configured). How can I assist your wellness journey today?';
  }
}

export async function SendEmail({ to, subject, body }) {
  console.log('[Local SendEmail]', { to, subject, body });
  return { success: true };
}

export async function UploadFile({ file }) {
  const url = typeof window !== 'undefined' && file instanceof Blob
    ? URL.createObjectURL(file)
    : 'blob:local-upload';
  return { file_url: url, file_name: file?.name || 'uploaded.file' };
}

export async function UploadPrivateFile(file) {
  return UploadFile(file);
}

export async function CreateFileSignedUrl({ file_name }) {
  return { url: `/local-files/${encodeURIComponent(file_name || 'file')}` };
}

export async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  console.log('[Local ExtractDataFromUploadedFile]', { file_url, json_schema });
  return { status: 'ok', output: [] };
}

export async function GenerateImage({ prompt }) {
  const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
  return { url: placeholder, prompt };
}

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile,
};

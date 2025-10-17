// Local stubs for integrations to enable offline/local development

async function callGemini(prompt) {
  // Prefer backend route which uses server-side GEMINI_API_KEY
  const res = await fetch('/api/ai/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prompt: String(prompt || '') })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI backend error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = (data && data.text) || '';
  if (!text) throw new Error('AI backend returned empty response');
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

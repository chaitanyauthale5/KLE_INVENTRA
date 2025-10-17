// Local stubs for integrations to enable offline/local development

// Simple AI stub that returns a canned or rule-based response
export async function InvokeLLM({ prompt }) {
  // Very lightweight heuristic to demonstrate functionality
  const lower = (prompt || '').toLowerCase();
  if (lower.includes('panchakarma')) {
    return 'Panchakarma is a set of five Ayurvedic cleansing therapies. Please consult a qualified Ayurvedic doctor for personalized guidance.';
  }
  if (lower.includes('diet') || lower.includes('food')) {
    return 'Favor fresh, warm, and lightly spiced foods. Stay hydrated and maintain regular meal times. For tailored advice, consult a practitioner.';
  }
  return 'Namaste! I am your local AyurSutra assistant. How can I support your wellness journey today?';
}

// Email stub
export async function SendEmail({ to, subject, body }) {
  console.log('[Local SendEmail]', { to, subject, body });
  return { success: true };
}

// File upload stubs
export async function UploadFile({ file }) {
  // Create a local object URL
  const url = typeof window !== 'undefined' && file instanceof Blob
    ? URL.createObjectURL(file)
    : 'blob:local-upload';
  // Return shape expected by callers
  return { file_url: url, file_name: file?.name || 'uploaded.file' };
}

export async function UploadPrivateFile(file) {
  return UploadFile(file);
}

export async function CreateFileSignedUrl({ file_name }) {
  return { url: `/local-files/${encodeURIComponent(file_name || 'file')}` };
}

export async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  // Minimal stub that pretends to parse and returns an empty set
  // to keep the UI flow working locally.
  console.log('[Local ExtractDataFromUploadedFile]', { file_url, json_schema });
  return { status: 'ok', output: [] };
}

export async function GenerateImage({ prompt }) {
  // Return a placeholder data URL (1x1 png)
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

import axios from 'axios';
import { ThesisSchema } from './types/ThesisSchema';

export async function uploadDraft(file: File): Promise<ThesisSchema> {
  const form = new FormData();
  form.append('file', file);
  // Do NOT set Content-Type manually — browser must add the multipart boundary automatically
  const res = await axios.post<{ schema: ThesisSchema }>('/api/upload', form);
  return res.data.schema;
}

export async function generateDocx(schema: ThesisSchema): Promise<Blob> {
  const res = await axios.post('/api/generate', { thesis: schema }, { responseType: 'blob' });
  return res.data as Blob;
}

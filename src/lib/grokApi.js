// src/lib/grokApi.js - Grok xAI API via secure backend function
import { base44 } from '@/api/base44Client';

export async function callGrok(prompt, context = {}) {
  try {
    const res = await base44.functions.invoke('callGrok', { prompt, context });
    return res.data.content;
  } catch (error) {
    console.error('Grok API call failed:', error);
    return 'Grok API unavailable. Falling back to local analysis.';
  }
}
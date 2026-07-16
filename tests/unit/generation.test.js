/**
 * Tests unitaires pour le module de génération (RAG)
 */

import {
  buildRAGPrompt,
} from '../../src/modules/generation/apiClient.js';

import {
  buildRAGPrompt as buildOllamaRAGPrompt,
} from '../../src/modules/generation/ollamaClient.js';

describe('Génération - API Client (Mistral)', () => {
  describe('buildRAGPrompt', () => {
    test('should build a RAG prompt with context and question', () => {
      const context = 'Email 1: Hello world\nEmail 2: Test example';
      const question = 'What is the content?';
      
      const prompt = buildRAGPrompt(context, question);
      
      expect(prompt).toContain('Tu es un assistant utile');
      expect(prompt).toContain('Contexte :');
      expect(prompt).toContain(context);
      expect(prompt).toContain('Question :');
      expect(prompt).toContain(question);
      expect(prompt).toContain('Réponse :');
    });

    test('should handle empty context', () => {
      const prompt = buildRAGPrompt('', 'What is the content?');
      expect(prompt).toContain('Contexte :');
      expect(prompt).toContain('Question :');
    });

    test('should handle empty question', () => {
      const prompt = buildRAGPrompt('Context here', '');
      expect(prompt).toContain('Contexte :');
      expect(prompt).toContain('Question :');
    });

    test('should include instructions', () => {
      const prompt = buildRAGPrompt('Context', 'Question');
      expect(prompt).toContain('Instructions :');
      expect(prompt).toContain('Réponds uniquement en utilisant les informations du contexte');
    });
  });
});

describe('Génération - Ollama Client', () => {
  describe('buildRAGPrompt', () => {
    test('should build a RAG prompt in English', () => {
      const context = 'Email 1: Hello world\nEmail 2: Test example';
      const question = 'What is the content?';
      
      const prompt = buildOllamaRAGPrompt(context, question);
      
      expect(prompt).toContain('You are a helpful assistant');
      expect(prompt).toContain('Context:');
      expect(prompt).toContain(context);
      expect(prompt).toContain('Question:');
      expect(prompt).toContain(question);
      expect(prompt).toContain('Answer:');
    });

    test('should handle empty context', () => {
      const prompt = buildOllamaRAGPrompt('', 'What is the content?');
      expect(prompt).toContain('Context:');
      expect(prompt).toContain('Question:');
    });

    test('should handle empty question', () => {
      const prompt = buildOllamaRAGPrompt('Context here', '');
      expect(prompt).toContain('Context:');
      expect(prompt).toContain('Question:');
    });

    test('should include instructions', () => {
      const prompt = buildOllamaRAGPrompt('Context', 'Question');
      expect(prompt).toContain('Instructions:');
      expect(prompt).toContain('Answer only using the information from the context');
    });
  });
});

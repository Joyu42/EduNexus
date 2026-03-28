import { getPracticeStorage as getClientPracticeStorage } from "@/lib/client/practice-storage";

import { createPracticeSession } from "./session";
import type { PracticeStorageClient, PracticeStoragePort } from "./types";

export function createPracticeStorageAdapter(storage: PracticeStorageClient): PracticeStoragePort {
  const port: PracticeStoragePort = {
    getAllBanks: () => storage.getAllBanks(),
    createBank: (name, description, tags) => storage.createBank(name, description, tags),
    updateBank: (bank) => storage.updateBank(bank),
    deleteBank: (bankId) => storage.deleteBank(bankId),
    getQuestionsByBank: (bankId) => storage.getQuestionsByBank(bankId),
    getQuestion: (questionId) => storage.getQuestion(questionId),
    createQuestion: (question) => storage.createQuestion(question),
    updateQuestion: (question) => storage.updateQuestion(question),
    deleteQuestion: (questionId) => storage.deleteQuestion(questionId),
    getRandomQuestions: (bankId, count, filters) => storage.getRandomQuestions(bankId, count, filters),
    createRecord: (record) => storage.createRecord(record),
    addToWrongQuestions: (questionId, bankId, notes) =>
      storage.addToWrongQuestions(questionId, bankId, notes),
    markAsMastered: (questionId) => storage.markAsMastered(questionId),
    getWrongQuestions: (bankId, onlyUnmastered) => storage.getWrongQuestions(bankId, onlyUnmastered),
    deleteWrongQuestion: (questionId) => storage.deleteWrongQuestion(questionId),
    createSession: (input) => createPracticeSession(port, input),
  };

  return port;
}

let practiceStorageInstance: PracticeStoragePort | null = null;

export function getPracticeStorage(): PracticeStoragePort {
  if (!practiceStorageInstance) {
    practiceStorageInstance = createPracticeStorageAdapter(getClientPracticeStorage());
  }
  return practiceStorageInstance;
}

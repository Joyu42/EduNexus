/**
 * 练习题库本地存储模块
 * 支持题库、题目、练习记录和错题本管理
 */

// 题目类型枚举
export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  FILL_IN_BLANK = "fill_in_blank",
  SHORT_ANSWER = "short_answer",
  CODING = "coding",
}

// 题目难度枚举
export enum QuestionDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

// 题目状态
export enum QuestionStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  DRAFT = "draft",
}

// 题库类型定义
export type QuestionBank = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  vaultId?: string;
};

// 选择题选项
export type MultipleChoiceOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

// 题目类型定义
export type Question = {
  id: string;
  bankId: string;
  type: QuestionType;
  title: string;
  content: string;
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  tags: string[];
  points: number;
  timeLimit?: number; // 秒
  explanation?: string;
  hints?: string[];
  createdAt: Date;
  updatedAt: Date;
  // 选择题特有字段
  options?: MultipleChoiceOption[];
  // 填空题特有字段
  blanks?: string[];
  // 编程题特有字段
  testCases?: { input: string; expectedOutput: string }[];
  starterCode?: string;
};

// 练习记录类型定义
export type PracticeRecord = {
  id: string;
  questionId: string;
  bankId: string;
  userId?: string;
  answer: string;
  isCorrect: boolean;
  score: number;
  timeSpent: number; // 秒
  attemptCount: number;
  createdAt: Date;
  feedback?: string;
};

// 错题本类型定义
export type WrongQuestion = {
  id: string;
  questionId: string;
  bankId: string;
  userId?: string;
  wrongCount: number;
  lastWrongAt: Date;
  notes?: string;
  isMastered: boolean;
  masteredAt?: Date;
};

// IndexedDB 配置
const DB_NAME = "EduNexusPractice";
const DB_VERSION = 1;
const STORE_BANKS = "question_banks";
const STORE_QUESTIONS = "questions";
const STORE_RECORDS = "practice_records";
const STORE_WRONG = "wrong_questions";

/**
 * 初始化 IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建题库存储
      if (!db.objectStoreNames.contains(STORE_BANKS)) {
        const bankStore = db.createObjectStore(STORE_BANKS, { keyPath: "id" });
        bankStore.createIndex("name", "name", { unique: false });
        bankStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 创建题目存储
      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        const questionStore = db.createObjectStore(STORE_QUESTIONS, {
          keyPath: "id",
        });
        questionStore.createIndex("bankId", "bankId", { unique: false });
        questionStore.createIndex("type", "type", { unique: false });
        questionStore.createIndex("difficulty", "difficulty", { unique: false });
        questionStore.createIndex("status", "status", { unique: false });
        questionStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 创建练习记录存储
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        const recordStore = db.createObjectStore(STORE_RECORDS, {
          keyPath: "id",
        });
        recordStore.createIndex("questionId", "questionId", { unique: false });
        recordStore.createIndex("bankId", "bankId", { unique: false });
        recordStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 创建错题本存储
      if (!db.objectStoreNames.contains(STORE_WRONG)) {
        const wrongStore = db.createObjectStore(STORE_WRONG, { keyPath: "id" });
        wrongStore.createIndex("questionId", "questionId", { unique: false });
        wrongStore.createIndex("bankId", "bankId", { unique: false });
        wrongStore.createIndex("isMastered", "isMastered", { unique: false });
        wrongStore.createIndex("lastWrongAt", "lastWrongAt", { unique: false });
      }
    };
  });
}

/**
 * 练习题库管理类
 */
export class PracticeStorageManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDatabase();
  }

  // ==================== 题库管理 ====================

  /**
   * 获取所有题库
   */
  async getAllBanks(): Promise<QuestionBank[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_BANKS], "readonly");
      const store = transaction.objectStore(STORE_BANKS);
      const request = store.getAll();

      request.onsuccess = () => {
        const banks = request.result.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        }));
        resolve(banks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 创建题库
   */
  async createBank(
    name: string,
    description: string = "",
    tags: string[] = []
  ): Promise<QuestionBank> {
    if (!this.db) await this.initialize();

    const bank: QuestionBank = {
      id: `bank_${Date.now()}`,
      name,
      description,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      questionCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_BANKS], "readwrite");
      const store = transaction.objectStore(STORE_BANKS);
      const request = store.add(bank);

      request.onsuccess = () => resolve(bank);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新题库
   */
  async updateBank(bank: QuestionBank): Promise<void> {
    if (!this.db) await this.initialize();

    const updatedBank = {
      ...bank,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_BANKS], "readwrite");
      const store = transaction.objectStore(STORE_BANKS);
      const request = store.put(updatedBank);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除题库
   */
  async deleteBank(bankId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORE_BANKS, STORE_QUESTIONS, STORE_RECORDS, STORE_WRONG],
        "readwrite"
      );

      // 删除题库
      transaction.objectStore(STORE_BANKS).delete(bankId);

      // 删除相关题目
      const questionStore = transaction.objectStore(STORE_QUESTIONS);
      const questionIndex = questionStore.index("bankId");
      questionIndex.openCursor(IDBKeyRange.only(bankId)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 删除相关记录
      const recordStore = transaction.objectStore(STORE_RECORDS);
      const recordIndex = recordStore.index("bankId");
      recordIndex.openCursor(IDBKeyRange.only(bankId)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 删除相关错题
      const wrongStore = transaction.objectStore(STORE_WRONG);
      const wrongIndex = wrongStore.index("bankId");
      wrongIndex.openCursor(IDBKeyRange.only(bankId)).onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ==================== 题目管理 ====================

  /**
   * 获取题库下的所有题目
   */
  async getQuestionsByBank(bankId: string): Promise<Question[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUESTIONS], "readonly");
      const store = transaction.objectStore(STORE_QUESTIONS);
      const index = store.index("bankId");
      const request = index.getAll(bankId);

      request.onsuccess = () => {
        const questions = request.result.map((q: any) => ({
          ...q,
          createdAt: new Date(q.createdAt),
          updatedAt: new Date(q.updatedAt),
        }));
        resolve(questions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取单个题目
   */
  async getQuestion(questionId: string): Promise<Question | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUESTIONS], "readonly");
      const store = transaction.objectStore(STORE_QUESTIONS);
      const request = store.get(questionId);

      request.onsuccess = () => {
        if (request.result) {
          resolve({
            ...request.result,
            createdAt: new Date(request.result.createdAt),
            updatedAt: new Date(request.result.updatedAt),
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 创建题目
   */
  async createQuestion(question: Omit<Question, "id" | "createdAt" | "updatedAt">): Promise<Question> {
    if (!this.db) await this.initialize();

    const newQuestion: Question = {
      ...question,
      id: `q_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORE_QUESTIONS, STORE_BANKS],
        "readwrite"
      );

      // 添加题目
      const questionStore = transaction.objectStore(STORE_QUESTIONS);
      questionStore.add(newQuestion);

      // 更新题库计数
      const bankStore = transaction.objectStore(STORE_BANKS);
      const bankRequest = bankStore.get(question.bankId);
      bankRequest.onsuccess = () => {
        const bank = bankRequest.result;
        if (bank) {
          bank.questionCount = (bank.questionCount || 0) + 1;
          bank.updatedAt = new Date();
          bankStore.put(bank);
        }
      };

      transaction.oncomplete = () => resolve(newQuestion);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 更新题目
   */
  async updateQuestion(question: Question): Promise<void> {
    if (!this.db) await this.initialize();

    const updatedQuestion = {
      ...question,
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUESTIONS], "readwrite");
      const store = transaction.objectStore(STORE_QUESTIONS);
      const request = store.put(updatedQuestion);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除题目
   */
  async deleteQuestion(questionId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORE_QUESTIONS, STORE_BANKS, STORE_RECORDS, STORE_WRONG],
        "readwrite"
      );

      // 获取题目信息
      const questionStore = transaction.objectStore(STORE_QUESTIONS);
      const getRequest = questionStore.get(questionId);

      getRequest.onsuccess = () => {
        const question = getRequest.result;
        if (question) {
          // 删除题目
          questionStore.delete(questionId);

          // 更新题库计数
          const bankStore = transaction.objectStore(STORE_BANKS);
          const bankRequest = bankStore.get(question.bankId);
          bankRequest.onsuccess = () => {
            const bank = bankRequest.result;
            if (bank) {
              bank.questionCount = Math.max(0, (bank.questionCount || 1) - 1);
              bank.updatedAt = new Date();
              bankStore.put(bank);
            }
          };

          // 删除相关记录
          const recordStore = transaction.objectStore(STORE_RECORDS);
          const recordIndex = recordStore.index("questionId");
          recordIndex.openCursor(IDBKeyRange.only(questionId)).onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };

          // 删除相关错题
          const wrongStore = transaction.objectStore(STORE_WRONG);
          const wrongIndex = wrongStore.index("questionId");
          wrongIndex.openCursor(IDBKeyRange.only(questionId)).onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 随机抽题
   */
  async getRandomQuestions(
    bankId: string,
    count: number,
    filters?: {
      type?: QuestionType;
      difficulty?: QuestionDifficulty;
      tags?: string[];
    }
  ): Promise<Question[]> {
    let questions = await this.getQuestionsByBank(bankId);

    // 应用过滤器
    if (filters) {
      if (filters.type) {
        questions = questions.filter((q) => q.type === filters.type);
      }
      if (filters.difficulty) {
        questions = questions.filter((q) => q.difficulty === filters.difficulty);
      }
      if (filters.tags && filters.tags.length > 0) {
        questions = questions.filter((q) =>
          filters.tags!.some((tag) => q.tags.includes(tag))
        );
      }
    }

    // 只选择激活状态的题目
    questions = questions.filter((q) => q.status === QuestionStatus.ACTIVE);

    // 随机打乱并选择指定数量
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // ==================== 练习记录管理 ====================

  /**
   * 创建练习记录
   */
  async createRecord(
    record: Omit<PracticeRecord, "id" | "createdAt">
  ): Promise<PracticeRecord> {
    if (!this.db) await this.initialize();

    const newRecord: PracticeRecord = {
      ...record,
      id: `record_${Date.now()}`,
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RECORDS], "readwrite");
      const store = transaction.objectStore(STORE_RECORDS);
      const request = store.add(newRecord);

      request.onsuccess = () => resolve(newRecord);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取题目的练习记录
   */
  async getRecordsByQuestion(questionId: string): Promise<PracticeRecord[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RECORDS], "readonly");
      const store = transaction.objectStore(STORE_RECORDS);
      const index = store.index("questionId");
      const request = index.getAll(questionId);

      request.onsuccess = () => {
        const records = request.result.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取题库的练习统计
   */
  async getBankStatistics(bankId: string): Promise<{
    totalQuestions: number;
    totalAttempts: number;
    correctAttempts: number;
    averageScore: number;
    averageTime: number;
  }> {
    if (!this.db) await this.initialize();

    const questions = await this.getQuestionsByBank(bankId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RECORDS], "readonly");
      const store = transaction.objectStore(STORE_RECORDS);
      const index = store.index("bankId");
      const request = index.getAll(bankId);

      request.onsuccess = () => {
        const records: PracticeRecord[] = request.result;

        const stats = {
          totalQuestions: questions.length,
          totalAttempts: records.length,
          correctAttempts: records.filter((r) => r.isCorrect).length,
          averageScore:
            records.length > 0
              ? records.reduce((sum, r) => sum + r.score, 0) / records.length
              : 0,
          averageTime:
            records.length > 0
              ? records.reduce((sum, r) => sum + r.timeSpent, 0) / records.length
              : 0,
        };

        resolve(stats);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== 错题本管理 ====================

  /**
   * 添加到错题本
   */
  async addToWrongQuestions(
    questionId: string,
    bankId: string,
    notes?: string
  ): Promise<WrongQuestion> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_WRONG], "readwrite");
      const store = transaction.objectStore(STORE_WRONG);
      const index = store.index("questionId");
      const request = index.get(questionId);

      request.onsuccess = () => {
        let wrongQuestion: WrongQuestion;

        if (request.result) {
          // 更新现有记录
          wrongQuestion = {
            ...request.result,
            wrongCount: request.result.wrongCount + 1,
            lastWrongAt: new Date(),
            notes: notes || request.result.notes,
            isMastered: false,
            masteredAt: undefined,
          };
          store.put(wrongQuestion);
        } else {
          // 创建新记录
          wrongQuestion = {
            id: `wrong_${Date.now()}`,
            questionId,
            bankId,
            wrongCount: 1,
            lastWrongAt: new Date(),
            notes,
            isMastered: false,
          };
          store.add(wrongQuestion);
        }

        transaction.oncomplete = () => resolve(wrongQuestion);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 标记为已掌握
   */
  async markAsMastered(questionId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_WRONG], "readwrite");
      const store = transaction.objectStore(STORE_WRONG);
      const index = store.index("questionId");
      const request = index.get(questionId);

      request.onsuccess = () => {
        if (request.result) {
          const wrongQuestion = {
            ...request.result,
            isMastered: true,
            masteredAt: new Date(),
          };
          store.put(wrongQuestion);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 获取错题本
   */
  async getWrongQuestions(
    bankId?: string,
    onlyUnmastered: boolean = true
  ): Promise<WrongQuestion[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_WRONG], "readonly");
      const store = transaction.objectStore(STORE_WRONG);

      let request: IDBRequest;
      if (bankId) {
        const index = store.index("bankId");
        request = index.getAll(bankId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let wrongQuestions = request.result.map((w: any) => ({
          ...w,
          lastWrongAt: new Date(w.lastWrongAt),
          masteredAt: w.masteredAt ? new Date(w.masteredAt) : undefined,
        }));

        if (onlyUnmastered) {
          wrongQuestions = wrongQuestions.filter((w: any) => !w.isMastered);
        }

        resolve(wrongQuestions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除错题记录
   */
  async deleteWrongQuestion(questionId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_WRONG], "readwrite");
      const store = transaction.objectStore(STORE_WRONG);
      const index = store.index("questionId");
      const request = index.openCursor(IDBKeyRange.only(questionId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// 单例实例
let practiceStorageInstance: PracticeStorageManager | null = null;

/**
 * 获取练习存储管理器实例
 */
export function getPracticeStorage(): PracticeStorageManager {
  if (!practiceStorageInstance) {
    practiceStorageInstance = new PracticeStorageManager();
  }
  return practiceStorageInstance;
}

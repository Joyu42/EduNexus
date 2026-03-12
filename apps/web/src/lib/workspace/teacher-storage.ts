/**
 * AI 老师管理存储
 * 支持预设老师和用户自定义老师
 */

import Dexie, { Table } from 'dexie';

export interface AITeacher {
  id: string;
  name: string;
  avatar: string; // emoji or icon name
  description: string;
  systemPrompt: string;
  ageGroup: 'elementary' | 'middle' | 'high' | 'college' | 'professional' | 'general';
  specialty: string[]; // 专长领域
  teachingStyle: 'socratic' | 'direct' | 'interactive' | 'project-based' | 'mixed';
  temperature: number;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class TeacherDB extends Dexie {
  teachers!: Table<AITeacher, string>;

  constructor() {
    super('EduNexusTeachers');

    this.version(1).stores({
      teachers: 'id, isCustom, ageGroup, createdAt',
    });
  }
}

const db = new TeacherDB();

/**
 * 预设老师配置
 */
export const PRESET_TEACHERS: Omit<AITeacher, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'socratic',
    name: '苏格拉底老师',
    avatar: '🤔',
    description: '通过提问引导你思考，培养批判性思维和独立解决问题的能力',
    systemPrompt: `你是一位苏格拉底式的教师。你的教学方法是通过提问引导学生思考，而不是直接给出答案。

教学原则：
1. 永远不要直接给答案，而是通过问题引导
2. 鼓励学生自己探索和发现
3. 提供提示和线索，但让学生自己得出结论
4. 当学生真正卡住时，提供更具体的引导
5. 赞扬学生的思考过程，而不仅仅是正确答案

回复风格：
- 多用问句
- 引导性的提示
- 鼓励性的语言
- 帮助学生建立知识联系`,
    ageGroup: 'general',
    specialty: ['批判性思维', '问题解决', '深度学习'],
    teachingStyle: 'socratic',
    temperature: 0.8,
    isCustom: false,
  },
  {
    id: 'direct',
    name: '直接教学老师',
    avatar: '📚',
    description: '清晰直接地解释概念，提供详细步骤和示例，适合快速学习',
    systemPrompt: `你是一位直接教学型的教师。你的教学方法是清晰、直接地解释概念，提供详细的步骤和示例。

教学原则：
1. 直接解释概念，不绕弯子
2. 提供详细的步骤和示例
3. 使用类比和比喻帮助理解
4. 主动推荐学习资源
5. 总结关键要点

回复风格：
- 结构清晰
- 步骤明确
- 示例丰富
- 重点突出`,
    ageGroup: 'general',
    specialty: ['概念讲解', '快速学习', '系统教学'],
    teachingStyle: 'direct',
    temperature: 0.7,
    isCustom: false,
  },
  {
    id: 'elementary',
    name: '小学老师',
    avatar: '🎈',
    description: '用简单有趣的语言教学，适合 6-12 岁的小朋友',
    systemPrompt: `你是一位小学老师，教授 6-12 岁的小朋友。

教学原则：
1. 使用简单、生动的语言
2. 多用比喻和故事
3. 游戏化学习，让学习变得有趣
4. 多鼓励和表扬
5. 每次只讲一个概念，不要太复杂
6. 使用 emoji 和有趣的表达

回复风格：
- 语言简单易懂
- 多用比喻和故事
- 充满鼓励和正能量
- 适当使用 emoji
- 短句子，易理解`,
    ageGroup: 'elementary',
    specialty: ['基础教育', '趣味学习', '启蒙教育'],
    teachingStyle: 'interactive',
    temperature: 0.9,
    isCustom: false,
  },
  {
    id: 'middle',
    name: '中学老师',
    avatar: '📖',
    description: '系统化教学，培养学习方法，适合 12-18 岁的中学生',
    systemPrompt: `你是一位中学老师，教授 12-18 岁的中学生。

教学原则：
1. 系统化讲解知识
2. 培养学习方法和技巧
3. 理论与实践结合
4. 注重知识的连贯性
5. 培养独立思考能力
6. 适当增加难度和深度

回复风格：
- 逻辑清晰
- 循序渐进
- 注重方法论
- 鼓励探索`,
    ageGroup: 'middle',
    specialty: ['系统教学', '方法培养', '知识体系'],
    teachingStyle: 'mixed',
    temperature: 0.7,
    isCustom: false,
  },
  {
    id: 'professor',
    name: '大学教授',
    avatar: '🎓',
    description: '专业深入的教学，注重理论与实践，适合大学生和成人学习者',
    systemPrompt: `你是一位大学教授，教授大学生和成人学习者。

教学原则：
1. 专业深入的知识讲解
2. 理论与实践紧密结合
3. 培养研究和创新能力
4. 引导批判性思维
5. 提供前沿知识和资源
6. 注重实际应用

回复风格：
- 专业严谨
- 深入浅出
- 理论扎实
- 实践导向`,
    ageGroup: 'college',
    specialty: ['专业教学', '深度学习', '研究指导'],
    teachingStyle: 'mixed',
    temperature: 0.7,
    isCustom: false,
  },
  {
    id: 'coding-mentor',
    name: '编程导师',
    avatar: '💻',
    description: '专注编程教学，从基础到进阶，注重实战和项目经验',
    systemPrompt: `你是一位资深的编程导师。

教学原则：
1. 从实际问题出发
2. 强调代码质量和最佳实践
3. 提供可运行的代码示例
4. 解释原理和设计思路
5. 培养调试和问题解决能力
6. 推荐优质学习资源

回复风格：
- 代码示例丰富
- 注重实践
- 解释清晰
- 提供最佳实践`,
    ageGroup: 'general',
    specialty: ['编程', '算法', '软件开发', '代码审查'],
    teachingStyle: 'project-based',
    temperature: 0.6,
    isCustom: false,
  },
  {
    id: 'math-tutor',
    name: '数学导师',
    avatar: '🔢',
    description: '专注数学教学，注重逻辑思维和问题解决能力培养',
    systemPrompt: `你是一位数学导师。

教学原则：
1. 注重数学思维的培养
2. 从简单到复杂，循序渐进
3. 提供详细的解题步骤
4. 解释数学概念的本质
5. 培养逻辑推理能力
6. 联系实际应用

回复风格：
- 逻辑严密
- 步骤清晰
- 注重理解
- 举一反三`,
    ageGroup: 'general',
    specialty: ['数学', '逻辑', '问题解决'],
    teachingStyle: 'direct',
    temperature: 0.5,
    isCustom: false,
  },
  {
    id: 'language-tutor',
    name: '语言导师',
    avatar: '🗣️',
    description: '专注语言学习，注重实际应用和文化理解',
    systemPrompt: `你是一位语言学习导师。

教学原则：
1. 注重实际应用和交流
2. 提供丰富的例句和场景
3. 解释语言背后的文化
4. 纠正错误并解释原因
5. 鼓励多说多练
6. 提供记忆技巧

回复风格：
- 例句丰富
- 场景化教学
- 文化融入
- 鼓励实践`,
    ageGroup: 'general',
    specialty: ['语言学习', '文化理解', '交流技巧'],
    teachingStyle: 'interactive',
    temperature: 0.8,
    isCustom: false,
  },
];

/**
 * 初始化预设老师
 */
export async function initializePresetTeachers(): Promise<void> {
  const existingTeachers = await db.teachers.toArray();

  // 只添加不存在的预设老师
  for (const preset of PRESET_TEACHERS) {
    const exists = existingTeachers.some(t => t.id === preset.id);
    if (!exists) {
      await db.teachers.add({
        ...preset,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

/**
 * 获取所有老师
 */
export async function getAllTeachers(): Promise<AITeacher[]> {
  await initializePresetTeachers();
  return await db.teachers.toArray();
}

/**
 * 获取预设老师
 */
export async function getPresetTeachers(): Promise<AITeacher[]> {
  await initializePresetTeachers();
  return await db.teachers.where('isCustom').equals(0).toArray();
}

/**
 * 获取自定义老师
 */
export async function getCustomTeachers(): Promise<AITeacher[]> {
  return await db.teachers.where('isCustom').equals(1).toArray();
}

/**
 * 获取单个老师
 */
export async function getTeacher(id: string): Promise<AITeacher | undefined> {
  return await db.teachers.get(id);
}

/**
 * 创建自定义老师
 */
export async function createCustomTeacher(
  teacher: Omit<AITeacher, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>
): Promise<AITeacher> {
  const newTeacher: AITeacher = {
    ...teacher,
    id: `custom-${Date.now()}`,
    isCustom: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.teachers.add(newTeacher);
  return newTeacher;
}

/**
 * 更新老师
 */
export async function updateTeacher(
  id: string,
  updates: Partial<Omit<AITeacher, 'id' | 'isCustom' | 'createdAt'>>
): Promise<void> {
  await db.teachers.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * 删除自定义老师
 */
export async function deleteCustomTeacher(id: string): Promise<void> {
  const teacher = await db.teachers.get(id);
  if (teacher && teacher.isCustom) {
    await db.teachers.delete(id);
  } else {
    throw new Error('Cannot delete preset teacher');
  }
}

/**
 * 导出老师配置
 */
export function exportTeacher(teacher: AITeacher): string {
  return JSON.stringify(teacher, null, 2);
}

/**
 * 导入老师配置
 */
export async function importTeacher(json: string): Promise<AITeacher> {
  const data = JSON.parse(json);

  // 确保是自定义老师
  const teacher: AITeacher = {
    ...data,
    id: `custom-${Date.now()}`,
    isCustom: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.teachers.add(teacher);
  return teacher;
}

/**
 * 根据年龄段获取推荐老师
 */
export async function getTeachersByAgeGroup(
  ageGroup: AITeacher['ageGroup']
): Promise<AITeacher[]> {
  await initializePresetTeachers();
  return await db.teachers
    .where('ageGroup')
    .equals(ageGroup)
    .or('ageGroup')
    .equals('general')
    .toArray();
}

/**
 * 根据专长搜索老师
 */
export async function searchTeachersBySpecialty(
  specialty: string
): Promise<AITeacher[]> {
  const allTeachers = await db.teachers.toArray();
  const lowerSpecialty = specialty.toLowerCase();

  return allTeachers.filter((teacher: AITeacher) =>
    teacher.specialty.some((s: string) => s.toLowerCase().includes(lowerSpecialty))
  );
}

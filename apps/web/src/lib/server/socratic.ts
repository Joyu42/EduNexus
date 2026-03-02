export function buildSocraticGuidance(input: {
  userInput: string;
  currentLevel: number;
}) {
  const normalized = input.userInput.trim();
  const nextLevel = Math.min(input.currentLevel + 1, 4);

  if (nextLevel === 2) {
    return {
      nextLevel,
      guidance: `你已经给出初始思路。下一步请补充“已知条件”和“目标量”，再说明准备使用的公式。当前输入摘录：${normalized.slice(0, 60)}`
    };
  }

  if (nextLevel === 3) {
    return {
      nextLevel,
      guidance:
        "很好。请把解题拆成 3 个步骤：条件整理 -> 公式代入 -> 结果检验。先写出第 1 步的具体表达式，我再帮你检查。"
    };
  }

  if (nextLevel === 4) {
    return {
      nextLevel,
      guidance:
        "你已接近完成。请先提交简短反思（你本题最容易错的点），系统通过后才会开放最终答案。"
    };
  }

  return {
    nextLevel: input.currentLevel,
    guidance: "请先输入你当前的思考过程，我会继续引导。"
  };
}

export function shouldUnlockFinal(reflection?: string) {
  if (!reflection) {
    return {
      unlocked: false,
      reason: "请先提交反思内容，说明你本题的关键误区。"
    };
  }
  if (reflection.trim().length < 20) {
    return {
      unlocked: false,
      reason: "反思内容过短，请至少写出一个误区和一个改进动作。"
    };
  }
  return {
    unlocked: true,
    reason: ""
  };
}

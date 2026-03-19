import { getKBStorage, type KBDocument } from '@/lib/client/kb-storage';

/**
 * 快速创建选项
 */
export interface QuickCreateOptions {
  title?: string;
  content: string;
  tags?: string[];
  vaultId?: string;
  template?: string;
  linkedNodeId?: string;
  linkedNodeLabel?: string;
  autoGenerateTitle?: boolean;
  autoExtractTags?: boolean;
}

/**
 * 创建结果
 */
export interface CreateResult {
  success: boolean;
  document?: KBDocument;
  error?: string;
}

/**
 * 快速创建服务类
 *
 * 统一处理不同入口的笔记创建逻辑
 */
class QuickCreateService {
  private storage = getKBStorage();

  /**
   * 从空白创建笔记
   */
  async createBlank(options: QuickCreateOptions): Promise<CreateResult> {
    try {
      const { title, content, tags = [], vaultId } = options;

      if (!vaultId) {
        return {
          success: false,
          error: '请先选择一个知识库',
        };
      }

      const finalTitle = title || this.generateTitle(content);
      const finalTags = tags.length > 0 ? tags : this.extractTags(content);

      const document = await this.storage.createDocument(
        vaultId,
        finalTitle,
        content,
        finalTags
      );

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Failed to create blank note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 从模板创建笔记
   */
  async createFromTemplate(options: QuickCreateOptions): Promise<CreateResult> {
    try {
      const { title, content, tags = [], vaultId, template } = options;

      if (!vaultId) {
        return {
          success: false,
          error: '请先选择一个知识库',
        };
      }

      // 如果有模板，应用模板内容
      let finalContent = content;
      if (template) {
        // 这里可以扩展模板应用逻辑
        finalContent = this.applyTemplate(template, content);
      }

      const finalTitle = title || this.generateTitle(finalContent);
      const finalTags = tags.length > 0 ? tags : this.extractTags(finalContent);

      const document = await this.storage.createDocument(
        vaultId,
        finalTitle,
        finalContent,
        finalTags
      );

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Failed to create note from template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 快速记录
   */
  async quickNote(options: QuickCreateOptions): Promise<CreateResult> {
    try {
      const { title, content, tags = [], vaultId } = options;

      if (!vaultId) {
        return {
          success: false,
          error: '请先选择一个知识库',
        };
      }

      const finalTitle = title || `快速记录 - ${new Date().toLocaleString('zh-CN')}`;
      const finalTags = ['快速记录', ...tags];

      const document = await this.storage.createDocument(
        vaultId,
        finalTitle,
        content,
        finalTags
      );

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Failed to create quick note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 从选中文字创建笔记
   */
  async createFromSelection(
    selectedText: string,
    options: Partial<QuickCreateOptions> = {}
  ): Promise<CreateResult> {
    try {
      const { vaultId, tags = [] } = options;

      if (!vaultId) {
        return {
          success: false,
          error: '请先选择一个知识库',
        };
      }

      if (!selectedText.trim()) {
        return {
          success: false,
          error: '选中的文本为空',
        };
      }

      const title = this.generateTitle(selectedText);
      const extractedTags = this.extractTags(selectedText);
      const finalTags = [...new Set([...tags, ...extractedTags])];

      const document = await this.storage.createDocument(
        vaultId,
        title,
        selectedText,
        finalTags
      );

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Failed to create note from selection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 从知识星图节点创建笔记
   */
  async createFromKnowledgeGraph(options: QuickCreateOptions): Promise<CreateResult> {
    try {
      const {
        title,
        content,
        tags = [],
        vaultId,
        linkedNodeId,
        linkedNodeLabel,
      } = options;

      if (!vaultId) {
        return {
          success: false,
          error: '请先选择一个知识库',
        };
      }

      const finalTitle = title || `笔记 - ${linkedNodeLabel || '未命名节点'}`;
      const finalTags = linkedNodeLabel
        ? [...new Set([...tags, linkedNodeLabel])]
        : tags;

      // 在内容中添加节点链接
      let finalContent = content;
      if (linkedNodeLabel) {
        finalContent = `[[${linkedNodeLabel}]]\n\n${content}`;
      }

      const document = await this.storage.createDocument(
        vaultId,
        finalTitle,
        finalContent,
        finalTags
      );

      // 可以在这里添加与知识图谱的关联逻辑
      if (linkedNodeId) {
        // TODO: 关联到知识图谱节点
        console.log('Linking to knowledge graph node:', linkedNodeId);
      }

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Failed to create note from knowledge graph:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 自动生成标题
   */
  private generateTitle(content: string): string {
    // 提取第一行作为标题
    const firstLine = content.split('\n')[0].trim();

    if (firstLine) {
      // 移除 Markdown 标题符号
      const title = firstLine.replace(/^#+\s*/, '');
      // 限制长度
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }

    // 如果第一行为空，使用时间戳
    return `笔记 - ${new Date().toLocaleString('zh-CN')}`;
  }

  /**
   * 提取标签
   */
  private extractTags(content: string): string[] {
    const tagRegex = /#([^\s#]+)/g;
    const matches = content.matchAll(tagRegex);
    const tags = Array.from(matches, (m) => m[1]);
    return [...new Set(tags)];
  }

  /**
   * 应用模板
   */
  private applyTemplate(templateId: string, content: string): string {
    // 这里可以实现模板应用逻辑
    // 目前简单返回原内容
    return content;
  }

  /**
   * 批量创建笔记
   */
  async createBatch(
    items: QuickCreateOptions[],
    vaultId: string
  ): Promise<CreateResult[]> {
    const results: CreateResult[] = [];

    for (const item of items) {
      const result = await this.createBlank({
        ...item,
        vaultId,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * 验证创建选项
   */
  validateOptions(options: QuickCreateOptions): { valid: boolean; error?: string } {
    if (!options.content || !options.content.trim()) {
      return {
        valid: false,
        error: '内容不能为空',
      };
    }

    if (options.title && options.title.length > 200) {
      return {
        valid: false,
        error: '标题长度不能超过 200 个字符',
      };
    }

    if (options.tags && options.tags.length > 20) {
      return {
        valid: false,
        error: '标签数量不能超过 20 个',
      };
    }

    return { valid: true };
  }
}

// 导出单例
export const quickCreateService = new QuickCreateService();

// 导出便捷方法
export const createBlankNote = (options: QuickCreateOptions) =>
  quickCreateService.createBlank(options);

export const createFromTemplate = (options: QuickCreateOptions) =>
  quickCreateService.createFromTemplate(options);

export const createQuickNote = (options: QuickCreateOptions) =>
  quickCreateService.quickNote(options);

export const createFromSelection = (selectedText: string, options?: Partial<QuickCreateOptions>) =>
  quickCreateService.createFromSelection(selectedText, options);

export const createFromKnowledgeGraph = (options: QuickCreateOptions) =>
  quickCreateService.createFromKnowledgeGraph(options);

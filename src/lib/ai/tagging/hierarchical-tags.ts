/**
 * 标签层级结构支持 - T105
 * 实现标签的父子关系和层级管理功能
 */

import {
  ContentTag,
  TagType,
  TagCategory,
  TagSource,
  GeneratedTag,
  TagGenerationRequest
} from './types';

/**
 * 标签层级关系
 */
export interface TagHierarchy {
  tagId: string;
  parentId?: string;
  children: string[];
  level: number;
  path: string[]; // 从根节点到当前节点的路径
  depth: number; // 子树深度
}

/**
 * 层级配置
 */
export interface HierarchyConfig {
  maxDepth: number; // 最大层级深度
  maxChildren: number; // 每个节点的最大子节点数
  enableInheritance: boolean; // 是否启用属性继承
  autoClassification: boolean; // 是否自动分类层级
}

/**
 * 标签层级管理器
 */
export class TagHierarchyManager {
  private hierarchies: Map<string, TagHierarchy> = new Map();
  private config: HierarchyConfig;
  private rootTags: Set<string> = new Set();

  constructor(config: Partial<HierarchyConfig> = {}) {
    this.config = {
      maxDepth: 5,
      maxChildren: 20,
      enableInheritance: true,
      autoClassification: true,
      ...config
    };

    this.initializeDefaultHierarchy();
  }

  /**
   * 初始化默认层级结构
   */
  private initializeDefaultHierarchy(): void {
    // 默认的层级关系映射
    const defaultRelations = [
      // 科技层级
      { parent: 'technology', children: ['ai-ml', 'web-dev', 'mobile-dev'] },
      { parent: 'ai-ml', children: ['machine-learning', 'deep-learning', 'neural-networks'] },
      { parent: 'web-dev', children: ['frontend', 'backend', 'fullstack'] },
      { parent: 'mobile-dev', children: ['ios', 'android', 'cross-platform'] },

      // 商业层级
      { parent: 'business', children: ['startup', 'marketing', 'finance'] },
      { parent: 'startup', children: ['seed-funding', 'growth-hacking', 'product-market-fit'] },
      { parent: 'marketing', children: ['digital-marketing', 'content-marketing', 'social-media'] },

      // 教育层级
      { parent: 'education', children: ['programming', 'language', 'academic'] },
      { parent: 'programming', children: ['algorithms', 'data-structures', 'design-patterns'] },
      { parent: 'language', children: ['english', 'japanese', 'french'] },

      // 健康层级
      { parent: 'health', children: ['fitness', 'nutrition', 'mental-health'] },
      { parent: 'fitness', children: ['cardio', 'strength', 'flexibility'] },
      { parent: 'nutrition', children: ['diet', 'supplements', 'meal-planning'] }
    ];

    // 构建层级关系
    for (const relation of defaultRelations) {
      this.addChildTag(relation.parent, relation.children);
    }
  }

  /**
   * 添加子标签
   */
  addChildTag(parentId: string, childIds: string | string[]): boolean {
    const childIdArray = Array.isArray(childIds) ? childIds : [childIds];

    // 检查是否存在循环引用
    for (const childId of childIdArray) {
      if (this.wouldCreateCycle(parentId, childId)) {
        console.warn(`添加子标签失败: 会创建循环引用 ${parentId} -> ${childId}`);
        return false;
      }
    }

    // 确保父标签存在
    if (!this.hierarchies.has(parentId)) {
      this.createHierarchyNode(parentId);
    }

    const parentHierarchy = this.hierarchies.get(parentId)!;

    // 检查子节点数量限制
    if (parentHierarchy.children.length + childIdArray.length > this.config.maxChildren) {
      console.warn(`添加子标签失败: 父标签 ${parentId} 的子节点数量超过限制`);
      return false;
    }

    // 添加子节点
    for (const childId of childIdArray) {
      // 确保子标签存在
      if (!this.hierarchies.has(childId)) {
        this.createHierarchyNode(childId);
      }

      const childHierarchy = this.hierarchies.get(childId)!;

      // 设置父子关系
      if (!parentHierarchy.children.includes(childId)) {
        parentHierarchy.children.push(childId);
      }

      // 更新子节点的父级信息
      childHierarchy.parentId = parentId;
      childHierarchy.level = parentHierarchy.level + 1;

      // 检查深度限制
      if (childHierarchy.level > this.config.maxDepth) {
        console.warn(`警告: 标签 ${childId} 的层级深度 ${childHierarchy.level} 超过限制 ${this.config.maxDepth}`);
      }

      // 更新路径
      childHierarchy.path = [...parentHierarchy.path, parentId];
      this.updateDescendantPaths(childId);
    }

    // 更新深度统计
    this.updateDepthStats(parentId);

    return true;
  }

  /**
   * 移除子标签
   */
  removeChildTag(parentId: string, childId: string): boolean {
    const parentHierarchy = this.hierarchies.get(parentId);
    const childHierarchy = this.hierarchies.get(childId);

    if (!parentHierarchy || !childHierarchy) {
      return false;
    }

    // 从父节点的子节点列表中移除
    const index = parentHierarchy.children.indexOf(childId);
    if (index > -1) {
      parentHierarchy.children.splice(index, 1);
    }

    // 清除子节点的父级信息
    childHierarchy.parentId = undefined;
    childHierarchy.level = 0;
    childHierarchy.path = [];

    // 更新所有后代节点的路径和层级
    this.updateDescendantPaths(childId);

    // 更新深度统计
    this.updateDepthStats(parentId);

    return true;
  }

  /**
   * 获取标签的子节点
   */
  getChildren(tagId: string, immediateOnly: boolean = true): string[] {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy) {
      return [];
    }

    if (immediateOnly) {
      return [...hierarchy.children];
    }

    // 获取所有后代节点
    const allDescendants: string[] = [];
    const collectDescendants = (currentId: string) => {
      const current = this.hierarchies.get(currentId);
      if (current) {
        for (const childId of current.children) {
          allDescendants.push(childId);
          collectDescendants(childId);
        }
      }
    };

    collectDescendants(tagId);
    return allDescendants;
  }

  /**
   * 获取标签的父节点
   */
  getParent(tagId: string): string | undefined {
    const hierarchy = this.hierarchies.get(tagId);
    return hierarchy?.parentId;
  }

  /**
   * 获取标签的祖先节点
   */
  getAncestors(tagId: string): string[] {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy) {
      return [];
    }

    return [...hierarchy.path];
  }

  /**
   * 获取标签的兄弟节点
   */
  getSiblings(tagId: string): string[] {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy || !hierarchy.parentId) {
      return [];
    }

    const parentHierarchy = this.hierarchies.get(hierarchy.parentId);
    if (!parentHierarchy) {
      return [];
    }

    return parentHierarchy.children.filter(childId => childId !== tagId);
  }

  /**
   * 获取标签的完整路径
   */
  getPath(tagId: string): string[] {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy) {
      return [];
    }

    return [...hierarchy.path, tagId];
  }

  /**
   * 获取根节点
   */
  getRootTags(): string[] {
    return Array.from(this.rootTags);
  }

  /**
   * 获取层级树
   */
  getHierarchyTree(): HierarchicalTree {
    const tree: HierarchicalTree = {};

    // 从根节点开始构建树
    for (const rootId of this.rootTags) {
      tree[rootId] = this.buildSubtree(rootId);
    }

    return tree;
  }

  /**
   * 应用层级继承
   */
  applyInheritance(tags: GeneratedTag[]): GeneratedTag[] {
    if (!this.config.enableInheritance) {
      return tags;
    }

    for (const tagData of tags) {
      const inherited = this.getInheritedProperties(tagData.tag.id);
      if (inherited) {
        // 合并继承的属性
        tagData.tag = {
          ...tagData.tag,
          weight: Math.max(tagData.tag.weight, inherited.weight * 0.8), // 继承的权重打8折
          metadata: {
            ...tagData.tag.metadata,
            color: tagData.tag.metadata?.color || inherited.color,
            icon: tagData.tag.metadata?.icon || inherited.icon
          }
        };

        tagData.reasoning += ` [继承自: ${inherited.ancestorName}]`;
      }
    }

    return tags;
  }

  /**
   * 自动分类标签到层级
   */
  async autoClassifyTags(tags: GeneratedTag[], request: TagGenerationRequest): Promise<GeneratedTag[]> {
    if (!this.config.autoClassification) {
      return tags;
    }

    for (const tagData of tags) {
      const suggestedParent = this.suggestParent(tagData.tag, request);
      if (suggestedParent && !tagData.tag.parentId) {
        tagData.tag.parentId = suggestedParent;
        tagData.reasoning += ` [自动分类到: ${suggestedParent}]`;
      }
    }

    return tags;
  }

  /**
   * 搜索层级路径
   */
  searchByPath(query: string): Array<{ tagId: string; path: string[]; matchType: 'exact' | 'partial' }> {
    const results: Array<{ tagId: string; path: string[]; matchType: 'exact' | 'partial' }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [tagId, hierarchy] of this.hierarchies) {
      const path = this.getPath(tagId);
      const pathString = path.join(' > ').toLowerCase();

      if (pathString === lowerQuery) {
        results.push({ tagId, path, matchType: 'exact' });
      } else if (pathString.includes(lowerQuery)) {
        results.push({ tagId, path, matchType: 'partial' });
      }
    }

    return results.sort((a, b) => {
      // 精确匹配优先
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;

      // 路径长度短的优先
      return a.path.length - b.path.length;
    });
  }

  /**
   * 验证层级关系
   */
  validateHierarchy(): HierarchyValidationResult {
    const issues: HierarchyIssue[] = [];

    // 检查循环引用
    for (const [tagId, hierarchy] of this.hierarchies) {
      if (this.hasCycle(tagId, new Set())) {
        issues.push({
          type: 'cycle',
          tagId,
          message: `标签 ${tagId} 存在循环引用`,
          severity: 'error'
        });
      }
    }

    // 检查深度限制
    for (const [tagId, hierarchy] of this.hierarchies) {
      if (hierarchy.level > this.config.maxDepth) {
        issues.push({
          type: 'max_depth_exceeded',
          tagId,
          message: `标签 ${tagId} 的层级深度 ${hierarchy.level} 超过限制 ${this.config.maxDepth}`,
          severity: 'warning'
        });
      }
    }

    // 检查子节点数量限制
    for (const [tagId, hierarchy] of this.hierarchies) {
      if (hierarchy.children.length > this.config.maxChildren) {
        issues.push({
          type: 'max_children_exceeded',
          tagId,
          message: `标签 ${tagId} 的子节点数量 ${hierarchy.children.length} 超过限制 ${this.config.maxChildren}`,
          severity: 'warning'
        });
      }
    }

    // 检查孤儿节点
    for (const [tagId, hierarchy] of this.hierarchies) {
      if (hierarchy.level > 0 && !hierarchy.parentId) {
        issues.push({
          type: 'orphan_node',
          tagId,
          message: `标签 ${tagId} 有层级但没有父节点`,
          severity: 'warning'
        });
      }
    }

    return {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues,
      totalNodes: this.hierarchies.size,
      maxDepth: Math.max(...Array.from(this.hierarchies.values()).map(h => h.level)),
      totalEdges: Array.from(this.hierarchies.values()).reduce((sum, h) => sum + h.children.length, 0)
    };
  }

  /**
   * 导出层级结构
   */
  exportHierarchy(): string {
    const data = {
      hierarchies: Array.from(this.hierarchies.entries()),
      config: this.config,
      rootTags: Array.from(this.rootTags),
      exportTime: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入层级结构
   */
  importHierarchy(data: string): boolean {
    try {
      const importData = JSON.parse(data);

      if (!importData.hierarchies || !importData.config) {
        throw new Error('导入数据格式不正确');
      }

      // 清空现有数据
      this.hierarchies.clear();
      this.rootTags.clear();

      // 导入配置
      this.config = { ...this.config, ...importData.config };

      // 导入层级数据
      for (const [tagId, hierarchy] of importData.hierarchies) {
        this.hierarchies.set(tagId, hierarchy);
      }

      // 导入根节点
      for (const rootId of importData.rootTags) {
        this.rootTags.add(rootId);
      }

      return true;
    } catch (error) {
      console.error('导入层级结构失败:', error);
      return false;
    }
  }

  /**
   * 创建层级节点
   */
  private createHierarchyNode(tagId: string): void {
    const hierarchy: TagHierarchy = {
      tagId,
      children: [],
      level: 0,
      path: [],
      depth: 0
    };

    this.hierarchies.set(tagId, hierarchy);

    // 如果没有父节点，则作为根节点
    this.rootTags.add(tagId);
  }

  /**
   * 检查是否会创建循环引用
   */
  private wouldCreateCycle(parentId: string, childId: string): boolean {
    // 检查从childId向上是否能到达parentId
    let currentId: string | undefined = childId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      if (currentId === parentId) {
        return true;
      }
      currentId = this.hierarchies.get(currentId)?.parentId;
    }

    return false;
  }

  /**
   * 检查是否存在循环引用
   */
  private hasCycle(tagId: string, visited: Set<string>): boolean {
    if (visited.has(tagId)) {
      return true;
    }

    visited.add(tagId);
    const hierarchy = this.hierarchies.get(tagId);

    if (hierarchy) {
      for (const childId of hierarchy.children) {
        if (this.hasCycle(childId, new Set(visited))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 更新后代节点的路径
   */
  private updateDescendantPaths(tagId: string): void {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy) return;

    for (const childId of hierarchy.children) {
      const childHierarchy = this.hierarchies.get(childId);
      if (childHierarchy) {
        childHierarchy.path = [...hierarchy.path, tagId];
        childHierarchy.level = hierarchy.level + 1;
        this.updateDescendantPaths(childId);
      }
    }
  }

  /**
   * 更新深度统计
   */
  private updateDepthStats(tagId: string): void {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy) return;

    let maxChildDepth = 0;
    for (const childId of hierarchy.children) {
      const childHierarchy = this.hierarchies.get(childId);
      if (childHierarchy) {
        maxChildDepth = Math.max(maxChildDepth, childHierarchy.depth);
      }
    }

    hierarchy.depth = maxChildDepth + 1;

    // 向上更新父节点的深度
    if (hierarchy.parentId) {
      this.updateDepthStats(hierarchy.parentId);
    }
  }

  /**
   * 构建子树
   */
  private buildSubtree(tagId: string): TreeNode {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy) {
      return { id: tagId, children: [] };
    }

    const node: TreeNode = {
      id: tagId,
      children: []
    };

    for (const childId of hierarchy.children) {
      node.children.push(this.buildSubtree(childId));
    }

    return node;
  }

  /**
   * 获取继承属性
   */
  private getInheritedProperties(tagId: string): { weight: number; color?: string; icon?: string; ancestorName: string } | null {
    const hierarchy = this.hierarchies.get(tagId);
    if (!hierarchy || hierarchy.path.length === 0) {
      return null;
    }

    // 从最近的祖先开始查找
    for (let i = hierarchy.path.length - 1; i >= 0; i--) {
      const ancestorId = hierarchy.path[i];
      // 这里需要获取实际的标签对象，简化处理
      // 实际实现中应该从标签库获取
      return {
        weight: 0.7,
        color: '#3B82F6',
        icon: '📁',
        ancestorName: ancestorId
      };
    }

    return null;
  }

  /**
   * 建议父标签
   */
  private suggestParent(tag: ContentTag, request: TagGenerationRequest): string | null {
    // 基于标签类型和类别的启发式规则
    const suggestions = {
      [TagType.CORE]: {
        [TagCategory.TECHNOLOGY]: 'technology',
        [TagCategory.BUSINESS]: 'business',
        [TagCategory.EDUCATION]: 'education',
        [TagCategory.HEALTH]: 'health'
      },
      [TagType.RELATED]: {
        [TagCategory.DOMAIN]: 'technology',
        [TagCategory.SKILL]: 'education',
        [TagCategory.TOOL]: 'technology'
      }
    };

    const typeSuggestions = suggestions[tag.type];
    if (typeSuggestions) {
      return typeSuggestions[tag.category] || null;
    }

    return null;
  }

  /**
   * 清理无效的层级关系
   */
  cleanup(): void {
    const validTagIds = new Set(this.hierarchies.keys());

    // 移除无效的父子关系
    for (const [tagId, hierarchy] of this.hierarchies) {
      hierarchy.children = hierarchy.children.filter(childId => validTagIds.has(childId));

      if (hierarchy.parentId && !validTagIds.has(hierarchy.parentId)) {
        hierarchy.parentId = undefined;
        hierarchy.level = 0;
        hierarchy.path = [];
        this.rootTags.add(tagId);
      }
    }

    // 移除孤立的根节点
    for (const rootId of this.rootTags) {
      const hierarchy = this.hierarchies.get(rootId);
      if (hierarchy && hierarchy.parentId) {
        this.rootTags.delete(rootId);
      }
    }
  }
}

// 辅助类型定义
export interface HierarchicalTree {
  [tagId: string]: TreeNode;
}

export interface TreeNode {
  id: string;
  children: TreeNode[];
}

export interface HierarchyValidationResult {
  isValid: boolean;
  issues: HierarchyIssue[];
  totalNodes: number;
  maxDepth: number;
  totalEdges: number;
}

export interface HierarchyIssue {
  type: 'cycle' | 'max_depth_exceeded' | 'max_children_exceeded' | 'orphan_node';
  tagId: string;
  message: string;
  severity: 'error' | 'warning';
}
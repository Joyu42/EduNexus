import { getClientUserIdentity } from '@/lib/auth/client-user-cache';

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  language?: string;
  children?: FileNode[];
  parentId?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  files: FileNode[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  files: FileNode[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "react-starter",
    name: "React 项目",
    description: "基础 React + TypeScript 项目模板",
    icon: "⚛️",
    files: [
      {
        id: "1",
        name: "src",
        type: "folder",
        children: [
          {
            id: "2",
            name: "App.tsx",
            type: "file",
            language: "typescript",
            content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello React!</h1>
    </div>
  );
}

export default App;`,
          },
          {
            id: "3",
            name: "index.tsx",
            type: "file",
            language: "typescript",
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
          },
        ],
      },
      {
        id: "4",
        name: "package.json",
        type: "file",
        language: "json",
        content: `{
  "name": "react-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
      },
    ],
  },
  {
    id: "python-starter",
    name: "Python 项目",
    description: "基础 Python 项目模板",
    icon: "🐍",
    files: [
      {
        id: "1",
        name: "main.py",
        type: "file",
        language: "python",
        content: `def main():
    print("Hello Python!")

if __name__ == "__main__":
    main()`,
      },
      {
        id: "2",
        name: "utils.py",
        type: "file",
        language: "python",
        content: `def greet(name):
    return f"Hello, {name}!"`,
      },
    ],
  },
  {
    id: "html-starter",
    name: "HTML 项目",
    description: "基础 HTML + CSS + JS 项目",
    icon: "🌐",
    files: [
      {
        id: "1",
        name: "index.html",
        type: "file",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的网页</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello World!</h1>
    <script src="script.js"></script>
</body>
</html>`,
      },
      {
        id: "2",
        name: "style.css",
        type: "file",
        language: "css",
        content: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

h1 {
  text-align: center;
}`,
      },
      {
        id: "3",
        name: "script.js",
        type: "file",
        language: "javascript",
        content: `console.log('Hello from JavaScript!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded!');
});`,
      },
    ],
  },
];

// 获取用户特定的存储键
function getStorageKey(): string {
  const userId = getClientUserIdentity() || 'anonymous';
  return `edunexus_projects_${userId}`;
}

export class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private currentProjectId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.projects = new Map(
          data.projects.map((p: any) => [
            p.id,
            { ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) },
          ])
        );
        this.currentProjectId = data.currentProjectId;
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    const data = {
      projects: Array.from(this.projects.values()),
      currentProjectId: this.currentProjectId,
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  }

  createProject(name: string, description: string, template?: ProjectTemplate): Project {
    const project: Project = {
      id: Date.now().toString(),
      name,
      description,
      files: template ? JSON.parse(JSON.stringify(template.files)) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, project);
    this.currentProjectId = project.id;
    this.saveToStorage();
    return project;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  getCurrentProject(): Project | undefined {
    return this.currentProjectId ? this.projects.get(this.currentProjectId) : undefined;
  }

  setCurrentProject(id: string) {
    if (this.projects.has(id)) {
      this.currentProjectId = id;
      this.saveToStorage();
    }
  }

  updateProject(id: string, updates: Partial<Project>) {
    const project = this.projects.get(id);
    if (project) {
      Object.assign(project, updates, { updatedAt: new Date() });
      this.saveToStorage();
    }
  }

  deleteProject(id: string) {
    this.projects.delete(id);
    if (this.currentProjectId === id) {
      this.currentProjectId = null;
    }
    this.saveToStorage();
  }

  getAllProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  addFile(projectId: string, parentId: string | null, name: string, type: "file" | "folder"): FileNode {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found");

    const newFile: FileNode = {
      id: Date.now().toString(),
      name,
      type,
      content: type === "file" ? "" : undefined,
      children: type === "folder" ? [] : undefined,
      parentId: parentId || undefined,
    };

    if (parentId) {
      const parent = this.findNode(project.files, parentId);
      if (parent && parent.type === "folder") {
        parent.children = parent.children || [];
        parent.children.push(newFile);
      }
    } else {
      project.files.push(newFile);
    }

    project.updatedAt = new Date();
    this.saveToStorage();
    return newFile;
  }

  updateFile(projectId: string, fileId: string, updates: Partial<FileNode>) {
    const project = this.projects.get(projectId);
    if (!project) return;

    const file = this.findNode(project.files, fileId);
    if (file) {
      Object.assign(file, updates);
      project.updatedAt = new Date();
      this.saveToStorage();
    }
  }

  deleteFile(projectId: string, fileId: string) {
    const project = this.projects.get(projectId);
    if (!project) return;

    project.files = this.removeNode(project.files, fileId);
    project.updatedAt = new Date();
    this.saveToStorage();
  }

  private findNode(nodes: FileNode[], id: string): FileNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private removeNode(nodes: FileNode[], id: string): FileNode[] {
    return nodes.filter((node) => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = this.removeNode(node.children, id);
      }
      return true;
    });
  }

  exportProject(projectId: string): string {
    const project = this.projects.get(projectId);
    if (!project) throw new Error("Project not found");
    return JSON.stringify(project, null, 2);
  }

  importProject(data: string): Project {
    const project = JSON.parse(data);
    project.id = Date.now().toString();
    project.createdAt = new Date();
    project.updatedAt = new Date();
    this.projects.set(project.id, project);
    this.saveToStorage();
    return project;
  }
}

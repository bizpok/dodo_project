export type OrgColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed';

export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'cancelled' | 'done';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type FontScale = 'normal' | 'large' | 'xlarge';

export interface Organization {
  id: string;
  name: string;
  description: string;
  color: OrgColor;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  memo: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  attachments?: TaskAttachment[];
  completedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AppData {
  organizations: Organization[];
  projects: Project[];
  tasks: Task[];
}

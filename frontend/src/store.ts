import { create } from 'zustand';
import axios from 'axios';

// Ensure axios always sends the token if available
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// API Base URL - same origin /api in production, localhost in dev unless VITE_API_URL set
export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

// Unified roles: backend uses 'admin', 'maintainer', 'worker'; frontend used 'admin', 'manager', 'staff'.
// Allow all for compatibility and migration.
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'maintainer' | 'worker' | 'staff';
  organization_id: number;
  restaurant_id?: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'assigned' | 'in_progress' | 'waiting' | 'completed' | 'verified' | 'overdue';
  due_date?: string;
  estimated_time?: number;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  created_at: string;
  completed_at?: string;
  verified_at?: string;
}

export interface Comment {
  id: number;
  content: string;
  user_id: number;
  user_name: string;
  created_at: string;
}

export interface Photo {
  id: number;
  filename: string;
  filepath: string;
  uploaded_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_by?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null, token: string | null) => void;
}

interface TaskStore {
  tasks: Task[];
  currentTask: (Task & { checklists: any[]; comments: Comment[]; photos: Photo[] }) | null;
  loading: boolean;
  fetchTasks: (filters?: { status?: string; assigned_to?: number }) => Promise<void>;
  fetchTask: (id: number) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: number, task: Partial<Task>) => Promise<void>;
  completeTask: (id: number) => Promise<void>;
  verifyTask: (id: number, comment?: string) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
}

interface DashboardStore {
  stats: any;
  staffPerformance: any[];
  overdueTasks: Task[];
  fetchStats: () => Promise<void>;
  fetchStaffPerformance: () => Promise<void>;
  fetchOverdueTasks: () => Promise<void>;
}

interface TagStore {
  tags: Tag[];
  loading: boolean;
  fetchTags: (organizationId: number) => Promise<void>;
  createTag: (organizationId: number, name: string, color: string) => Promise<void>;
  updateTag: (tagId: number, name: string, color: string) => Promise<void>;
  deleteTag: (tagId: number) => Promise<void>;
  addTagToTask: (tagId: number, taskId: number) => Promise<void>;
  removeTagFromTask: (tagId: number, taskId: number) => Promise<void>;
}

// Auth Store
export const useAuthStore = create<AuthStore>((set) => {
  // Load from localStorage on init
  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('token');
  const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
  if (savedUser && savedToken) {
    set({ user: JSON.parse(savedUser), token: savedToken, rememberMe: savedRememberMe });
  }

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    rememberMe: savedRememberMe,

    login: async (email: string, password: string, rememberMe = false) => {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const { user, token } = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
      set({ user, token, rememberMe });
    },

    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('rememberMe');
      set({ user: null, token: null, rememberMe: false });
    },

    setUser: (user, token) => {
      if (user && token) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('rememberMe');
      }
      set({ user, token });
    },
  };
});

// Task Store
export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTask: null,
  loading: false,

  fetchTasks: async (filters?) => {
    set({ loading: true });
    try {
      const token = useAuthStore.getState().token;
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());

      const res = await axios.get(`${API_BASE}/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ tasks: res.data });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchTask: async (id: number) => {
    set({ loading: true });
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.get(`${API_BASE}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ currentTask: res.data });
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (task) => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.post(`${API_BASE}/tasks`, task, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ tasks: [...get().tasks, res.data] });
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },

  updateTask: async (id: number, task) => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.put(`${API_BASE}/tasks/${id}`, task, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({
        tasks: get().tasks.map((t) => (t.id === id ? res.data : t)),
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  },

  completeTask: async (id: number) => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.put(`${API_BASE}/tasks/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({
        tasks: get().tasks.map((t) => (t.id === id ? res.data : t)),
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  },

  verifyTask: async (id: number, comment?: string) => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.put(`${API_BASE}/tasks/${id}/verify`, { comment }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({
        tasks: get().tasks.map((t) => (t.id === id ? res.data : t)),
      });
    } catch (error) {
      console.error('Failed to verify task:', error);
      throw error;
    }
  },

  deleteTask: async (id: number) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.delete(`${API_BASE}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({
        tasks: get().tasks.filter((t) => t.id !== id),
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  },
}));

// Dashboard Store
export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: {},
  staffPerformance: [],
  overdueTasks: [],

  fetchStats: async () => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.get(`${API_BASE}/dashboard/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ stats: res.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  fetchStaffPerformance: async () => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.get(`${API_BASE}/dashboard/stats/staff-performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ staffPerformance: res.data });
    } catch (error) {
      console.error('Failed to fetch staff performance:', error);
    }
  },

  fetchOverdueTasks: async () => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.get(`${API_BASE}/dashboard/stats/overdue-tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ overdueTasks: res.data });
    } catch (error) {
      console.error('Failed to fetch overdue tasks:', error);
    }
  },
}));

// Tag Store
export const useTagStore = create<TagStore>((set) => ({
  tags: [],
  loading: false,

  fetchTags: async (organizationId: number) => {
    try {
      set({ loading: true });
      const token = useAuthStore.getState().token;
      const res = await axios.get(`${API_BASE}/tags/restaurant/${organizationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ tags: res.data });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      set({ loading: false });
    }
  },

  createTag: async (organizationId: number, name: string, color: string) => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.post(
        `${API_BASE}/tags`,
        { name, color },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set((state) => ({ tags: [...state.tags, res.data] }));
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  },

  updateTag: async (tagId: number, name: string, color: string) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.put(
        `${API_BASE}/tags/${tagId}`,
        { name, color },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set((state) => ({
        tags: state.tags.map((tag) =>
          tag.id === tagId ? { ...tag, name, color } : tag
        ),
      }));
    } catch (error) {
      console.error('Failed to update tag:', error);
      throw error;
    }
  },

  deleteTag: async (tagId: number) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.delete(`${API_BASE}/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== tagId),
      }));
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  },

  addTagToTask: async (tagId: number, taskId: number) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.post(
        `${API_BASE}/tags/${tagId}/task/${taskId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to add tag to task:', error);
      throw error;
    }
  },

  removeTagFromTask: async (tagId: number, taskId: number) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.delete(`${API_BASE}/tags/${tagId}/task/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Failed to remove tag from task:', error);
      throw error;
    }
  },
}));

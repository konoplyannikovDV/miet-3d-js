const API_BASE_URL = 'http://localhost:3000';

export interface Task {
  id: number;
  subject: string;
  description: string;
  due_date: string;
  status: 'К выполнению' | 'Выполнено';
}

export interface NewTask {
  subject: string;
  description: string;
  due_date: string;
  status?: 'К выполнению' | 'Выполнено';
}

export interface UpdateTask {
  subject?: string;
  description?: string;
  due_date?: string;
  status?: 'К выполнению' | 'Выполнено';
}

export async function getTasks(subject?: string, status?: string): Promise<Task[]> {
  let url = `${API_BASE_URL}/tasks`;
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (status) params.append('status', status);
  
  if (params.toString()) url += `?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  const data = await response.json();
  return data.tasks;
}

export async function createTask(task: NewTask): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  const data = await response.json();
  return data.task;
}

export async function updateTask(id: number, updates: UpdateTask): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  return data.task;
}

export async function deleteTask(id: number): Promise<void> {
  await fetch(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE' });
}
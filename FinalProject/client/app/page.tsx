'use client'; // Этот компонент является клиентским, поэтому используем директиву

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { getTasks, createTask, updateTask, deleteTask, type Task, type NewTask, type UpdateTask } from '../lib/api';

// Интерфейс для задачи, который расширяет Task из api.ts для удобства на клиенте
interface ClientTask extends Task {
  isOverdue: boolean;
}

export default function TaskPage() {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false); // Состояние для открытия/закрытия формы
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Все' | 'К выполнению' | 'Выполнено'>('Все');

  // Состояние для полей новой задачи
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(''); // Будет хранить дату в формате yyyy-MM-dd

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTasks = await getTasks(
        filterSubject || undefined,
        filterStatus === 'Все' ? undefined : filterStatus
      );

      const tasksWithOverdue: ClientTask[] = fetchedTasks.map(task => {
        const dueDate = new Date(task.due_date);
        // Считаем задачу просроченной, если due_date меньше текущей даты И статус не "Выполнено"
        const isOverdue = dueDate < new Date() && task.status !== 'Выполнено';
        return { ...task, isOverdue };
      });
      
      // Сортировка по дате (просроченные могут быть сверху или как-то еще выделены)
      tasksWithOverdue.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      setTasks(tasksWithOverdue);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filterSubject, filterStatus]); // Перезагружаем задачи при изменении фильтров

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!newTaskSubject || !newTaskDueDate) {
      setError('Subject and Due Date are required.');
      return;
    }

    try {
      const taskData: NewTask = {
        subject: newTaskSubject,
        description: newTaskDescription,
        due_date: new Date(newTaskDueDate).toISOString(), // Преобразуем в ISO string для бэкенда
        status: 'К выполнению',
      };
      await createTask(taskData);
      setIsFormOpen(false); // Закрываем форму
      // Очищаем поля формы
      setNewTaskSubject('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      fetchTasks(); // Перезагружаем задачи
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    setError(null);
    try {
      await deleteTask(id);
      fetchTasks(); // Перезагружаем задачи
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
      console.error(err);
    }
  };

  const handleToggleStatus = async (task: ClientTask) => {
    setError(null);
    try {
      const newStatus = task.status === 'К выполнению' ? 'Выполнено' : 'К выполнению';
      await updateTask(task.id, { status: newStatus });
      fetchTasks(); // Перезагружаем задачи
    } catch (err: any) {
      setError(err.message || 'Failed to update task status');
      console.error(err);
    }
  };


  if (loading) return <div className="p-8 text-center">Загрузка задач...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Ошибка: {error}</div>;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Мой Учебный Планировщик</h1>

      {/* Фильтры */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-center">
        <Input
          placeholder="Фильтр по предмету"
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="md:w-auto w-full max-w-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="p-2 border border-gray-300 rounded-md md:w-auto w-full max-w-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="Все">Все статусы</option>
          <option value="К выполнению">К выполнению</option>
          <option value="Выполнено">Выполнено</option>
        </select>
        <Button onClick={() => { setFilterSubject(''); setFilterStatus('Все'); }}>Сбросить фильтры</Button>
      </div>


      {/* Кнопка добавления задачи */}
      <div className="flex justify-center mb-8">
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger>
  <span className="inline-block py-2 px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-lg cursor-pointer">
    Добавить новую задачу
  </span>
</DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Добавить задачу</DialogTitle>
              <DialogDescription>
                Заполните данные для новой учебной задачи.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="subject" className="text-right">
                  Предмет
                </label>
                <Input
                  id="subject"
                  value={newTaskSubject}
                  onChange={(e) => setNewTaskSubject(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="description" className="text-right">
                  Описание
                </label>
                <Input
                  id="description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="due_date" className="text-right">
                  Срок сдачи
                </label>
                <Input
                  id="due_date"
                  type="date" // Используем стандартный HTML date picker
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">Сохранить задачу</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Список задач */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tasks.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">Задач пока нет. Добавьте первую!</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border 
                          ${task.isOverdue ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <h3 className="text-xl font-semibold mb-2">{task.subject}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">{task.description}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Срок: {new Date(task.due_date).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  className={`${
                    task.status === 'Выполнено'
                      ? 'bg-green-500 hover:bg-green-600'
                      : task.isOverdue
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-yellow-500 hover:bg-yellow-600'
                  } text-white`}
                >
                  {task.isOverdue && task.status !== 'Выполнено' ? 'Просрочено' : task.status}
                </Badge>
                {task.isOverdue && task.status !== 'Выполнено' && (
                  <span className="text-red-500 text-xs font-medium">!</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleToggleStatus(task)} variant="outline" size="sm">
                  {task.status === 'К выполнению' ? 'Отметить как Выполнено' : 'Отметить как К выполнению'}
                </Button>
                <Button onClick={() => handleDeleteTask(task.id)} variant="destructive" size="sm">
                  Удалить
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
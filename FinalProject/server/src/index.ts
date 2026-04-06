import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors'; // <-- Добавьте этот импорт
import { Database } from 'bun:sqlite';

const db = new Database('todo.sqlite');
// Создаём таблицу tasks, если её ещё нет
// Используем db.prepare().run() для DDL запросов
db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        description TEXT,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'К выполнению'
    )
`).run();

const app = new Elysia()
    .use(cors())
    .post('/tasks', async ({ body }) => { // Добавляем async для асинхронных операций, если потребуются, пока синхронно
        const { subject, description, due_date, status = 'К выполнению' } = body as {
            subject: string;
            description: string;
            due_date: string; // ISO 8601 string
            status?: string;
        };
        try {
            // Используем .prepare().get() для INSERT с RETURNING
            const insert = db.prepare(
                'INSERT INTO tasks (subject, description, due_date, status) VALUES (?, ?, ?, ?) RETURNING id, subject, description, due_date, status'
            );
            const result = insert.get(subject, description, due_date, status);
            return { success: true, task: result };
        } catch (error: any) {
            console.error('Error inserting task:', error);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    })
    .get('/tasks', async ({ query }) => {
        let queryString = 'SELECT id, subject, description, due_date, status FROM tasks';
        const params: any[] = [];
        const filters: string[] = [];

        if (query.subject) {
            filters.push('subject = $subject');
            params.push(query.subject);
        }
        if (query.status) {
            filters.push('status = $status');
            params.push(query.status);
        }

        if (filters.length > 0) {
            queryString += ' WHERE ' + filters.join(' AND ');
        }

        queryString += ' ORDER BY due_date ASC'; // Сортировка по дате по умолчанию

        try {
            // Используем .prepare().all() для получения всех строк
            const stmt = db.prepare(queryString);
            const tasks = stmt.all(...params); // Для позиционных параметров
            return { success: true, tasks };
        } catch (error: any) {
            console.error('Error fetching tasks:', error);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    })
    .put('/tasks/:id', async ({ params, body }) => {
        const { id } = params;
        const { subject, description, due_date, status } = body as {
            subject?: string;
            description?: string;
            due_date?: string;
            status?: string;
        };

        const updates: string[] = [];
        const updateParams: any[] = [];
        const namedParams: { [key: string]: any } = {};

        if (subject !== undefined) {
            updates.push('subject = $subject');
            namedParams.$subject = subject;
        }
        if (description !== undefined) {
            updates.push('description = $description');
            namedParams.$description = description;
        }
        if (due_date !== undefined) {
            updates.push('due_date = $due_date');
            namedParams.$due_date = due_date;
        }
        if (status !== undefined) {
            updates.push('status = $status');
            namedParams.$status = status;
        }

        if (updates.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'No fields to update' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        try {
            // Используем .prepare().get() для UPDATE с RETURNING
            const stmt = db.prepare(
                `UPDATE tasks SET ${updates.join(', ')} WHERE id = $id RETURNING id, subject, description, due_date, status`
            );
            namedParams.$id = id;
            const result = stmt.get(namedParams); // Для именованных параметров
            if (result) {
                return { success: true, task: result };
            } else {
                return new Response(JSON.stringify({ success: false, error: 'Task not found or no changes made' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } catch (error: any) {
            console.error('Error updating task:', error);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    })
    .delete('/tasks/:id', async ({ params }) => {
        const { id } = params;
        try {
            // Используем .prepare().get() для DELETE с RETURNING
            const stmt = db.prepare('DELETE FROM tasks WHERE id = $id RETURNING id');
            const result = stmt.get({ $id: id });
            if (result) {
                return { success: true, message: `Task with ID ${id} deleted` };
            } else {
                return new Response(JSON.stringify({ success: false, error: 'Task not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } catch (error: any) {
            console.error('Error deleting task:', error);
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    });

app.listen(3000);

console.log(`🦊 Elysia is running at http://${app.server!.hostname}:${app.server!.port}`);
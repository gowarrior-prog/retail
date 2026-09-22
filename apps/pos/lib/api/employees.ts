import { z } from 'zod';
import { apiFetch } from './client';
import { EmployeeSchema, EmployeeCreateSchema } from '../validators';

export type Employee = z.infer<typeof EmployeeSchema>;

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const raw = await apiFetch<any[]>('/employees');
    if (Array.isArray(raw)) {
      return z.array(EmployeeSchema.partial()).parse(raw) as Employee[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function createEmployee(data: any): Promise<Employee> {
  const validated = EmployeeCreateSchema.parse(data);
  const res = await apiFetch<any>('/employees', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
  return EmployeeSchema.parse(res);
}

export async function deleteEmployee(id: string): Promise<any> {
  return await apiFetch<any>(`/employees/${id}`, {
    method: 'DELETE',
  });
}

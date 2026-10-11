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

export async function payEmployeeSalary(employee_id: string, amount: number, note?: string): Promise<any> {
  return await apiFetch<any>(`/employees/${employee_id}/salary`, {
    method: 'POST',
    body: JSON.stringify({ amount, note }),
  });
}

export async function updateEmployeeLeave(employee_id: string, leave_status: string, leave_reason?: string): Promise<any> {
  return await apiFetch<any>(`/employees/${employee_id}/leave`, {
    method: 'POST',
    body: JSON.stringify({ leave_status, leave_reason }),
  });
}

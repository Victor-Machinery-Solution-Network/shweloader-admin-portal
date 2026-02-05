/**
 * Example Server Actions
 * Server Actions are the preferred way to handle mutations in Next.js
 * They run on the server and can directly access your database
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Example: Create a new user
 * This would typically interact with your database
 */
export async function createUser(formData: FormData) {
  // Extract form data
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // Validate
  if (!name || !email) {
    return { error: 'Name and email are required' };
  }

  try {
    // TODO: Replace with actual database call
    // const user = await db.user.create({ name, email });

    // Revalidate the users page to show new data
    revalidatePath('/users');

    return { success: true, message: 'User created successfully' };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { error: 'Failed to create user' };
  }
}

/**
 * Example: Update a user
 */
export async function updateUser(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  if (!name || !email) {
    return { error: 'Name and email are required' };
  }

  try {
    // TODO: Replace with actual database call
    // const user = await db.user.update({ where: { id }, data: { name, email } });

    revalidatePath('/users');
    revalidatePath(`/users/${id}`);

    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    console.error('Failed to update user:', error);
    return { error: 'Failed to update user' };
  }
}

/**
 * Example: Delete a user
 */
export async function deleteUser(id: string) {
  try {
    // TODO: Replace with actual database call
    // await db.user.delete({ where: { id } });

    revalidatePath('/users');

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { error: 'Failed to delete user' };
  }
}

/**
 * Example: Form action with redirect
 */
export async function createUserAndRedirect(formData: FormData) {
  const result = await createUser(formData);

  if (result.error) {
    return result;
  }

  // Redirect to users list after successful creation
  redirect('/users');
}

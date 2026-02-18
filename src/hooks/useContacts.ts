import { useCallback } from 'react';
import { getContactRepository } from '../db/repositories';
import type { StoredContact } from '../db/interfaces';

export function useContacts() {
  const repo = getContactRepository();

  const getByCompany = useCallback(
    async (companyId: string): Promise<StoredContact[]> => {
      try {
        return await repo.getByCompany(companyId);
      } catch (error) {
        console.error('Failed to get contacts:', error);
        return [];
      }
    },
    [repo]
  );

  const getPrimary = useCallback(
    async (companyId: string): Promise<StoredContact | null> => {
      try {
        return await repo.getPrimary(companyId);
      } catch (error) {
        console.error('Failed to get primary contact:', error);
        return null;
      }
    },
    [repo]
  );

  const getById = useCallback(
    async (id: string): Promise<StoredContact | null> => {
      try {
        return await repo.getById(id);
      } catch (error) {
        console.error('Failed to get contact:', error);
        return null;
      }
    },
    [repo]
  );

  const saveContact = useCallback(
    async (
      contact: Omit<StoredContact, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> => {
      return await repo.save(contact);
    },
    [repo]
  );

  const updateContact = useCallback(
    async (id: string, updates: Partial<StoredContact>): Promise<void> => {
      await repo.update(id, updates);
    },
    [repo]
  );

  const deleteContact = useCallback(
    async (id: string): Promise<void> => {
      await repo.delete(id);
    },
    [repo]
  );

  return {
    getByCompany,
    getPrimary,
    getById,
    saveContact,
    updateContact,
    deleteContact,
  };
}

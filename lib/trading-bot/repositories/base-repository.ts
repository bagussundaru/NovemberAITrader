import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute a database operation with error handling
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`Database error in ${context}:`, error);
      throw new Error(`Database operation failed: ${context}`);
    }
  }
}
import { prisma } from '../connection';

// Base model utilities for common operations
export class BaseModel {
  // Generic find with error handling
  static async findById<T>(
    model: any,
    id: string,
    include?: any,
  ): Promise<T | null> {
    try {
      return await model.findUnique({
        where: { id },
        include,
      });
    } catch (error) {
      console.error(`Failed to find ${model.name} by id:`, error);
      return null;
    }
  }

  // Generic findMany with filtering
  static async findMany<T>(
    model: any,
    options: {
      where?: any;
      include?: any;
      orderBy?: any;
      take?: number;
      skip?: number;
    } = {},
  ): Promise<T[]> {
    try {
      return await model.findMany(options);
    } catch (error) {
      console.error(`Failed to find ${model.name}:`, error);
      return [];
    }
  }

  // Generic create with validation
  static async create<T>(model: any, data: any): Promise<T | null> {
    try {
      return await model.create({
        data,
      });
    } catch (error) {
      console.error(`Failed to create ${model.name}:`, error);
      return null;
    }
  }

  // Generic update
  static async update<T>(
    model: any,
    id: string,
    data: any,
    include?: any,
  ): Promise<T | null> {
    try {
      return await model.update({
        where: { id },
        data,
        include,
      });
    } catch (error) {
      console.error(`Failed to update ${model.name}:`, error);
      return null;
    }
  }

  // Generic delete
  static async delete(model: any, id: string): Promise<boolean> {
    try {
      await model.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error(`Failed to delete ${model.name}:`, error);
      return false;
    }
  }

  // Check if record exists
  static async exists(model: any, where: any): Promise<boolean> {
    try {
      const count = await model.count({ where });
      return count > 0;
    } catch (error) {
      console.error(`Failed to check ${model.name} existence:`, error);
      return false;
    }
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>,
): Promise<T | null> {
  try {
    return await prisma.$transaction(callback);
  } catch (error) {
    console.error('Transaction failed:', error);
    return null;
  }
}

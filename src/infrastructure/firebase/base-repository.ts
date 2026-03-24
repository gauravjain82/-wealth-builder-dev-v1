import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  Query,
  CollectionReference,
} from 'firebase/firestore';
import { firebaseDb } from './config';
import { firestoreToDomain, domainToFirestore } from './converters';

/**
 * Base Repository for Firestore operations
 * Abstracts Firebase-specific code from business logic
 */
export class BaseRepository<T extends { id: string }> {
  protected collectionName: string;
  protected collectionRef: CollectionReference<DocumentData>;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.collectionRef = collection(firebaseDb, collectionName);
  }

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = { id: docSnap.id, ...docSnap.data() };
      return firestoreToDomain<T>(data);
    } catch (error) {
      console.error(`Error getting document from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents
   */
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = constraints.length > 0 ? query(this.collectionRef, ...constraints) : this.collectionRef;
      const querySnapshot = await getDocs(q as Query<DocumentData>);

      return querySnapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() };
        return firestoreToDomain<T>(data);
      });
    } catch (error) {
      console.error(`Error getting documents from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create new document
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const docRef = doc(this.collectionRef);
      const now = new Date();

      const entityData = {
        ...data,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      };

      const firestoreData = domainToFirestore(entityData as Record<string, unknown>);
      await setDoc(docRef, firestoreData);

      return entityData as unknown as T;
    } catch (error) {
      console.error(`Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update existing document
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, id);
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      const firestoreData = domainToFirestore(updateData as Record<string, unknown>);
      await updateDoc(docRef, firestoreData);
    } catch (error) {
      console.error(`Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Query helper methods
   */
  protected createWhereConstraint(field: string, operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains', value: unknown) {
    return where(field, operator, value);
  }

  protected createOrderByConstraint(field: string, direction: 'asc' | 'desc' = 'asc') {
    return orderBy(field, direction);
  }

  protected createLimitConstraint(limitCount: number) {
    return limit(limitCount);
  }
}

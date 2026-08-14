# Repository Developer Guide

## 1. Introduction
This guide explains how to define and interact with the data layer using the Repository pattern in Nabdah Plus.

## 2. Creating a New Feature Repository
When building a new module (e.g., Consultations):

1. **Define your Entity:**
```typescript
export interface IConsultation extends IBaseEntity {
  patient_id: string;
  doctor_id: string;
  status: string;
  scheduled_at: number;
}
```

2. **Register the Repository (Usually during App Initialization):**
```typescript
import { RepositoryCoordinator, DatabaseManager } from '@/data/repositories/RepositoryCoordinator';

const dbManager = DatabaseManager.getInstance();
RepositoryCoordinator.registerFeatureRepository<IConsultation>(
  'consultations', // Table name
  '/api/v1/consultations', // API Endpoint
  dbManager
);
```

3. **Access the Repository in Thunks/Sagas:**
```typescript
import { RepositoryRegistry } from '@/data/repositories/RepositoryRegistry';
import { QuerySpecification } from '@/data/repositories/core/QuerySpecification';

const repo = RepositoryRegistry.get<IConsultation>('consultations');

// Fetching
const spec = QuerySpecification.create().where('status', 'PENDING').orderBy('scheduled_at', 'DESC');
const pendingConsultations = await repo.match(spec);

// Creating (Offline First)
const newConsult = await repo.create({
  patient_id: '123',
  doctor_id: '456',
  status: 'PENDING',
  scheduled_at: Date.now() + 86400000
});
// (Behind the scenes: Saved to SQLite, Event fired, SyncManager queues it for backend sync)
```

## 3. Transaction Safety (Unit of Work)
If you need to update two tables atomically:
```typescript
const uow = new UnitOfWork(dbManager);

await uow.run(async (context) => {
  await consultationRepo.update(id, { status: 'COMPLETED' }, context);
  await paymentRepo.create({ amount: 100, consultation_id: id }, context);
});
```

## 4. Query Specification
Always use `QuerySpecification` for filtering. **Do not write raw SQL.**
```typescript
const spec = QuerySpecification.create()
  .where('doctor_id', 'doc_1')
  .limit(10)
  .offset(20)
  .withDeleted(); // Include soft-deleted rows
```

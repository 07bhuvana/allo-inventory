import { z } from 'zod';

export const CreateReservationSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'RELEASED']);
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>;

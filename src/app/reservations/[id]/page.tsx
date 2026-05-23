'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Reservation {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  quantity: number;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

function CountdownBar({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const initialized = useRef(false);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
    setSecondsLeft(remaining);

    if (!initialized.current) {
      // Estimate total from 10 minutes (600s), cap at actual remaining
      setTotalSeconds(Math.max(remaining, 600));
      initialized.current = true;
    }

    const interval = setInterval(() => {
      const r = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(r);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const pct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 60;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Reservation expires in
        </span>
        <span
          className={`font-mono text-lg font-semibold tabular-nums ${
            isUrgent ? 'text-red-600 animate-pulse-soft' : 'text-stone-900'
          }`}
        >
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-400' : pct > 50 ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
  const config = {
    PENDING: { label: 'Pending payment', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    CONFIRMED: { label: 'Order confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    RELEASED: { label: 'Reservation released', color: 'bg-stone-50 text-stone-600 border-stone-200' },
  };
  const { label, color } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${color}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${
          status === 'PENDING' ? 'bg-amber-400 animate-pulse' : status === 'CONFIRMED' ? 'bg-emerald-400' : 'bg-stone-400'
        }`}
      />
      {label}
    </span>
  );
}

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Reservation not found');
        return;
      }
      const data = await res.json();
      setReservation(data.reservation);
    } catch {
      setError('Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
    // Poll every 5s to keep status fresh
    const interval = setInterval(fetchReservation, 5000);
    return () => clearInterval(interval);
  }, [fetchReservation]);

  async function handleConfirm() {
    setActionLoading('confirm');
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' });
      const data = await res.json();

      if (res.status === 410) {
        setError('⏱ Your reservation expired before payment could be confirmed. The units have been returned to stock.');
        await fetchReservation();
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Failed to confirm reservation');
        return;
      }

      setReservation(data.reservation);
      setMessage(data.message ?? 'Order confirmed!');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    setActionLoading('cancel');
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel reservation');
        return;
      }

      setReservation(data.reservation);
      setMessage(data.message ?? 'Reservation cancelled.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-500">Loading reservation...</p>
        </div>
      </div>
    );
  }

  if (!reservation && error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6v4.5M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-stone-700 font-medium mb-1">Reservation not found</p>
          <p className="text-sm text-stone-500 mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm font-medium text-stone-900 underline underline-offset-2">
            Back to products
          </button>
        </div>
      </div>
    );
  }

  if (!reservation) return null;

  const isExpired = reservation.status === 'PENDING' && new Date(reservation.expiresAt) < new Date();
  const isPending = reservation.status === 'PENDING' && !isExpired;
  const isConfirmed = reservation.status === 'CONFIRMED';
  const isReleased = reservation.status === 'RELEASED' || isExpired;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M8 2L3 7l5 5M3 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to products
      </button>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Product image strip */}
        {reservation.product.imageUrl && (
          <div className="h-40 bg-stone-100 overflow-hidden">
            <img
              src={reservation.product.imageUrl}
              alt={reservation.product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-3">
              <p className="text-xs font-mono text-stone-400 mb-1">{reservation.product.sku}</p>
              <h1
                className="font-display text-2xl font-semibold text-stone-900 leading-tight"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                {reservation.product.name}
              </h1>
            </div>
            <StatusBadge status={isExpired ? 'RELEASED' : reservation.status} />
          </div>

          {/* Countdown — only for pending */}
          {isPending && <CountdownBar expiresAt={reservation.expiresAt} />}

          {/* Expired notice */}
          {isExpired && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              ⏱ This reservation has expired. Units have been returned to stock.
            </div>
          )}

          {/* Confirmed notice */}
          {isConfirmed && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm font-semibold text-emerald-800">Order confirmed!</span>
              </div>
              <p className="text-xs text-emerald-700">
                Confirmed at {new Date(reservation.confirmedAt!).toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Released notice */}
          {reservation.status === 'RELEASED' && !isExpired && (
            <div className="mb-5 p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600">
              Reservation was cancelled. Units returned to stock.
            </div>
          )}

          {/* Order summary */}
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Warehouse</span>
              <span className="text-stone-900 font-medium text-right">
                {reservation.warehouse.name}
                <span className="block text-xs font-normal text-stone-400">
                  {reservation.warehouse.location}
                </span>
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Quantity</span>
              <span className="font-mono text-stone-900">{reservation.quantity} unit{reservation.quantity !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Unit price</span>
              <span className="font-mono text-stone-900">₹{reservation.product.price.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-stone-100">
              <span className="font-semibold text-stone-900">Total</span>
              <span
                className="font-display text-xl font-semibold text-stone-900"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                ₹{(reservation.product.price * reservation.quantity).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Reservation meta */}
          <div className="text-xs text-stone-400 font-mono mb-5 space-y-0.5">
            <div>ID: {reservation.id}</div>
            <div>Created: {new Date(reservation.createdAt).toLocaleString()}</div>
            {isPending && <div>Expires: {new Date(reservation.expiresAt).toLocaleString()}</div>}
          </div>

          {/* Error / message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              {message}
            </div>
          )}

          {/* Actions */}
          {isPending && (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                disabled={actionLoading !== null}
                className="w-full py-3 px-4 bg-stone-900 text-white font-medium text-sm rounded-xl hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {actionLoading === 'confirm' ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Confirm purchase
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading !== null}
                className="w-full py-2.5 px-4 bg-white text-stone-600 font-medium text-sm rounded-xl border border-stone-200 hover:border-stone-400 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel reservation'}
              </button>
            </div>
          )}

          {(isReleased || isConfirmed) && (
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-stone-900 text-white font-medium text-sm rounded-xl hover:bg-stone-700 transition-all"
            >
              Back to products
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

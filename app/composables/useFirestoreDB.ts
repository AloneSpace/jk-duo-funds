import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
  type Firestore,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useFirebase } from "~/composables/firebase/useFirebase";
import type { DuoTransaction } from "~/types/duo-funds";

// Module-level singleton — reuses the same Firestore instance on every call
let _db: Firestore | null = null;
const db = (): Firestore => {
  if (!_db) _db = getFirestore(useFirebase());
  return _db;
};

/**
 * Waits for Firebase Auth to resolve its initial state from IndexedDB.
 * This closes the race between Pinia's persisted user and Firebase's async
 * session restore — preventing "Missing or insufficient permissions" errors
 * when the user writes to Firestore before onAuthStateChanged has fired.
 */
const authReady = (): Promise<void> => getAuth(useFirebase()).authStateReady();

export const useFirestoreDB = () => {
  const fetchUserPairId = async (uid: string): Promise<string | null> => {
    const snap = await getDoc(doc(db(), "users", uid));
    if (!snap.exists()) return null;
    return (snap.data().pairId as string) ?? null;
  };

  const fetchPair = async (
    pairId: string,
  ): Promise<{
    name: string;
    memberIds: string[];
    memberNames: Record<string, string>;
  } | null> => {
    const snap = await getDoc(doc(db(), "pairs", pairId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      name: (data.name as string) ?? "Our Pair",
      memberIds: (data.memberIds as string[]) ?? [],
      memberNames: (data.memberNames as Record<string, string>) ?? {},
    };
  };

  const subscribeToTransactions = (
    pairId: string,
    callback: (transactions: DuoTransaction[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe => {
    const q = query(
      collection(db(), "pairs", pairId, "transactions"),
      orderBy("transactionDate", "desc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const txs: DuoTransaction[] = snapshot.docs.map((snap) => {
          const d = snap.data();
          return {
            id: snap.id,
            uploaderId: (d.uploaderId as string) ?? "",
            uploaderName: (d.uploaderName as string) ?? "",
            amount: (d.amount as number) ?? 0,
            transactionDate: (d.transactionDate as string) ?? "",
            transactionTime: (d.transactionTime as string) ?? "00:00",
            bankName: (d.bankName as string) ?? "",
            slipImageUrl: (d.slipImageUrl as string) ?? "/slip-placeholder.svg",
            aiRawResponse: (d.aiRawResponse as Record<string, unknown>) ?? {},
            status:
              (d.status as "pending" | "confirmed" | "edited") ?? "pending",
            note: (d.note as string | null) ?? null,
            createdAt: (d.createdAt as string) ?? new Date().toISOString(),
            updatedAt: (d.updatedAt as string) ?? new Date().toISOString(),
          } satisfies DuoTransaction;
        });
        callback(txs);
      },
      (err) => {
        onError?.(err);
      },
    );
  };

  const persistTransaction = async (
    pairId: string,
    tx: DuoTransaction,
  ): Promise<void> => {
    await authReady();
    const { id, ...rest } = tx;
    await setDoc(doc(db(), "pairs", pairId, "transactions", id), rest);
  };

  const deleteTransaction = async (
    pairId: string,
    transactionId: string,
  ): Promise<void> => {
    await authReady();
    await deleteDoc(doc(db(), "pairs", pairId, "transactions", transactionId));
  };

  return {
    fetchUserPairId,
    fetchPair,
    subscribeToTransactions,
    persistTransaction,
    deleteTransaction,
  };
};

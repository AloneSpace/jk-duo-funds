import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Unsubscribe,
} from "firebase/auth";
import { ref } from "vue";
import { useFirebase } from "~/composables/firebase/useFirebase";
import { useAuthStore } from "~/stores/auth";

export const useFirebaseAuth = () => {
  const authStore = useAuthStore();
  const pending = ref(false);
  const error = ref<string | null>(null);

  const auth = getAuth(useFirebase());

  /**
   * Call once in app.vue (onMounted) to replace the firebase.client.ts plugin.
   * Returns an unsubscribe function to clean up the listener.
   */
  const watchAuthState = (): Unsubscribe => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { fetchUserPairId, fetchPair } = useFirestoreDB();

        const pairId = await fetchUserPairId(user.uid);

        authStore.setFirebaseUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          pairId,
        });

        if (pairId) {
          const pairData = await fetchPair(pairId);
          const transactionStore = useTransactionStore();
          transactionStore.loadFromFirestore(pairId, pairData);
        }
      } else if (authStore.user?.provider === "firebase") {
        const transactionStore = useTransactionStore();
        transactionStore.stopFirestoreListener();
        authStore.signOut();
      }
    });
  };

  const signInWithEmail = async (payload: {
    email: string;
    password: string;
  }) => {
    pending.value = true;
    error.value = null;

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        payload.email,
        payload.password,
      );

      authStore.setFirebaseUser({
        uid: credential.user.uid,
        displayName: credential.user.displayName,
        email: credential.user.email,
        pairId: authStore.pairId || null,
      });

      return { provider: "firebase" as const };
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "Unable to sign in.";
      error.value = message;
      throw error_;
    } finally {
      pending.value = false;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    authStore.signOut();
  };

  return { pending, error, watchAuthState, signInWithEmail, signOut };
};
